import { describe, expect, it } from "vitest";
import { findTroopBarCells } from "./troop-bar";
import { addTroopBars, createFakeControlPanel } from "../../test/fakes";

describe("finding the troop bar", () => {
  it("finds the desktop cell and the mobile cell, which are both always present", () => {
    const panel = createFakeControlPanel();
    addTroopBars(panel, 2);

    const cells = findTroopBarCells(panel);

    expect(cells).toHaveLength(2);
    expect(cells.every((cell) => cell.classList.contains("troop-cell"))).toBe(
      true,
    );
  });

  it("finds nothing when the game's markup has changed under us", () => {
    const panel = createFakeControlPanel();
    panel.innerHTML = '<div class="something-else"><div></div></div>';

    expect(findTroopBarCells(panel)).toHaveLength(0);
  });

  it("finds nothing before the game has rendered its HUD", () => {
    expect(findTroopBarCells(createFakeControlPanel())).toHaveLength(0);
  });
});
