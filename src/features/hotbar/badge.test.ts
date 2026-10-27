import { describe, expect, it } from "vitest";
import {
  aimPoint,
  arrowDegrees,
  BADGE_OFFSET_PX,
  DEFAULT_SECONDS,
  MAX_ARROW_DEGREES,
  placeBadge,
  stayMs,
} from "./badge";

const SCREEN = { width: 1600, height: 900 };
const PANEL = { width: 80, height: 40 };

describe("where the badge sits", () => {
  it("centres on the cursor's axis, 50 pixels below it", () => {
    const placed = placeBadge({ x: 800, y: 300 }, PANEL, SCREEN);

    expect(placed).toEqual({
      left: 760,
      top: 300 + BADGE_OFFSET_PX,
      tail: { x: 800, y: 390 },
    });
  });

  it("is never above the cursor", () => {
    for (const y of [0, 100, 500]) {
      const placed = placeBadge({ x: 800, y }, PANEL, SCREEN);
      expect(placed!.top).toBeGreaterThanOrEqual(y + BADGE_OFFSET_PX);
    }
  });

  it("moves sideways only to stay on the screen", () => {
    expect(placeBadge({ x: 10, y: 100 }, PANEL, SCREEN)!.left).toBe(0);
    expect(placeBadge({ x: 1595, y: 100 }, PANEL, SCREEN)!.left).toBe(1520);
  });

  it("is not drawn when it would not fit below the cursor", () => {
    expect(placeBadge({ x: 800, y: 820 }, PANEL, SCREEN)).toBeNull();
  });
});

describe("where the arrow points", () => {
  const tail = { x: 800, y: 400 };

  it("points straight down at a target straight below", () => {
    expect(arrowDegrees(tail, { x: 800, y: 800 })).toBe(0);
  });

  it("leans towards the side the target is on", () => {
    expect(arrowDegrees(tail, { x: 900, y: 500 })).toBeCloseTo(45);
    expect(arrowDegrees(tail, { x: 700, y: 500 })).toBeCloseTo(-45);
  });

  it("never swings past the cap, from any corner", () => {
    const corners = [
      { x: 0, y: 450 },
      { x: 1600, y: 450 },
      { x: 0, y: 400 },
      { x: 1600, y: 350 },
    ];
    for (const target of corners) {
      expect(Math.abs(arrowDegrees(tail, target))).toBeLessThanOrEqual(
        MAX_ARROW_DEGREES,
      );
    }
    expect(arrowDegrees(tail, { x: 1600, y: 410 })).toBe(MAX_ARROW_DEGREES);
    expect(arrowDegrees(tail, { x: 0, y: 410 })).toBe(-MAX_ARROW_DEGREES);
  });
});

describe("what the arrow aims at", () => {
  it("is one icon's middle", () => {
    expect(aimPoint([{ x: 300, y: 880 }])).toEqual({ x: 300, y: 880 });
  });

  it("is the point between two icons", () => {
    expect(
      aimPoint([
        { x: 300, y: 880 },
        { x: 360, y: 880 },
      ]),
    ).toEqual({ x: 330, y: 880 });
  });

  it("is nothing when there is no icon", () => {
    expect(aimPoint([])).toBeNull();
  });
});

describe("how long the badge stays", () => {
  it("is 3.5 seconds when nothing is set", () => {
    expect(stayMs("")).toBe(DEFAULT_SECONDS * 1000);
  });

  it("follows a number the player set", () => {
    expect(stayMs("6")).toBe(6000);
    expect(stayMs(" 1.5 ")).toBe(1500);
  });

  it("reads text that is no sensible time as nothing set", () => {
    for (const text of ["soon", "0", "-2", "0.1", "999", "NaN"]) {
      expect(stayMs(text)).toBe(3500);
    }
  });
});
