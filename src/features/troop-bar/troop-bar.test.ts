import { describe, expect, it } from "vitest";
import { findFills, findTroopBars, readTroopLevel } from "./troop-bar";
import {
  addTroopBars,
  createFakeControlPanel,
  setTroopBarFill,
} from "../../test/fakes";

describe("finding the game's troop bars", () => {
  it("finds the wide bar and the narrow bar, which are both always in the page", () => {
    const panel = createFakeControlPanel();
    addTroopBars(panel, 2);

    expect(findTroopBars(panel)).toHaveLength(2);
  });

  it("returns the bar itself, which is the node that clips its overflow", () => {
    const panel = createFakeControlPanel();
    addTroopBars(panel, 1);

    const [bar] = findTroopBars(panel);

    expect(bar!.classList.contains("overflow-hidden")).toBe(true);
  });

  it("finds nothing before the game has drawn its HUD", () => {
    expect(findTroopBars(createFakeControlPanel())).toHaveLength(0);
  });

  it("finds nothing when the game's markup has changed under us", () => {
    const panel = createFakeControlPanel();
    panel.innerHTML = '<div class="something-else"><div></div></div>';

    expect(findTroopBars(panel)).toHaveLength(0);
  });

  // The fill sits two levels below the bar. A blue node somewhere else in the
  // HUD would otherwise be read as a troop bar.
  it("ignores a blue fill that is not inside a bar", () => {
    const panel = createFakeControlPanel();
    panel.innerHTML = '<div><div><div class="bg-malibu-blue"></div></div></div>';

    expect(findTroopBars(panel)).toHaveLength(0);
  });
});

describe("finding the node the package draws next to", () => {
  it("finds the node holding the bar's fills", () => {
    const panel = createFakeControlPanel();
    const [bar] = addTroopBars(panel, 1);

    const fills = findFills(bar!);

    expect(fills!.contains(bar!.querySelector(".bg-malibu-blue")!)).toBe(true);
  });

  it("finds nothing when the bar has no fills", () => {
    const bare = document.createElement("div");

    expect(findFills(bare)).toBeNull();
  });
});

describe("reading the troop level off the bar", () => {
  function barWith(level: number | null, committed = 0): HTMLElement {
    const panel = createFakeControlPanel();
    const [bar] = addTroopBars(panel, 1);
    if (level !== null) setTroopBarFill(bar!, level, committed);
    return bar!;
  }

  it("reads the fraction the game wrote on the troops fill", () => {
    expect(readTroopLevel(barWith(0.422))).toBeCloseTo(0.422, 6);
  });

  /**
   * Committed troops leave your pool the moment an attack launches, so they no
   * longer feed regeneration. The second fill must not count.
   */
  it("ignores the committed troops stacked after the troops fill", () => {
    expect(readTroopLevel(barWith(0.3, 0.4))).toBeCloseTo(0.3, 6);
  });

  it("reads an empty bar as empty, not as unreadable", () => {
    expect(readTroopLevel(barWith(0))).toBe(0);
  });

  it("reads a level the game wrote in exponent form", () => {
    const found = barWith(0.5);
    found.querySelector<HTMLElement>(".bg-malibu-blue")!.style.transform =
      "scaleX(4.22e-1)";

    expect(readTroopLevel(found)).toBeCloseTo(0.422, 6);
  });

  it("keeps the level inside the bar, because the bar cannot draw past its ends", () => {
    const found = barWith(0.5);
    found.querySelector<HTMLElement>(".bg-malibu-blue")!.style.transform =
      "scaleX(1.4)";

    expect(readTroopLevel(found)).toBe(1);
  });

  // Silence would be wrong here: a stale percentage reads as a live one.
  it("reads nothing when the game has not written a transform yet", () => {
    expect(readTroopLevel(barWith(null))).toBeNull();
  });

  it("reads nothing when the transform is not a scale the package understands", () => {
    const found = barWith(0.5);
    found.querySelector<HTMLElement>(".bg-malibu-blue")!.style.transform =
      "rotate(20deg)";

    expect(readTroopLevel(found)).toBeNull();
  });
});
