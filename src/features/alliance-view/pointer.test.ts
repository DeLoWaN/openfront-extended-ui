import { describe, expect, it } from "vitest";
import { HIDDEN } from "../../runtime/styles";
import { FakeTransformHandler } from "../../test/fakes";
import {
  ARROW,
  EDGE_INSETS,
  NAME,
  POINTER,
  createPointer,
  edgePoint,
} from "./pointer";

const W = 1000;
const H = 600;
const { top, right, bottom, left } = EDGE_INSETS;

describe("where the pointer goes", () => {
  it("is nowhere while the target is on screen", () => {
    expect(edgePoint({ x: 500, y: 300 }, W, H)).toBeNull();
    expect(edgePoint({ x: 0, y: 0 }, W, H)).toBeNull();
    expect(edgePoint({ x: W, y: H }, W, H)).toBeNull();
  });

  it("faces right and sits on the right side for a target straight right", () => {
    const point = edgePoint({ x: 5000, y: 300 }, W, H)!;

    expect(point.angle).toBeCloseTo(0);
    expect(point.x).toBeCloseTo(W - right);
    expect(point.y).toBeCloseTo(300);
  });

  it("faces left for a target straight left", () => {
    const point = edgePoint({ x: -4000, y: 300 }, W, H)!;

    expect(point.angle).toBeCloseTo(180);
    expect(point.x).toBeCloseTo(left);
  });

  it("faces down and sits near the bottom for a target straight below", () => {
    const point = edgePoint({ x: 500, y: 4000 }, W, H)!;

    expect(point.angle).toBeCloseTo(90);
    expect(point.x).toBeCloseTo(500);
    expect(point.y).toBeCloseTo(H - bottom);
  });

  it("faces up and sits near the top for a target straight above", () => {
    const point = edgePoint({ x: 500, y: -4000 }, W, H)!;

    expect(point.angle).toBeCloseTo(-90);
    expect(point.y).toBeCloseTo(top);
  });

  it("keeps the bearing of a target off to one corner", () => {
    const target = { x: 2000, y: 1500 };
    const point = edgePoint(target, W, H)!;

    // The point lies on the line from the middle of the screen to the target.
    const bearing = Math.atan2(target.y - H / 2, target.x - W / 2);
    const seen = Math.atan2(point.y - H / 2, point.x - W / 2);
    expect(seen).toBeCloseTo(bearing);
    expect(point.angle).toBeCloseTo((bearing * 180) / Math.PI);
  });

  it("never leaves the rectangle inside the edge", () => {
    for (const target of [
      { x: -900, y: -900 },
      { x: 1900, y: -50 },
      { x: 1100, y: 900 },
      { x: -10, y: 300 },
    ]) {
      const point = edgePoint(target, W, H)!;

      expect(point.x).toBeGreaterThanOrEqual(left - 0.001);
      expect(point.x).toBeLessThanOrEqual(W - right + 0.001);
      expect(point.y).toBeGreaterThanOrEqual(top - 0.001);
      expect(point.y).toBeLessThanOrEqual(H - bottom + 0.001);
    }
  });

  it("keeps clear of the bottom of the screen, where the game's HUD is", () => {
    const point = edgePoint({ x: 500, y: 4000 }, W, H)!;

    expect(point.y).toBeLessThan(H - 100);
  });

  it("stays in the middle of a window too small to inset", () => {
    const point = edgePoint({ x: 500, y: 0 }, 100, 100)!;

    expect(point.x).toBeCloseTo(50);
    expect(point.y).toBeCloseTo(50);
  });
});

describe("the pointer on the page", () => {
  const camera = new FakeTransformHandler();
  const target = (x: number, y: number) => ({
    anchor: { x, y, size: 40 },
    name: "Ana",
    colour: "rgb(10, 200, 30)",
  });
  const node = () => document.querySelector<HTMLElement>(`.${POINTER}`)!;
  const shown = () => !node().classList.contains(HIDDEN);

  it("starts hidden", () => {
    createPointer();

    expect(shown()).toBe(false);
  });

  it("draws for a target off screen, with their name and colour", () => {
    const pointer = createPointer();

    pointer.place(target(5000, 100), camera);

    expect(shown()).toBe(true);
    expect(node().querySelector(`.${NAME}`)?.textContent).toBe("Ana");
    expect(node().style.getPropertyValue("--ofx-pointer-colour")).toBe(
      "rgb(10, 200, 30)",
    );
    expect(
      node().querySelector<HTMLElement>(`.${ARROW}`)!.style.transform,
    ).toContain("rotate(");
  });

  it("stays hidden for a target on screen", () => {
    const pointer = createPointer();

    pointer.place(target(10, 10), camera);

    expect(shown()).toBe(false);
  });

  it("hides when the target goes on screen, and for nobody", () => {
    const pointer = createPointer();
    pointer.place(target(5000, 100), camera);

    pointer.place(target(10, 10), camera);
    expect(shown()).toBe(false);

    pointer.place(target(5000, 100), camera);
    pointer.place(null, camera);
    expect(shown()).toBe(false);
  });

  it("follows the camera", () => {
    const pointer = createPointer();
    pointer.place(target(5000, 100), camera);
    expect(shown()).toBe(true);

    camera.offsetX = 4900;
    pointer.place(target(5000, 100), camera);
    camera.offsetX = 0;

    expect(shown()).toBe(false);
  });

  it("is taken out of the page on remove", () => {
    const pointer = createPointer();

    pointer.remove();

    expect(document.querySelectorAll(`.${POINTER}`)).toHaveLength(0);
  });
});
