/**
 * The colour table the map renderer draws every territory from.
 *
 * The table is one texture, two rows wide by `PALETTE_SIZE`. Row 0 holds the
 * territory fill and row 1 holds the border, each at the owner's own `smallID`.
 * Handing a rewritten copy to `MapRenderer.updatePalette` recolours the whole
 * map in one call, which is the whole mechanism the alliance view mode runs on.
 *
 * Read from `writePaletteEntry` in `src/client/WebGLFrameBuilder.ts:619` and
 * `PALETTE_SIZE` in `src/client/render/gl/utils/ColorUtils.ts:14`, at
 * OpenFrontIO commit 332e5410e.
 */

import type { Colour, PlayerView } from "../../game/types";

/** The table's width, which covers the whole 12-bit player id range. */
export const PALETTE_SIZE = 4096;

/**
 * The alpha the game writes into every fill slot.
 *
 * The territory shader ignores it and uses its own `uTerritoryAlpha` uniform,
 * but the SAM radius pass reads the palette directly, so it has to match.
 */
export const FILL_ALPHA = 150 / 255;

/** The alpha the game writes into every border slot. */
export const BORDER_ALPHA = 1;

/**
 * How dark the mode draws a player it leaves out of the web.
 *
 * Judged on screen against the terrain underneath on issue #14. The game's own
 * `territoryAlpha` of 0.588 is left alone, so the grey blends with the terrain
 * exactly as a real player's colour does.
 */
export const GREY = 0.22;

/** How far the grey border sits above the grey fill, so an edge still reads. */
const GREY_BORDER_LIGHTEN = 0.35;

type Channels = [number, number, number, number];

/** A table of the right size, with every slot at nothing. */
export function createPalette(): Float32Array {
  return new Float32Array(PALETTE_SIZE * 2 * 4);
}

/** One player's two slots, for a test to read back. */
export function readSlot(
  palette: Float32Array,
  smallID: number,
): { fill: Channels; border: Channels } {
  return {
    fill: channelsAt(palette, smallID * 4),
    border: channelsAt(palette, PALETTE_SIZE * 4 + smallID * 4),
  };
}

/**
 * Puts every player's real colours back.
 *
 * This is the restore path, and it reads the game's own accessors on every
 * call, so a player who spawned while the mode was up gets their own colour
 * rather than the grey.
 */
export function paintReal(
  palette: Float32Array,
  players: readonly PlayerView[],
): void {
  palette.fill(0);
  for (const player of players) {
    writeOwn(palette, player);
  }
}

/**
 * Greys every player, then puts the coloured ones back in their own colours.
 *
 * `coloured` holds the subject and their alliance partners. Where the package
 * keeps a real player colour it never changes that colour, so an ally draws
 * exactly as the game draws them. See docs/adr/0008.
 */
export function paintAlliance(
  palette: Float32Array,
  players: readonly PlayerView[],
  coloured: ReadonlySet<number>,
): void {
  palette.fill(0);
  const greyBorder = GREY + (1 - GREY) * GREY_BORDER_LIGHTEN;
  for (const player of players) {
    if (coloured.has(player.smallID())) {
      writeOwn(palette, player);
      continue;
    }
    writeSlot(
      palette,
      player.smallID(),
      [GREY, GREY, GREY],
      [greyBorder, greyBorder, greyBorder],
    );
  }
}

function writeOwn(palette: Float32Array, player: PlayerView): void {
  writeSlot(
    palette,
    player.smallID(),
    toUnit(player.territoryColor()),
    toUnit(player.borderColor()),
  );
}

function writeSlot(
  palette: Float32Array,
  smallID: number,
  fill: readonly [number, number, number],
  border: readonly [number, number, number],
): void {
  const fillOffset = smallID * 4;
  palette[fillOffset] = fill[0];
  palette[fillOffset + 1] = fill[1];
  palette[fillOffset + 2] = fill[2];
  palette[fillOffset + 3] = FILL_ALPHA;

  const borderOffset = PALETTE_SIZE * 4 + smallID * 4;
  palette[borderOffset] = border[0];
  palette[borderOffset + 1] = border[1];
  palette[borderOffset + 2] = border[2];
  palette[borderOffset + 3] = BORDER_ALPHA;
}

/** The game's colours run 0 to 255. The palette runs 0 to 1. */
function toUnit(colour: Colour): [number, number, number] {
  const rgb = colour.toRgb();
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
}

function channelsAt(palette: Float32Array, offset: number): Channels {
  return [
    palette[offset] ?? 0,
    palette[offset + 1] ?? 0,
    palette[offset + 2] ?? 0,
    palette[offset + 3] ?? 0,
  ];
}
