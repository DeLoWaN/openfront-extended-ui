import { describe, expect, it } from "vitest";
import { createNationMask } from "./mask";

/** A 4 by 2 map, as the game packs it: one entry per tile, row after row. */
const WIDTH = 4;
const HEIGHT = 2;
const FALLOUT = 1 << 13;
const DEFENSE = 1 << 14;

function alphaAt(mask: ReturnType<typeof createNationMask>, x: number, y: number): number {
  return mask.pixels[(y * WIDTH + x) * 4 + 3]!;
}

function hatchedTiles(mask: ReturnType<typeof createNationMask>): string[] {
  const found: string[] = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (alphaAt(mask, x, y) === 255) found.push(`${x},${y}`);
    }
  }
  return found;
}

describe("createNationMask", () => {
  it("covers exactly the tiles a hatched nation owns", () => {
    const mask = createNationMask(WIDTH, HEIGHT);
    // Row 0: nation 2, nation 2, human 7, unowned. Row 1: unowned, nation 3, nation 9 (not hatched), nation 2.
    const tiles = Uint16Array.from([2, 2, 7, 0, 0, 3, 9, 2]);

    mask.refresh(tiles, new Set([2, 3]));

    expect(hatchedTiles(mask)).toEqual(["0,0", "1,0", "1,1", "3,1"]);
  });

  it("reads the owner through the other bits of a tile's state", () => {
    const mask = createNationMask(WIDTH, HEIGHT);
    const tiles = Uint16Array.from([2 | DEFENSE, 0, 0, 0, 0, 0, 0, 0]);

    mask.refresh(tiles, new Set([2]));

    expect(hatchedTiles(mask)).toEqual(["0,0"]);
  });

  it("leaves out a fallout tile, which the game draws as nuked ground rather than territory", () => {
    const mask = createNationMask(WIDTH, HEIGHT);
    const tiles = Uint16Array.from([2 | FALLOUT, 2, 0, 0, 0, 0, 0, 0]);

    mask.refresh(tiles, new Set([2]));

    expect(hatchedTiles(mask)).toEqual(["1,0"]);
  });

  it("reports the rows where a tile moved in or out of the hatch, and nothing when none did", () => {
    const mask = createNationMask(WIDTH, HEIGHT);
    const tiles = Uint16Array.from([2, 0, 0, 0, 0, 0, 0, 0]);

    expect(mask.refresh(tiles, new Set([2]))).toEqual({ first: 0, last: 0 });
    expect(mask.refresh(tiles, new Set([2]))).toBeNull();

    tiles[5] = 2;
    expect(mask.refresh(tiles, new Set([2]))).toEqual({ first: 1, last: 1 });

    // The nation dies, so its tiles on both rows leave the hatch.
    expect(mask.refresh(tiles, new Set())).toEqual({ first: 0, last: 1 });
    expect(hatchedTiles(mask)).toEqual([]);
  });

  it("says whether any tile is hatched", () => {
    const mask = createNationMask(WIDTH, HEIGHT);
    expect(mask.isEmpty()).toBe(true);

    mask.refresh(Uint16Array.from([0, 0, 2, 0, 0, 0, 0, 0]), new Set([2]));
    expect(mask.isEmpty()).toBe(false);
  });
});
