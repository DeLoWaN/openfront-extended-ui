/**
 * Turns the terrain grey while the alliance view mode is up.
 *
 * The game bakes its terrain into a texture from five base colours held in the
 * renderer's live settings. The mode writes darker, nearly colourless versions
 * of them and asks for a new bake, so land and sea turn grey. The web then
 * stands out even when the subject is allied to everyone and nobody else greys.
 *
 * The game writes the same settings itself when the player changes a graphics
 * option, and bakes again. So the mode only ever puts back colours it can still
 * see it wrote, and never undoes a change the game made in the meantime.
 *
 * Read from `rebuildTerrain` and `getSettings` in `MapRenderer.ts`, and from
 * `encodeTerrainTile` in `ColorUtils.ts`, at OpenFrontIO commit 332e5410e.
 */

import type { MapRenderer, TerrainColours } from "../../game/types";

const TERRAIN_KEYS = [
  "oceanColor",
  "sandColor",
  "plainsColor",
  "highlandColor",
  "mountainColor",
] as const;

/**
 * How the grey is made from each base colour. Tuned on branch
 * `prototype/alliance-view-ally-marking`.
 *
 * The colour keeps 15% of itself and moves to a grey at 42% of its own
 * luminance. The blue channel sits 8% higher, so the terrain stays a cold grey
 * that a greyed player's territory never matches.
 */
const OWN_COLOUR_SHARE = 0.15;
const GREY_BRIGHTNESS = 0.42;
const BLUE_LIFT = 1.08;

/** Puts the terrain grey and puts it back. */
export interface TerrainShade {
  /**
   * Makes the terrain grey on this renderer, or keeps it grey.
   *
   * Cheap when nothing changed, so it can run on every frame. It bakes again
   * only on the first call, on a new renderer, and after the game wrote its own
   * colours over the grey.
   */
  dim(view: MapRenderer): void;
  /**
   * Puts the colours back that the last `dim` found.
   *
   * Does nothing when nothing is grey, or when the game already replaced the
   * grey with colours of its own.
   */
  restore(): void;
}

export function createTerrainShade(): TerrainShade {
  let dimmedView: MapRenderer | null = null;
  let original: TerrainColours | null = null;
  let written: TerrainColours | null = null;

  return {
    dim(view) {
      const terrain = view.getSettings().terrain;
      // A lost WebGL context leaves the settings empty. The next frame retries.
      if (!terrain) return;
      if (dimmedView === view && written && sameColours(terrain, written)) {
        return;
      }

      // The colours there now are the game's own, whether this is the first
      // call or the game just wrote over the grey.
      original = copyColours(terrain);
      written = greyTerrain(original);
      Object.assign(terrain, written);
      dimmedView = view;
      // Each bake walks every tile of the map, which is why an unchanged
      // terrain returns early above.
      view.rebuildTerrain();
    },

    restore() {
      if (!dimmedView || !original || !written) return;
      const terrain = dimmedView.getSettings().terrain;
      if (terrain && sameColours(terrain, written)) {
        Object.assign(terrain, original);
        dimmedView.rebuildTerrain();
      }
      dimmedView = null;
      original = null;
      written = null;
    },
  };
}

/**
 * The grey version of every base colour.
 *
 * A value that is not `#rrggbb` is kept as it is, so a format the game adopts
 * later leaves that terrain in colour rather than breaking the bake.
 */
export function greyTerrain(colours: TerrainColours): TerrainColours {
  const grey = copyColours(colours);
  for (const key of TERRAIN_KEYS) {
    const rgb = parseHex(colours[key]);
    if (!rgb) continue;
    const level =
      (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) * GREY_BRIGHTNESS;
    const target = [level, level, Math.min(255, level * BLUE_LIFT)];
    grey[key] = toHex(
      rgb.map(
        (channel, i) =>
          channel * OWN_COLOUR_SHARE + target[i]! * (1 - OWN_COLOUR_SHARE),
      ),
    );
  }
  return grey;
}

function copyColours(colours: TerrainColours): TerrainColours {
  return {
    oceanColor: colours.oceanColor,
    sandColor: colours.sandColor,
    plainsColor: colours.plainsColor,
    highlandColor: colours.highlandColor,
    mountainColor: colours.mountainColor,
  };
}

function sameColours(a: TerrainColours, b: TerrainColours): boolean {
  return TERRAIN_KEYS.every((key) => a[key] === b[key]);
}

function parseHex(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return null;
  return [
    parseInt(match[1]!, 16),
    parseInt(match[2]!, 16),
    parseInt(match[3]!, 16),
  ];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.max(0, Math.min(255, channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
