import { describe, expect, it } from "vitest";
import {
  FADE_MS,
  GLIDE_MS,
  createMarkTracker,
  fadeAlpha,
} from "./motion";
import type { MarkedPlayer } from "./players";

function mate(x: number, y: number, over: Partial<MarkedPlayer> = {}): MarkedPlayer {
  return { id: "a", name: "Ada", colour: "rgb(1,2,3)", x, y, isYou: false, ...over };
}

describe("where a mark is drawn", () => {
  it("sits on the spawn the first time it is seen", () => {
    const tracker = createMarkTracker();

    tracker.update([mate(10, 20)], 0);

    expect(tracker.marks(0)).toEqual([
      { id: "a", name: "Ada", colour: "rgb(1,2,3)", isYou: false, x: 10, y: 20 },
    ]);
  });

  it("stays put while the spawn does not change", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(10, 20)], 0);

    tracker.update([mate(10, 20)], 5000);

    expect(tracker.marks(5000)[0]).toMatchObject({ x: 10, y: 20 });
  });

  it("starts a glide from the old place when the spawn changes", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);

    tracker.update([mate(100, 0)], 1000);

    expect(tracker.marks(1000)[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("glides over 350 ms and arrives on the new spawn", () => {
    expect(GLIDE_MS).toBe(350);
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);
    tracker.update([mate(100, 40)], 1000);

    expect(tracker.marks(1000 + GLIDE_MS)[0]).toMatchObject({ x: 100, y: 40 });
    expect(tracker.marks(1000 + GLIDE_MS + 500)[0]).toMatchObject({
      x: 100,
      y: 40,
    });
  });

  /** The glide eases out, so half the time covers three quarters of the way. */
  it("covers three quarters of the way in half the time", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);
    tracker.update([mate(100, 40)], 1000);

    const [halfway] = tracker.marks(1000 + GLIDE_MS / 2);

    expect(halfway!.x).toBeCloseTo(75, 6);
    expect(halfway!.y).toBeCloseTo(30, 6);
  });

  it("starts the next glide from where the mark is, not from the last spawn", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);
    tracker.update([mate(100, 0)], 1000);
    const midway = tracker.marks(1000 + GLIDE_MS / 2)[0]!;

    tracker.update([mate(0, 100)], 1000 + GLIDE_MS / 2);

    expect(tracker.marks(1000 + GLIDE_MS / 2)[0]).toEqual(midway);
    expect(tracker.marks(1000 + GLIDE_MS / 2 + GLIDE_MS)[0]).toMatchObject({
      x: 0,
      y: 100,
    });
  });

  it("does not restart a glide that the same spawn repeats", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);
    tracker.update([mate(100, 0)], 1000);
    tracker.update([mate(100, 0)], 1100);

    expect(tracker.marks(1000 + GLIDE_MS)[0]).toMatchObject({ x: 100 });
  });

  it("takes the colour and the name the game reports now", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0)], 0);

    tracker.update([mate(0, 0, { name: "Bea", colour: "rgb(9,9,9)" })], 100);

    expect(tracker.marks(100)[0]).toMatchObject({
      name: "Bea",
      colour: "rgb(9,9,9)",
    });
  });

  it("drops a teammate the game no longer reports", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(0, 0), mate(5, 5, { id: "b" })], 0);

    tracker.update([mate(0, 0)], 100);

    expect(tracker.marks(100).map((m) => m.id)).toEqual(["a"]);
  });

  it("keeps a mark until the next update, so a fade has something to draw", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(3, 3)], 0);

    expect(tracker.marks(9000)).toHaveLength(1);
  });

  it("forgets every mark on clear", () => {
    const tracker = createMarkTracker();
    tracker.update([mate(3, 3)], 0);

    tracker.clear();

    expect(tracker.marks(0)).toEqual([]);
  });
});

describe("how a mark fades when the spawn phase ends", () => {
  it("is fully drawn at the moment the phase ends", () => {
    expect(fadeAlpha(1000, 1000)).toBe(1);
  });

  it("is half drawn after 0.6 s", () => {
    expect(FADE_MS).toBe(1200);
    expect(fadeAlpha(1000, 1600)).toBeCloseTo(0.5, 10);
  });

  it("is gone after 1.2 s", () => {
    expect(fadeAlpha(1000, 2200)).toBe(0);
  });

  it("stays gone afterwards", () => {
    expect(fadeAlpha(1000, 90000)).toBe(0);
  });

  it("never reads above 1 for a clock that stepped back", () => {
    expect(fadeAlpha(1000, 900)).toBe(1);
  });
});
