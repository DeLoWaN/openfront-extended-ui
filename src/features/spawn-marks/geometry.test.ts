import { describe, expect, it } from "vitest";
import {
  MERGE_DISTANCE_PX,
  breathOffset,
  markUnit,
  nameBaseline,
  nameFontPx,
  placePointers,
  ringRadius,
  ringStrokePx,
} from "./geometry";

describe("how big a mark is at one zoom", () => {
  /** The scale the game starts at on World at 1920 wide. */
  it("draws at its nominal size at the reference zoom", () => {
    expect(markUnit(0.864)).toBeCloseTo(1, 10);
    expect(ringRadius(markUnit(0.864))).toBeCloseTo(16, 10);
  });

  it("makes a ring of about 11 px with the whole World in view", () => {
    // The game fits World at about 0.58 on a 1920 px screen.
    expect(ringRadius(markUnit(0.58))).toBeCloseTo(10.74, 1);
  });

  it("grows in step with the zoom between the limits", () => {
    expect(markUnit(1.728)).toBeCloseTo(2, 10);
  });

  it("never shrinks below 0.35 of its nominal size", () => {
    expect(markUnit(0.05)).toBe(0.35);
  });

  it("never grows past 4 times its nominal size", () => {
    expect(markUnit(20)).toBe(4);
  });
});

describe("the name above a ring", () => {
  it("is 12 px at the nominal size", () => {
    expect(nameFontPx(1)).toBe(12);
  });

  it("grows with the mark", () => {
    expect(nameFontPx(3)).toBe(36);
  });

  it("never falls under 11 px", () => {
    expect(nameFontPx(0.35)).toBe(11);
  });

  /** The ring breathes. The name must not, so it ignores the breath. */
  it("sits 8 px above the ring at rest", () => {
    expect(nameBaseline(1)).toBe(24);
    expect(nameBaseline(2)).toBe(40);
  });
});

describe("how a ring breathes", () => {
  it("moves by 2 px either way", () => {
    const offsets = Array.from({ length: 200 }, (_, i) => breathOffset(i * 10));
    expect(Math.max(...offsets)).toBeCloseTo(2, 1);
    expect(Math.min(...offsets)).toBeCloseTo(-2, 1);
  });

  it("starts from rest", () => {
    expect(breathOffset(0)).toBe(0);
  });

  it("repeats about once a second", () => {
    // sin(0.006 t) has a period of 1047 ms.
    expect(breathOffset(1047.2)).toBeCloseTo(0, 1);
    expect(breathOffset(261.8)).toBeCloseTo(2, 1);
  });
});

describe("the line a ring is drawn with", () => {
  it("is 3 px at the nominal size", () => {
    expect(ringStrokePx(1)).toBe(3);
  });

  it("stays 3 px when the ring shrinks", () => {
    expect(ringStrokePx(0.35)).toBe(3);
  });

  it("thickens when the ring grows", () => {
    expect(ringStrokePx(4)).toBeCloseTo(9.6, 10);
  });
});

describe("the edge pointers", () => {
  const view = { width: 1000, height: 800 };
  const red = "rgb(255,0,0)";
  const blue = "rgb(0,0,255)";

  it("draws nothing when every teammate is on screen", () => {
    expect(placePointers([], view)).toEqual([]);
  });

  it("points right from 60 px inside the right edge", () => {
    const [pointer] = placePointers([{ x: 3000, y: 400, colour: red, isYou: false }], view);

    expect(pointer).toMatchObject({ x: 940, y: 400, angle: 0, count: 1 });
  });

  it("points left from 60 px inside the left edge", () => {
    const [pointer] = placePointers([{ x: -2000, y: 400, colour: red, isYou: false }], view);

    expect(pointer!.x).toBe(60);
    expect(pointer!.angle).toBeCloseTo(Math.PI, 10);
  });

  it("points up from 60 px under the top edge", () => {
    const [pointer] = placePointers([{ x: 500, y: -2000, colour: red, isYou: false }], view);

    expect(pointer!.y).toBe(60);
    expect(pointer!.angle).toBeCloseTo(-Math.PI / 2, 10);
  });

  /** The game's bottom row sits there, so a chevron under it would hide. */
  it("points down from 150 px over the bottom edge", () => {
    const [pointer] = placePointers([{ x: 500, y: 5000, colour: red, isYou: false }], view);

    expect(pointer!.y).toBe(650);
    expect(pointer!.angle).toBeCloseTo(Math.PI / 2, 10);
  });

  it("lands on the nearer edge for a teammate up and to the right", () => {
    // dx = 2500 and dy = -2600 from the centre. The top edge is reached first.
    const [pointer] = placePointers([{ x: 3000, y: -2200, colour: red, isYou: false }], view);

    expect(pointer!.y).toBeCloseTo(60, 10);
    expect(pointer!.x).toBeCloseTo(500 + 2500 * (340 / 2600), 6);
  });

  it("points along the line from the screen centre to the teammate", () => {
    const [pointer] = placePointers([{ x: 1500, y: 800, colour: red, isYou: false }], view);

    // dx = 1000, dy = 400 from the centre (500, 400).
    expect(pointer!.angle).toBeCloseTo(Math.atan2(400, 1000), 10);
    expect(pointer!.x).toBeCloseTo(940, 10);
  });

  it("keeps the colour of the teammate it points at", () => {
    const [pointer] = placePointers([{ x: 3000, y: 400, colour: blue, isYou: false }], view);

    expect(pointer!.colour).toBe(blue);
  });

  it("merges chevrons that land within 70 px of each other", () => {
    expect(MERGE_DISTANCE_PX).toBe(70);

    const pointers = placePointers(
      [
        { x: 3000, y: 400, colour: red, isYou: false },
        { x: 3000, y: 440, colour: blue, isYou: false },
        { x: 3000, y: 380, colour: blue, isYou: false },
      ],
      view,
    );

    expect(pointers).toHaveLength(1);
    expect(pointers[0]!.count).toBe(3);
  });

  it("keeps the colour of the first teammate in a merged chevron", () => {
    const [pointer] = placePointers(
      [
        { x: 3000, y: 400, colour: red, isYou: false },
        { x: 3000, y: 410, colour: blue, isYou: false },
      ],
      view,
    );

    expect(pointer!.colour).toBe(red);
  });

  it("never joins the local player's chevron to a teammate's", () => {
    const pointers = placePointers(
      [
        { x: 3000, y: 400, colour: red, isYou: true },
        { x: 3000, y: 410, colour: blue, isYou: false },
        { x: 3000, y: 420, colour: blue, isYou: false },
      ],
      view,
    );

    expect(pointers.map((pointer) => [pointer.isYou, pointer.count])).toEqual([
      [true, 1],
      [false, 2],
    ]);
  });

  it("keeps chevrons apart that land further than 70 px from each other", () => {
    const pointers = placePointers(
      [
        { x: 3000, y: 400, colour: red, isYou: false },
        { x: -3000, y: 400, colour: blue, isYou: false },
      ],
      view,
    );

    expect(pointers).toHaveLength(2);
    expect(pointers.map((pointer) => pointer.count)).toEqual([1, 1]);
  });

  it("copes with a screen too small for the margins", () => {
    const [pointer] = placePointers(
      [{ x: 3000, y: 400, colour: red, isYou: false }],
      { width: 100, height: 100 },
    );

    expect(Number.isFinite(pointer!.x)).toBe(true);
    expect(Number.isFinite(pointer!.y)).toBe(true);
  });
});
