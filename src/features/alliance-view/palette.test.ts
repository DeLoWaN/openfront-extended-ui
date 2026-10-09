import { describe, expect, it } from "vitest";
import type { Colour } from "../../game/types";
import { FakePlayerView, fakeColour } from "../../test/fakes";
import {
  BORDER_ALPHA,
  FILL_ALPHA,
  GREY,
  PALETTE_SIZE,
  createPalette,
  greyOf,
  paintAlliance,
  paintReal,
  readSlot,
} from "./palette";

/**
 * The table holds 32-bit floats, so a value read back is the nearest one of
 * those rather than the number that was written.
 */
const f32 = (...values: number[]): number[] => values.map(Math.fround);

const RED = fakeColour(255, 0, 0);
const DARK_RED = fakeColour(128, 0, 0);

function player(smallID: number): FakePlayerView {
  return new FakePlayerView(smallID, `player-${smallID}`, RED, DARK_RED);
}

describe("the palette the renderer is handed", () => {
  it("is one float per channel, two rows of the game's own width", () => {
    expect(createPalette()).toHaveLength(PALETTE_SIZE * 2 * 4);
  });

  it("puts a player's own colours back, channel for channel", () => {
    const palette = createPalette();

    paintReal(palette, [player(7)]);

    expect(readSlot(palette, 7)).toEqual({
      fill: f32(1, 0, 0, FILL_ALPHA),
      border: f32(128 / 255, 0, 0, BORDER_ALPHA),
    });
  });

  /**
   * The fill row and the border row are the same width apart. A slot written
   * into the wrong row draws one player's fill as another player's border.
   */
  it("keeps the border a whole row past the fill", () => {
    const palette = createPalette();

    paintReal(palette, [player(1)]);

    expect(palette[1 * 4]).toBe(1);
    expect(palette[PALETTE_SIZE * 4 + 1 * 4]).toBe(Math.fround(128 / 255));
  });

  it("leaves every slot no player claims at nothing", () => {
    const palette = createPalette();

    paintReal(palette, [player(3)]);

    expect(readSlot(palette, 4).fill).toEqual([0, 0, 0, 0]);
  });

  /**
   * The array is reused between calls, so a slot written for one subject has
   * to be cleared before the next. Otherwise a player who was coloured stays
   * coloured after the cursor has moved on.
   */
  it("clears what an earlier call wrote", () => {
    const palette = createPalette();
    paintAlliance(palette, [player(1), player(2)], new Set([1]));

    paintReal(palette, [player(1)]);

    expect(readSlot(palette, 2).fill).toEqual([0, 0, 0, 0]);
  });
});

/** The slot `paintAlliance` should write for a greyed player of this colour. */
function greySlot(colour: Colour): { fill: number[]; border: number[] } {
  const grey = greyOf(colour);
  return {
    fill: f32(...grey.fill, FILL_ALPHA),
    border: f32(...grey.border, BORDER_ALPHA),
  };
}

describe("the palette that greys the map", () => {
  it("greys every player the match knows", () => {
    const palette = createPalette();

    paintAlliance(palette, [player(1), player(2)], new Set());

    expect(readSlot(palette, 1)).toEqual(greySlot(RED));
    expect(readSlot(palette, 2)).toEqual(greySlot(RED));
  });

  it("draws a grey border lighter than the grey it surrounds", () => {
    const palette = createPalette();

    paintAlliance(palette, [player(1)], new Set());

    const { border } = readSlot(palette, 1);
    expect(border[0]).toBeGreaterThan(GREY);
    expect(border[3]).toBe(BORDER_ALPHA);
  });

  /**
   * The subject and their alliance partners keep the colours that name them.
   * See docs/adr/0008.
   */
  it("leaves the coloured players in their own colours", () => {
    const palette = createPalette();

    paintAlliance(palette, [player(1), player(2)], new Set([2]));

    expect(readSlot(palette, 1)).toEqual(greySlot(RED));
    expect(readSlot(palette, 2)).toEqual({
      fill: f32(1, 0, 0, FILL_ALPHA),
      border: f32(128 / 255, 0, 0, BORDER_ALPHA),
    });
  });

  it("ignores a coloured id no player in the match owns", () => {
    const palette = createPalette();

    paintAlliance(palette, [player(1)], new Set([9]));

    expect(readSlot(palette, 9).fill).toEqual([0, 0, 0, 0]);
  });
});

describe("the grey a player left out of the web draws in", () => {
  const BLUE = fakeColour(59, 130, 246);
  const ORANGE = fakeColour(249, 115, 22);
  const PALE = fakeColour(233, 213, 255);
  const WHITE = fakeColour(255, 255, 255);
  const BLACK = fakeColour(0, 0, 0);

  const spread = (rgb: readonly number[]) =>
    Math.max(...rgb) - Math.min(...rgb);

  it("is dark whatever the player's own colour", () => {
    for (const colour of [RED, BLUE, ORANGE, PALE, WHITE, BLACK]) {
      const { fill } = greyOf(colour);
      expect(Math.max(...fill), `fill ${fill.join(", ")}`).toBeLessThan(0.35);
    }
  });

  /** A trace of hue, never enough to read as a colour on the map. */
  it("keeps far less colour than the player's own", () => {
    for (const colour of [RED, BLUE, ORANGE]) {
      const { r, g, b } = colour.toRgb();
      const own = spread([r / 255, g / 255, b / 255]);
      expect(spread(greyOf(colour).fill)).toBeLessThan(own * 0.15);
    }
  });

  /** Two neighbours in one flat grey would lose the border between them. */
  it("differs between two players of different colours", () => {
    const blue = greyOf(BLUE).fill;
    const orange = greyOf(ORANGE).fill;

    const gap = Math.max(...blue.map((channel, i) => Math.abs(channel - orange[i]!)));
    expect(gap, `blue ${blue.join(", ")} / orange ${orange.join(", ")}`).toBeGreaterThan(0.02);
  });

  it("follows the player's lightness, so a pale player greys lighter", () => {
    const pale = greyOf(PALE).fill;
    const dark = greyOf(DARK_RED).fill;

    expect(pale[0] + pale[1] + pale[2]).toBeGreaterThan(dark[0] + dark[1] + dark[2]);
  });

  it("draws a border lighter than the grey it surrounds", () => {
    for (const colour of [RED, BLUE, BLACK, WHITE]) {
      const { fill, border } = greyOf(colour);
      for (let i = 0; i < 3; i++) expect(border[i]).toBeGreaterThan(fill[i]!);
    }
  });

  it("is a plain grey for a player who is grey already", () => {
    const { fill } = greyOf(fakeColour(128, 128, 128));

    expect(spread(fill)).toBeCloseTo(0, 6);
  });

  it("stays the same grey on every call, so a held key does not flicker", () => {
    expect(greyOf(BLUE)).toEqual(greyOf(BLUE));
  });
});
