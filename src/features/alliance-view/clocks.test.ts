import { describe, expect, it } from "vitest";
import { FakeTransformHandler } from "../../test/fakes";
import { HIDDEN } from "../../runtime/styles";
import {
  CLOCK_MAX_PX,
  LAYER,
  URGENT,
  createClockLayer,
  isNameDrawn,
  nameUnits,
} from "./clocks";

const BIG = { x: 10, y: 10, size: 40 };

function label(over: Partial<Parameters<typeof clockOf>[0]> = {}) {
  return clockOf({ anchor: BIG, text: "2:30", urgent: false, ...over });
}

function clockOf(clock: {
  anchor: { x: number; y: number; size: number };
  text: string;
  urgent: boolean;
}) {
  return clock;
}

const drawn = () =>
  [...document.querySelectorAll<HTMLElement>(`.${LAYER} > *`)].filter(
    (node) => !node.classList.contains(HIDDEN),
  );

describe("the layer the clocks are drawn on", () => {
  /**
   * The map is one WebGL canvas with no element per territory, so a clock has
   * to go on a layer of the package's own. See docs/adr/0005.
   */
  it("puts one layer in the page", () => {
    createClockLayer();

    expect(document.querySelectorAll(`.${LAYER}`)).toHaveLength(1);
  });

  it("takes the layer out of the page again", () => {
    const layer = createClockLayer();
    layer.place([label()], new FakeTransformHandler());

    layer.remove();

    expect(document.querySelectorAll(`.${LAYER}`)).toHaveLength(0);
  });

  it("draws one clock per ally", () => {
    const layer = createClockLayer();

    layer.place(
      [
        label({ anchor: { x: 10, y: 10, size: 40 } }),
        label({ anchor: { x: 20, y: 20, size: 40 } }),
      ],
      new FakeTransformHandler(),
    );

    expect(drawn()).toHaveLength(2);
  });

  it("writes the clock a player reads", () => {
    const layer = createClockLayer();

    layer.place([label({ text: "0:07" })], new FakeTransformHandler());

    expect(drawn()[0]!.textContent).toBe("0:07");
  });

  /**
   * Red means the game offers to renew this alliance now, so it reads as
   * "act on this", not merely "nearly over".
   */
  it("marks a clock the game offers to renew", () => {
    const layer = createClockLayer();

    layer.place(
      [label({ urgent: true }), label({ anchor: { x: 20, y: 20, size: 40 } })],
      new FakeTransformHandler(),
    );

    expect(drawn()[0]!.classList.contains(URGENT)).toBe(true);
    expect(drawn()[1]!.classList.contains(URGENT)).toBe(false);
  });

  it("puts a clock where the camera says its ally's name is", () => {
    const layer = createClockLayer();
    const camera = new FakeTransformHandler();

    layer.place([label({ anchor: { x: 30, y: 40, size: 40 } })], camera);

    expect(drawn()[0]!.style.left).toBe("60px");
  });

  /** The camera moves without telling us, so every clock is placed again. */
  it("places a clock again when the camera has moved", () => {
    const layer = createClockLayer();
    const camera = new FakeTransformHandler();
    layer.place([label({ anchor: { x: 30, y: 40, size: 40 } })], camera);

    camera.offsetX = 10;
    layer.place([label({ anchor: { x: 30, y: 40, size: 40 } })], camera);

    expect(drawn()[0]!.style.left).toBe("40px");
  });

  /**
   * A hover across a crowded map would otherwise build and drop nodes on every
   * frame, so the clocks are reused rather than rebuilt.
   */
  it("reuses the clocks it has already drawn", () => {
    const layer = createClockLayer();
    const camera = new FakeTransformHandler();
    layer.place([label(), label({ anchor: { x: 20, y: 20, size: 40 } })], camera);
    const first = drawn()[0]!;

    layer.place([label({ text: "1:00" })], camera);

    expect(drawn()).toHaveLength(1);
    expect(drawn()[0]).toBe(first);
  });

  it("takes every clock off the screen when the mode stands down", () => {
    const layer = createClockLayer();
    const camera = new FakeTransformHandler();
    layer.place([label()], camera);

    layer.hide();

    expect(drawn()).toHaveLength(0);
  });

  it("hides an ally the renderer has not placed yet", () => {
    const layer = createClockLayer();

    layer.place([], new FakeTransformHandler());

    expect(drawn()).toHaveLength(0);
  });

  it("hides a clock the camera has pushed off the screen", () => {
    const layer = createClockLayer();

    layer.place(
      [label({ anchor: { x: 5000, y: 10, size: 40 } })],
      new FakeTransformHandler(),
    );

    expect(drawn()).toHaveLength(0);
  });
});

describe("how big a clock is drawn", () => {
  /**
   * A name grows with the square of its owner's room until a cap, not in step
   * with it. A clock scaled straight from the camera drifts away from the name
   * as an empire grows, which defeats the point of the name anchor.
   * These are the game's own steps, from `shaders/name/name.vert.glsl:96`.
   */
  it("follows the game's own sizing steps", () => {
    expect(nameUnits(40)).toBe(16 * 3);
  });

  it("holds a small nation at the game's own floor", () => {
    expect(nameUnits(1)).toBe(4 * 0.25);
  });

  it("caps a large nation where the game caps it", () => {
    expect(nameUnits(1000)).toBe(400 * 3);
  });

  it("never draws a clock larger than the cap", () => {
    const layer = createClockLayer();

    layer.place(
      [label({ anchor: { x: 10, y: 10, size: 400 } })],
      new FakeTransformHandler(),
    );

    expect(drawn()[0]!.style.fontSize).toBe(`${CLOCK_MAX_PX}px`);
  });
});

describe("when the game hides the name a clock sits under", () => {
  /**
   * A clock with no name over it has lost the thing it was anchored to, and at
   * that zoom the colour already answers who is in the web. See issue #13.
   */
  it("keeps the clock while the game draws the name", () => {
    expect(isNameDrawn(nameUnits(40), 2, 1024)).toBe(true);
  });

  it("drops the clock once the game drops the name", () => {
    expect(isNameDrawn(nameUnits(1), 2, 1024)).toBe(false);
  });

  it("drops the clock as the camera zooms out", () => {
    const units = nameUnits(6);

    expect(isNameDrawn(units, 1, 1024)).toBe(true);
    expect(isNameDrawn(units, 0.05, 1024)).toBe(false);
  });

  it("takes a hidden clock off the screen", () => {
    const layer = createClockLayer();
    const camera = new FakeTransformHandler();
    camera.scale = 0.001;

    layer.place([label()], camera);

    expect(drawn()).toHaveLength(0);
  });
});
