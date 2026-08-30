import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "./boot";
import { createSettings } from "./settings";
import { HIDDEN } from "./styles";
import { troopBar } from "../features/troop-bar";
import {
  addTroopBars,
  createFakeControlPanel,
  FakeGameView,
  setTroopBarFill,
} from "../test/fakes";

/**
 * The whole package, driven the way the game drives it.
 *
 * This is the finishing test for the troop bar readout: it appears on both of
 * the game's bars in a live match, goes when the match ends, comes back in a
 * second match with no page reload, can be switched off, and leaves the game's
 * markup exactly as it found it.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const CSS = ".ofx-troop-strip{background:violet}";

function cellMarkup(panel: HTMLElement): string[] {
  return [...panel.querySelectorAll<HTMLElement>(".troop-cell")].map(
    (cell) => cell.outerHTML,
  );
}

function setup() {
  const panel = createFakeControlPanel();
  const bars = addTroopBars(panel, 2);
  // A troop level below the plateau, so the readout has a share to print from
  // the first tick.
  for (const bar of bars) setTroopBarFill(bar, 0.25);

  // Taken before the package runs, so it is the game's markup untouched.
  const untouched = cellMarkup(panel);

  let stored = "{}";
  const settings = createSettings({
    read: () => stored,
    write: (value) => {
      stored = value;
    },
  });

  const pkg = start({
    panel: panel.asControlPanel(),
    features: [troopBar],
    settings,
    css: CSS,
  });

  return {
    panel,
    pkg,
    untouched,
    /** Runs the boundary poll, then one game tick. */
    play(ticks = 1) {
      vi.advanceTimersByTime(600);
      for (let i = 0; i < ticks; i++) panel.tick();
    },
    strips: () => document.querySelectorAll(".ofx-troop-strip"),
    shares: () => document.querySelectorAll<HTMLElement>(".ofx-troop-share"),
  };
}

describe("the package in a live match", () => {
  it("marks the plateau on both of the game's troop bars", () => {
    const { panel, play, strips } = setup();

    panel.game = new FakeGameView();
    play();

    expect(strips()).toHaveLength(2);
  });

  it("prints the share of best rate on both bars", () => {
    const { panel, play, shares } = setup();

    panel.game = new FakeGameView();
    play();

    expect([...shares()].map((share) => share.textContent)).toEqual([
      "89%",
      "89%",
    ]);
  });

  it("shows nothing before a match starts", () => {
    const { play, strips } = setup();

    play();

    expect(strips()).toHaveLength(0);
  });

  it("puts the package's stylesheet into the page", () => {
    setup();

    expect(
      document.head.querySelector("style[data-openfront-extended-ui]")
        ?.textContent,
    ).toBe(CSS);
  });

  it("leaves the game's own tick working", () => {
    const { panel, play } = setup();
    panel.game = new FakeGameView();

    play(3);

    expect(panel.ownTicks).toBe(3);
  });
});

describe("the package across the match boundary", () => {
  it("takes the readout away when the game goes back to the lobby", () => {
    const { panel, play, strips } = setup();
    panel.game = new FakeGameView();
    play();

    document.dispatchEvent(new Event("leave-lobby"));

    expect(strips()).toHaveLength(0);
  });

  it("shows it again in a second match, with no page reload", () => {
    const { panel, play, strips } = setup();
    panel.game = new FakeGameView();
    play();
    document.dispatchEvent(new Event("leave-lobby"));

    panel.game = new FakeGameView();
    play();

    expect(strips()).toHaveLength(2);
  });

  it("shows it again when one match is replaced by the next", () => {
    const { panel, play, strips } = setup();
    panel.game = new FakeGameView();
    play();

    panel.game = new FakeGameView();
    play();

    expect(strips()).toHaveLength(2);
  });

  it("gives the game its own tick back between matches", () => {
    const { panel, play } = setup();
    panel.game = new FakeGameView();
    play();

    document.dispatchEvent(new Event("leave-lobby"));

    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });
});

describe("switching the readout off", () => {
  it("takes it off the screen at once", () => {
    const { panel, pkg, play, strips } = setup();
    panel.game = new FakeGameView();
    play();

    pkg.registry.setEnabled("troop-bar", false);

    expect(strips()).toHaveLength(0);
  });

  it("keeps it off through the next tick", () => {
    const { panel, pkg, play, strips } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("troop-bar", false);

    play(2);

    expect(strips()).toHaveLength(0);
  });

  it("keeps it off in the next match", () => {
    const { panel, pkg, play, strips } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("troop-bar", false);

    panel.game = new FakeGameView();
    play();

    expect(strips()).toHaveLength(0);
  });

  it("brings it back when it is switched on again", () => {
    const { panel, pkg, play, strips } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("troop-bar", false);

    pkg.registry.setEnabled("troop-bar", true);
    play();

    expect(strips()).toHaveLength(2);
  });
});

describe("switching the share of best rate off", () => {
  it("hides the number and leaves the strip", () => {
    const { panel, pkg, play, strips, shares } = setup();
    panel.game = new FakeGameView();
    play();

    pkg.registry.setOption("troop-bar", "percentage", false);
    play();

    expect(strips()).toHaveLength(2);
    expect([...shares()].every((share) => share.classList.contains(HIDDEN))).toBe(
      true,
    );
  });

  it("remembers the choice into the next match", () => {
    const { panel, pkg, play, shares } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setOption("troop-bar", "percentage", false);

    panel.game = new FakeGameView();
    play();

    expect([...shares()].every((share) => share.classList.contains(HIDDEN))).toBe(
      true,
    );
  });
});

describe("switching the whole package off", () => {
  /**
   * The readout writes no property on any of the game's elements, so the
   * markup has to come back byte for byte. See docs/adr/0004.
   */
  it("leaves the game's markup exactly as it found it", () => {
    const { panel, pkg, play, untouched } = setup();
    panel.game = new FakeGameView();
    play();
    expect(cellMarkup(panel)).not.toEqual(untouched);

    pkg.stop();

    expect(cellMarkup(panel)).toEqual(untouched);
    expect(
      document.head.querySelectorAll("style[data-openfront-extended-ui]"),
    ).toHaveLength(0);
    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });

  it("stops following the game", () => {
    const { panel, pkg, play, strips } = setup();

    pkg.stop();
    panel.game = new FakeGameView();
    play();

    expect(strips()).toHaveLength(0);
  });
});
