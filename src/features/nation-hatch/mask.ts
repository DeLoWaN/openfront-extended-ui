import { OWNER_MASK } from "../../game/types";

/**
 * The bit that marks a nuked tile. `TileCodec.ts:10`, read at OpenFrontIO
 * commit 8ca8e5895. The game draws such a tile as nuked ground, not as its
 * owner's territory.
 */
const FALLOUT_BIT = 1 << 13;

const OPAQUE = 255;

/** The first and the last row a refresh changed, both included. */
export interface RowSpan {
  readonly first: number;
  readonly last: number;
}

/** Which tiles of the map lie under the nation hatch. */
export interface NationMask {
  /**
   * One RGBA pixel per tile, row after row. Only the alpha is used: 255 under
   * the hatch, 0 elsewhere. Shaped for `ImageData`.
   */
  readonly pixels: Uint8ClampedArray;
  /**
   * Reads every tile's owner again. Returns the rows where a tile moved in or
   * out of the hatch, or null when no tile did.
   *
   * `tiles` is the game's packed tile state, one entry per tile, row after row.
   */
  refresh(tiles: Uint16Array, nations: ReadonlySet<number>): RowSpan | null;
  /** True when no tile lies under the hatch. */
  isEmpty(): boolean;
}

/**
 * `pixels` is where the mask writes, so it can be the buffer of an `ImageData`.
 * It must hold `width * height * 4` bytes.
 */
export function createNationMask(
  width: number,
  height: number,
  pixels: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4),
): NationMask {
  // Indexed by `smallID`, because a set lookup per tile is too slow on millions of tiles.
  const hatched = new Uint8Array(OWNER_MASK + 1);
  let covered = 0;

  return {
    pixels,

    refresh(tiles, nations) {
      hatched.fill(0);
      for (const id of nations) hatched[id & OWNER_MASK] = 1;

      let first = -1;
      let last = -1;
      covered = 0;
      const count = Math.min(tiles.length, width * height);
      for (let tile = 0; tile < count; tile++) {
        const state = tiles[tile]!;
        const inside =
          (state & FALLOUT_BIT) === 0 && hatched[state & OWNER_MASK] === 1;
        const alpha = inside ? OPAQUE : 0;
        const at = tile * 4 + 3;
        if (pixels[at] !== alpha) {
          pixels[at] = alpha;
          const row = Math.floor(tile / width);
          if (first === -1) first = row;
          last = row;
        }
        if (inside) covered++;
      }
      return first === -1 ? null : { first, last };
    },

    isEmpty: () => covered === 0,
  };
}
