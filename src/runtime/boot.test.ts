import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { start } from "./boot";
import { createSettings } from "./settings";
import { tickMarker } from "../features/tick-marker";
import {
  addTroopBars,
  createFakeControlPanel,
  FakeGameView,
} from "../test/fakes";

/**
 * The whole skeleton, driven the way the game drives it.
 *
 * This is the ticket's own finishing test: the marker appears in a live match,
 * goes when the match ends, comes back in a second match with no page reload,
 * and can be switched off.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const CSS = ".ofx-tick-marker{color:red}";

function setup() {
  const panel = createFakeControlPanel();
  addTroopBars(panel, 2);

  let stored = "{}";
  const settings = createSettings({
    read: () => stored,
    write: (value) => {
      stored = value;
    },
  });

  const pkg = start({
    panel: panel.asControlPanel(),
    features: [tickMarker],
    settings,
    css: CSS,
  });

  return {
    panel,
    pkg,
    /** Runs the boundary poll, then one game tick. */
    play(ticks = 1) {
      vi.advanceTimersByTime(600);
      for (let i = 0; i < ticks; i++) panel.tick();
    },
    markers: () => document.querySelectorAll(".ofx-tick-marker"),
  };
}

describe("the package in a live match", () => {
  it("shows the marker on both troop bars", () => {
    const { panel, play, markers } = setup();

    panel.game = new FakeGameView();
    play();

    expect(markers()).toHaveLength(2);
  });

  it("shows nothing before a match starts", () => {
    const { play, markers } = setup();

    play();

    expect(markers()).toHaveLength(0);
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
  it("takes the marker away when the game goes back to the lobby", () => {
    const { panel, play, markers } = setup();
    panel.game = new FakeGameView();
    play();

    document.dispatchEvent(new Event("leave-lobby"));

    expect(markers()).toHaveLength(0);
  });

  it("shows it again in a second match, with no page reload", () => {
    const { panel, play, markers } = setup();
    panel.game = new FakeGameView();
    play();
    document.dispatchEvent(new Event("leave-lobby"));

    panel.game = new FakeGameView();
    play();

    expect(markers()).toHaveLength(2);
  });

  it("shows it again when one match is replaced by the next", () => {
    const { panel, play, markers } = setup();
    panel.game = new FakeGameView();
    play();

    panel.game = new FakeGameView();
    play();

    expect(markers()).toHaveLength(2);
  });

  it("gives the game its own tick back between matches", () => {
    const { panel, play } = setup();
    panel.game = new FakeGameView();
    play();

    document.dispatchEvent(new Event("leave-lobby"));

    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });
});

describe("switching the marker off", () => {
  it("takes it off the screen at once", () => {
    const { panel, pkg, play, markers } = setup();
    panel.game = new FakeGameView();
    play();

    pkg.registry.setEnabled("tick-marker", false);

    expect(markers()).toHaveLength(0);
  });

  it("keeps it off through the next tick", () => {
    const { panel, pkg, play, markers } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("tick-marker", false);

    play(2);

    expect(markers()).toHaveLength(0);
  });

  it("keeps it off in the next match", () => {
    const { panel, pkg, play, markers } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("tick-marker", false);

    panel.game = new FakeGameView();
    play();

    expect(markers()).toHaveLength(0);
  });

  it("brings it back when it is switched on again", () => {
    const { panel, pkg, play, markers } = setup();
    panel.game = new FakeGameView();
    play();
    pkg.registry.setEnabled("tick-marker", false);

    pkg.registry.setEnabled("tick-marker", true);
    play();

    expect(markers()).toHaveLength(2);
  });
});

describe("switching the whole package off", () => {
  it("leaves the game's markup as it found it", () => {
    const { panel, pkg, play } = setup();
    panel.game = new FakeGameView();
    play();
    const cells = [...panel.querySelectorAll<HTMLElement>(".troop-cell")];

    pkg.stop();

    expect(document.querySelectorAll(".ofx-tick-marker")).toHaveLength(0);
    expect(
      document.head.querySelectorAll("style[data-openfront-extended-ui]"),
    ).toHaveLength(0);
    expect(cells.map((cell) => cell.getAttribute("style"))).toEqual([
      null,
      null,
    ]);
    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });

  it("stops following the game", () => {
    const { panel, pkg, play, markers } = setup();

    pkg.stop();
    panel.game = new FakeGameView();
    play();

    expect(markers()).toHaveLength(0);
  });
});
