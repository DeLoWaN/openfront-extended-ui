import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installFakeCanvas, type FakeCanvasContext } from "../../test/fakes";
import { breathOffset } from "./geometry";
import { LAYER, createMarkLayer } from "./layer";

let context: FakeCanvasContext;
let restore: () => void;

beforeEach(() => {
  ({ context, restore } = installFakeCanvas());
});
afterEach(() => restore());

const ada = { x: 200, y: 300, name: "Ada", colour: "rgb(10,200,30)", isYou: false };

function scene(over: Partial<Parameters<ReturnType<typeof createMarkLayer>["draw"]>[0]> = {}) {
  return { rings: [ada], pointers: [], unit: 1, nowMs: 0, alpha: 1, ...over };
}

describe("the canvas the marks are drawn on", () => {
  it("puts one canvas in the page", () => {
    createMarkLayer();

    expect(document.querySelectorAll(`canvas.${LAYER}`)).toHaveLength(1);
  });

  it("takes the canvas out of the page again", () => {
    const layer = createMarkLayer();

    layer.remove();

    expect(document.querySelectorAll(`canvas.${LAYER}`)).toHaveLength(0);
  });

  it("covers the window, one canvas pixel per device pixel", () => {
    window.devicePixelRatio = 2;
    const layer = createMarkLayer();

    layer.draw(scene());

    const canvas = document.querySelector<HTMLCanvasElement>(`.${LAYER}`)!;
    expect(canvas.width).toBe(window.innerWidth * 2);
    expect(canvas.height).toBe(window.innerHeight * 2);
    expect(context.of("setTransform").at(-1)!.args).toEqual([2, 0, 0, 2, 0, 0]);
    window.devicePixelRatio = 1;
  });

  it("wipes the last frame before it draws a new one", () => {
    const layer = createMarkLayer();

    layer.draw(scene());

    expect(context.calls[context.calls.findIndex((c) => c.op === "clearRect")]!.args).toEqual([
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    ]);
    expect(context.calls.findIndex((c) => c.op === "clearRect")).toBeLessThan(
      context.calls.findIndex((c) => c.op === "arc"),
    );
  });

  it("wipes the canvas and draws nothing on clear", () => {
    const layer = createMarkLayer();
    layer.draw(scene());
    const drawn = context.calls.length;

    layer.clear();

    const ops = context.calls.slice(drawn).map((c) => c.op);
    expect(ops).toContain("clearRect");
    expect(ops).not.toContain("stroke");
    expect(ops).not.toContain("fillText");
  });
});

describe("a ring", () => {
  it("is a circle around the spawn with a radius of 16 px at rest", () => {
    createMarkLayer().draw(scene());

    const [arc] = context.of("arc");
    expect(arc!.args).toEqual([200, 300, 16, 0, Math.PI * 2]);
  });

  it("is drawn over a dark outline in the teammate's colour", () => {
    createMarkLayer().draw(scene());

    const [outline, line] = context.of("stroke");
    expect(String(outline!.strokeStyle)).toMatch(/^rgba\(0,\s*0,\s*0/);
    expect(line!.strokeStyle).toBe("rgb(10,200,30)");
    expect(outline!.lineWidth).toBeGreaterThan(line!.lineWidth);
  });

  it("scales with the unit", () => {
    createMarkLayer().draw(scene({ unit: 2 }));

    expect(context.of("arc")[0]!.args[2]).toBe(32);
  });

  it("breathes", () => {
    const layer = createMarkLayer();

    layer.draw(scene({ nowMs: 262 }));

    expect(context.of("arc")[0]!.args[2]).toBeCloseTo(16 + breathOffset(262), 10);
  });

  it("draws one ring per teammate", () => {
    createMarkLayer().draw(
      scene({ rings: [ada, { ...ada, x: 5, name: "Bea" }] }),
    );

    expect(context.of("arc")).toHaveLength(2);
  });
});

describe("the name above a ring", () => {
  it("is the teammate's name, centred over the spawn, 8 px over the ring", () => {
    createMarkLayer().draw(scene());

    const [text] = context.of("fillText");
    expect(text!.args).toEqual(["Ada", 200, 300 - 24]);
  });

  it("is bold, 12 px at the nominal size", () => {
    createMarkLayer().draw(scene());

    expect(context.of("fillText")[0]!.font).toBe("700 12px system-ui, sans-serif");
  });

  it("is in the teammate's colour over a dark outline", () => {
    createMarkLayer().draw(scene());

    expect(context.of("fillText")[0]!.fillStyle).toBe("rgb(10,200,30)");
    const outline = context.of("strokeText")[0]!;
    expect(outline.args).toEqual(["Ada", 200, 300 - 24]);
    expect(String(outline.strokeStyle)).toMatch(/^rgba\(0,\s*0,\s*0/);
  });

  it("is white for your own mark, while the ring keeps your colour", () => {
    createMarkLayer().draw(scene({ rings: [{ ...ada, isYou: true }] }));

    expect(context.of("fillText")[0]!.fillStyle).toBe("#ffffff");
    expect(context.of("stroke")[1]!.strokeStyle).toBe("rgb(10,200,30)");
  });

  /** The ring breathes by 2 px. The name stays where it is. */
  it("does not move while the ring breathes", () => {
    const layer = createMarkLayer();

    layer.draw(scene({ nowMs: 0 }));
    layer.draw(scene({ nowMs: 262 }));

    const [first, second] = context.of("fillText");
    expect(second!.args).toEqual(first!.args);
  });

  it("stays at 11 px when the ring is small", () => {
    createMarkLayer().draw(scene({ unit: 0.35 }));

    expect(context.of("fillText")[0]!.font).toBe("700 11px system-ui, sans-serif");
  });
});

describe("the opacity", () => {
  it("applies to the ring and the name alike", () => {
    createMarkLayer().draw(scene({ alpha: 0.4 }));

    for (const call of [...context.of("stroke"), ...context.of("fillText")]) {
      expect(call.globalAlpha).toBe(0.4);
    }
  });

  it("goes back to full once the frame is drawn", () => {
    createMarkLayer().draw(scene({ alpha: 0.4 }));

    expect(context.globalAlpha).toBe(1);
  });
});

describe("a chevron", () => {
  const pointer = {
    x: 940,
    y: 400,
    angle: 0,
    count: 1,
    colour: "rgb(0,0,255)",
    isYou: false,
  };

  it("is a filled shape in the teammate's colour, turned toward them", () => {
    createMarkLayer().draw(scene({ rings: [], pointers: [pointer] }));

    expect(context.of("translate")[0]!.args).toEqual([940, 400]);
    expect(context.of("rotate")[0]!.args).toEqual([0]);
    expect(context.of("fill")[0]!.fillStyle).toBe("rgb(0,0,255)");
  });

  it("is white when it points at your own spawn", () => {
    createMarkLayer().draw(
      scene({ rings: [], pointers: [{ ...pointer, isYou: true }] }),
    );

    expect(context.of("fill")[0]!.fillStyle).toBe("#ffffff");
  });

  it("reaches about 60 px along its direction", () => {
    createMarkLayer().draw(scene({ rings: [], pointers: [pointer] }));

    const xs = context
      .of("moveTo")
      .concat(context.of("lineTo"))
      .map((call) => call.args[0] as number);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(50);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(70);
  });

  it("says nothing about a count for one teammate", () => {
    createMarkLayer().draw(scene({ rings: [], pointers: [pointer] }));

    expect(context.of("fillText")).toHaveLength(0);
  });

  it("carries the count of the teammates it stands for", () => {
    createMarkLayer().draw(
      scene({ rings: [], pointers: [{ ...pointer, count: 3 }] }),
    );

    const [text] = context.of("fillText");
    expect(text!.args[0]).toBe("×3");
    expect(text!.fillStyle).toBe("rgb(0,0,255)");
  });

  it("puts the count on the screen side of the chevron, away from the edge", () => {
    // A chevron on the right edge pointing right: the count sits to its left.
    createMarkLayer().draw(
      scene({ rings: [], pointers: [{ ...pointer, count: 2 }] }),
    );

    expect(context.of("fillText")[0]!.args[1] as number).toBeLessThan(940);
  });

  it("fades with the rings", () => {
    createMarkLayer().draw(
      scene({ rings: [], pointers: [pointer], alpha: 0.25 }),
    );

    expect(context.of("fill")[0]!.globalAlpha).toBe(0.25);
  });
});
