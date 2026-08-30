import { describe, expect, it } from "vitest";
import { troopBar } from "./index";
import { PLATEAU, shareOfBestRate } from "./regeneration";
import { createFeatureContext } from "../../runtime/context";
import {
  addTroopBars,
  createFakeControlPanel,
  FakeGameView,
  setTroopBarFill,
} from "../../test/fakes";

const STRIP = ".ofx-troop-strip";
const SHARE = ".ofx-troop-share";

function setup(options: { percentage?: boolean } = {}) {
  const panel = createFakeControlPanel();
  const bars = addTroopBars(panel, 2);
  const game = new FakeGameView();
  panel.game = game;
  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
    optionValue: (option: string) =>
      option === "percentage" ? (options.percentage ?? true) : false,
  });
  const session = troopBar.attach(attached.context);
  return {
    panel,
    bars,
    game,
    detach: attached.detach,
    tick: () => session!.tick!(),
    level: (value: number, committed = 0) => {
      for (const bar of bars) setTroopBarFill(bar, value, committed);
    },
  };
}

const strips = () => document.querySelectorAll<HTMLElement>(STRIP);
const shares = () => document.querySelectorAll<HTMLElement>(SHARE);

describe("the troop bar readout", () => {
  it("draws nothing before the match is live", () => {
    const { game, tick } = setup();
    game.spawnPhase = true;

    tick();

    expect(strips()).toHaveLength(0);
    expect(shares()).toHaveLength(0);
  });

  it("marks the plateau on the wide bar and the narrow bar, which are both in the page", () => {
    const { tick, level } = setup();
    level(0.4);

    tick();

    expect(strips()).toHaveLength(2);
    expect(shares()).toHaveLength(2);
  });

  /**
   * The bar lists its fills first and its troop numbers second, and nothing in
   * it sets a `z-index`. Sitting between the two is what puts the readout over
   * the fills and under the numbers. See docs/adr/0004.
   */
  it("puts its nodes between the bar's fills and the bar's troop numbers", () => {
    const { tick, level, bars } = setup();
    level(0.4);

    tick();

    const drawn = [...bars[0]!.children].map((child) => child.className);
    expect(drawn[0]).toContain("relative h-full");
    expect(drawn[1]).toContain("ofx-troop-strip");
    expect(drawn[2]).toContain("ofx-troop-share");
    expect(drawn[3]).toContain("pointer-events-none");
  });

  /**
   * This is the claim ADR-0004 makes about the whole readout. The bar is
   * already positioned and already clips its overflow, so nothing has to be
   * written on it, and switching the readout off has nothing to undo.
   */
  it("writes no property on the game's bar", () => {
    const { tick, level, bars } = setup();
    level(0.4);

    tick();

    expect(bars[0]!.getAttribute("style")).toBeNull();
  });

  it("spans the strip across the plateau", () => {
    const { tick, level } = setup();
    level(0.4);

    tick();

    const strip = strips()[0]!;
    expect(Number.parseFloat(strip.style.left)).toBeCloseTo(PLATEAU.lo * 100, 3);
    expect(Number.parseFloat(strip.style.width)).toBeCloseTo(
      (PLATEAU.hi - PLATEAU.lo) * 100,
      3,
    );
  });

  it("leaves the strip where it is as the troop level moves", () => {
    const { tick, level } = setup();
    level(0.1);
    tick();
    const before = strips()[0]!.style.left;

    level(0.9);
    tick();

    expect(strips()[0]!.style.left).toBe(before);
  });
});

describe("the share of best rate", () => {
  it("prints the share for the level the bar draws", () => {
    const { tick, level } = setup();
    level(0.422);

    tick();

    expect(shares()[0]!.textContent).toBe("100%");
  });

  it("follows the troop level as the match runs", () => {
    const { tick, level } = setup();
    level(0.422);
    tick();

    level(0.8);
    tick();

    const expected = Math.round(shareOfBestRate(0.8) * 100);
    expect(shares()[0]!.textContent).toBe(`${expected}%`);
    expect(expected).toBe(55);
  });

  it("counts up, so the good end is the big number", () => {
    const { tick, level } = setup();

    level(0.9);
    tick();
    const far = Number.parseInt(shares()[0]!.textContent!, 10);

    level(0.422);
    tick();
    const best = Number.parseInt(shares()[0]!.textContent!, 10);

    expect(best).toBeGreaterThan(far);
    expect(best).toBe(100);
  });

  // Committed troops leave your pool the moment an attack launches, so they
  // stop feeding regeneration. Launching an attack raises the share.
  it("ignores committed troops, so launching an attack raises the share", () => {
    const { tick, level } = setup();
    level(0.9);
    tick();
    const before = Number.parseInt(shares()[0]!.textContent!, 10);

    // Half the army leaves for an attack. The bar still draws it, in its
    // second fill.
    level(0.45, 0.45);
    tick();

    expect(Number.parseInt(shares()[0]!.textContent!, 10)).toBeGreaterThan(before);
  });

  it("prints nothing when the troop level cannot be read", () => {
    const { tick } = setup();

    tick();

    expect(shares()[0]!.textContent).toBe("");
  });

  it("can be switched off, which leaves the strip alone", () => {
    const { tick, level } = setup({ percentage: false });
    level(0.4);

    tick();

    expect(shares()[0]!.classList.contains("ofx-hidden")).toBe(true);
    expect(strips()[0]!.classList.contains("ofx-hidden")).toBe(false);
  });

  it("comes back when it is switched on again, without the match restarting", () => {
    let percentage = false;
    const panel = createFakeControlPanel();
    const bars = addTroopBars(panel, 1);
    const game = new FakeGameView();
    panel.game = game;
    const attached = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => percentage,
    });
    const session = troopBar.attach(attached.context)!;
    setTroopBarFill(bars[0]!, 0.4);
    session.tick!();
    expect(shares()[0]!.classList.contains("ofx-hidden")).toBe(true);

    percentage = true;
    session.tick!();

    expect(shares()[0]!.classList.contains("ofx-hidden")).toBe(false);
  });
});

describe("the troop bar readout, as a match starts and ends", () => {
  it("takes the readout away when the player dies, as the game's own HUD does", () => {
    const { game, tick, level } = setup();
    level(0.4);
    tick();

    game.player!.alive = false;
    tick();

    expect(strips()).toHaveLength(0);
    expect(shares()).toHaveLength(0);
  });

  it("draws again when a live player comes back", () => {
    const { game, tick, level } = setup();
    level(0.4);
    tick();
    game.player!.alive = false;
    tick();

    game.player!.alive = true;
    tick();

    expect(strips()).toHaveLength(2);
  });

  /**
   * `<control-panel>` never clears its own render region today. If the game
   * ever adds an early exit to its `render()`, the readout disappears with no
   * error and no event, so every tick checks rather than trusts.
   */
  it("draws again after the game takes its nodes back out", () => {
    const { tick, level, bars } = setup();
    level(0.4);
    tick();

    for (const bar of bars) bar.querySelector(STRIP)!.remove();
    tick();

    expect(strips()).toHaveLength(2);
  });

  it("leaves no trace when the match ends", () => {
    const { tick, level, detach, bars } = setup();
    level(0.4);
    tick();

    detach();

    expect(strips()).toHaveLength(0);
    expect(shares()).toHaveLength(0);
    expect(bars[0]!.getAttribute("style")).toBeNull();
    expect(bars[0]!.children).toHaveLength(2);
  });
});

describe("what the readout offers a player", () => {
  it("declares the share of best rate as an option that is on by default", () => {
    expect(troopBar.options).toEqual([
      { key: "percentage", name: "Share of best rate", whenUnset: true },
    ]);
  });
});
