import { describe, expect, it } from "vitest";
import type { TerrainColours } from "../../game/types";
import { DEFAULT_TERRAIN, FakeMapRenderer } from "../../test/fakes";
import { createTerrainShade, greyTerrain } from "./terrain";

const KEYS = Object.keys(DEFAULT_TERRAIN) as (keyof TerrainColours)[];

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

const luma = ([r, g, b]: number[]) => 0.299 * r! + 0.587 * g! + 0.114 * b!;
const spread = (channels: number[]) =>
  Math.max(...channels) - Math.min(...channels);

describe("the grey terrain colours", () => {
  it("darkens every kind of terrain", () => {
    const grey = greyTerrain(DEFAULT_TERRAIN);

    for (const key of KEYS) {
      const before = luma(rgb(DEFAULT_TERRAIN[key]));
      const after = luma(rgb(grey[key]));
      expect(after, `${key}: ${DEFAULT_TERRAIN[key]} -> ${grey[key]}`).toBeLessThan(before * 0.55);
    }
  });

  /** Plains are green and the sea is blue. Both have to read as grey. */
  it("drains most of the colour", () => {
    const grey = greyTerrain(DEFAULT_TERRAIN);

    for (const key of KEYS) {
      const before = spread(rgb(DEFAULT_TERRAIN[key]));
      const after = spread(rgb(grey[key]));
      expect(after, `${key}: ${DEFAULT_TERRAIN[key]} -> ${grey[key]}`).toBeLessThanOrEqual(
        Math.max(before * 0.2, 6),
      );
    }
  });

  /** The relief has to survive, or the map loses its mountains. */
  it("keeps light terrain lighter than dark terrain", () => {
    const grey = greyTerrain(DEFAULT_TERRAIN);

    expect(luma(rgb(grey.mountainColor))).toBeGreaterThan(luma(rgb(grey.plainsColor)));
    expect(luma(rgb(grey.plainsColor))).toBeGreaterThan(luma(rgb(grey.oceanColor)));
  });

  it("writes every colour in the game's own #rrggbb form", () => {
    const grey = greyTerrain(DEFAULT_TERRAIN);

    for (const key of KEYS) expect(grey[key]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("leaves a colour it cannot read as it is", () => {
    const grey = greyTerrain({ ...DEFAULT_TERRAIN, oceanColor: "rgb(1, 2, 3)" });

    expect(grey.oceanColor).toBe("rgb(1, 2, 3)");
    expect(grey.plainsColor).not.toBe(DEFAULT_TERRAIN.plainsColor);
  });

  it("does not change the colours it was handed", () => {
    const colours = { ...DEFAULT_TERRAIN };

    greyTerrain(colours);

    expect(colours).toEqual(DEFAULT_TERRAIN);
  });
});

describe("greying the terrain on the renderer", () => {
  it("writes the grey into the live settings and bakes once", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();

    shade.dim(view);

    expect(view.settings.terrain).toEqual(greyTerrain(DEFAULT_TERRAIN));
    expect(view.bakes).toEqual([greyTerrain(DEFAULT_TERRAIN)]);
  });

  /** A bake walks every tile of the map, and `dim` runs on every frame. */
  it("bakes nothing more while the terrain is already grey", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();

    for (let frame = 0; frame < 10; frame++) shade.dim(view);

    expect(view.bakes).toHaveLength(1);
  });

  it("puts the game's own colours back and bakes them", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();
    shade.dim(view);

    shade.restore();

    expect(view.settings.terrain).toEqual(DEFAULT_TERRAIN);
    expect(view.bakes.at(-1)).toEqual(DEFAULT_TERRAIN);
  });

  it("does nothing on a restore with nothing grey", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();
    shade.dim(view);
    shade.restore();

    shade.restore();

    expect(view.bakes).toHaveLength(2);
  });

  /**
   * The player changed a graphics option while the key was down, and the game
   * wrote its own colours over the grey. Those are the colours to keep.
   */
  it("greys again over colours the game wrote while the key was down", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();
    shade.dim(view);
    const chosen = { ...DEFAULT_TERRAIN, oceanColor: "#102030" };
    Object.assign(view.settings.terrain!, chosen);

    shade.dim(view);
    shade.restore();

    expect(view.bakes[1]).toEqual(greyTerrain(chosen));
    expect(view.settings.terrain).toEqual(chosen);
  });

  it("leaves alone colours the game wrote over the grey before the restore", () => {
    const view = new FakeMapRenderer();
    const shade = createTerrainShade();
    shade.dim(view);
    const chosen = { ...DEFAULT_TERRAIN, oceanColor: "#102030" };
    Object.assign(view.settings.terrain!, chosen);

    shade.restore();

    expect(view.settings.terrain).toEqual(chosen);
    expect(view.bakes).toHaveLength(1);
  });

  /** A lost WebGL context hands back empty settings until it is restored. */
  it("waits while the renderer has no settings", () => {
    const view = new FakeMapRenderer();
    const terrain = view.settings.terrain!;
    delete view.settings.terrain;
    const shade = createTerrainShade();

    shade.dim(view);
    expect(view.bakes).toHaveLength(0);

    view.settings.terrain = terrain;
    shade.dim(view);
    expect(view.bakes).toHaveLength(1);
  });

  /** A new match brings a new renderer, with its own colours to keep. */
  it("greys a new renderer and puts its colours back, not the old one's", () => {
    const first = new FakeMapRenderer();
    const second = new FakeMapRenderer();
    const chosen = { ...DEFAULT_TERRAIN, sandColor: "#aabbcc" };
    Object.assign(second.settings.terrain!, chosen);
    const shade = createTerrainShade();
    shade.dim(first);

    shade.dim(second);
    shade.restore();

    expect(second.settings.terrain).toEqual(chosen);
  });

  it("keeps every other setting the renderer holds", () => {
    const view = new FakeMapRenderer();
    const settings = view.settings as Record<string, unknown>;
    settings.mapOverlay = { territoryAlpha: 0.588 };
    const shade = createTerrainShade();

    shade.dim(view);
    shade.restore();

    expect(settings.mapOverlay).toEqual({ territoryAlpha: 0.588 });
  });
});
