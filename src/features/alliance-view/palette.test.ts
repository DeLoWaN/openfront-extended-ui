import { describe, expect, it } from "vitest";
import { FakePlayerView, fakeColour } from "../../test/fakes";
import {
  BORDER_ALPHA,
  FILL_ALPHA,
  GREY,
  PALETTE_SIZE,
  createPalette,
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

describe("the palette that greys the map", () => {
  it("greys every player the match knows", () => {
    const palette = createPalette();

    paintAlliance(palette, [player(1), player(2)], new Set());

    expect(readSlot(palette, 1).fill).toEqual(f32(GREY, GREY, GREY, FILL_ALPHA));
    expect(readSlot(palette, 2).fill).toEqual(f32(GREY, GREY, GREY, FILL_ALPHA));
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

    expect(readSlot(palette, 1).fill).toEqual(f32(GREY, GREY, GREY, FILL_ALPHA));
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
