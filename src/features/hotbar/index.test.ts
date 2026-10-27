import { describe, expect, it } from "vitest";
import { hotbarReadout } from "./index";
import { createFeatureContext } from "../../runtime/context";
import {
  createFakeControlPanel,
  createFakeHotbar,
  FakeGameView,
  setHotbarPrices,
  type FakeUnitDisplay,
} from "../../test/fakes";

const LIGHT = ".ofx-hotbar-light";
const MARKS = ".ofx-hotbar-marks";
const MARK = ".ofx-hotbar-mark";
const LIT = "ofx-hotbar-mark-lit";

function setup(options: { breathing?: boolean } = {}) {
  const panel = createFakeControlPanel();
  const hotbar = createFakeHotbar();
  const game = new FakeGameView();
  panel.game = game;
  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
    optionValue: (option: string) =>
      option === "breathing" ? (options.breathing ?? true) : false,
  });
  const session = hotbarReadout.attach(attached.context);

  return {
    hotbar,
    game,
    detach: attached.detach,
    tick: () => session!.tick!(),
    /** Prices the three cued items and gives the player some gold. */
    match: (prices: Record<string, bigint>, gold: bigint) => {
      setHotbarPrices(hotbar, prices);
      game.player!.goldHeld = gold;
    },
  };
}

/** The cue drawn under one icon, read back out of the page. */
function cueOf(hotbar: FakeUnitDisplay, icon: string) {
  const item = hotbar.querySelector<HTMLElement>(`img[alt="${icon}"]`)
    ?.parentElement?.parentElement?.parentElement;
  return {
    light: item!.querySelector<HTMLElement>(LIGHT),
    marks: item!.querySelector<HTMLElement>(MARKS),
    lit: [...item!.querySelectorAll(MARK)].filter((mark) =>
      mark.classList.contains(LIT),
    ).length,
  };
}

const lights = () => document.querySelectorAll(LIGHT);
const markRows = () => document.querySelectorAll(MARKS);

describe("where the hotbar readout draws", () => {
  it("draws nothing before the match is live", () => {
    const { game, tick } = setup();
    game.spawnPhase = true;

    tick();

    expect(lights()).toHaveLength(0);
    expect(markRows()).toHaveLength(0);
  });

  it("draws under the city, the factory and the port", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);

    tick();

    for (const icon of ["city", "factory", "port"]) {
      const cue = cueOf(hotbar, icon);
      expect(cue.light).not.toBeNull();
      expect(cue.marks).not.toBeNull();
    }
  });

  it("leaves the other seven icons alone", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);

    tick();

    for (const icon of ["defense_post", "missile_silo", "warship", "mirv"]) {
      expect(cueOf(hotbar, icon).light).toBeNull();
    }
    expect(lights()).toHaveLength(3);
  });

  /**
   * The light covers the icon's box and the marks sit under it. Both are
   * placed against the item, which the game already positions, so the readout
   * writes no property on anything of the game's.
   */
  it("writes no property on the game's own markup", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);

    tick();

    const item = hotbar.querySelector<HTMLElement>(".relative")!;
    expect(item.getAttribute("style")).toBeNull();
    expect(item.firstElementChild!.getAttribute("style")).toBeNull();
  });

  it("draws three marks under each icon, one per price step", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);

    tick();

    expect(hotbar.querySelectorAll(`${MARKS} ${MARK}`)).toHaveLength(9);
  });
});

describe("the step marks", () => {
  it("lights one mark at the first price", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);

    tick();

    expect(cueOf(hotbar, "city").lit).toBe(1);
  });

  it("lights two at the second price and three at the third", () => {
    const { tick, hotbar, match } = setup();

    match({ City: 250_000n }, 0n);
    tick();
    expect(cueOf(hotbar, "city").lit).toBe(2);

    match({ City: 500_000n }, 0n);
    tick();
    expect(cueOf(hotbar, "city").lit).toBe(3);
  });

  // Losing a structure lowers the price pool, so the next one gets cheaper.
  it("follows a price that falls", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 500_000n }, 0n);
    tick();

    match({ City: 250_000n }, 0n);
    tick();

    expect(cueOf(hotbar, "city").lit).toBe(2);
  });

  it("goes light grey while you cannot build, and amber once you can", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 250_000n }, 100_000n);
    tick();
    expect(cueOf(hotbar, "city").marks!.classList).not.toContain(
      "ofx-hotbar-marks-ready",
    );

    match({ City: 250_000n }, 250_000n);
    tick();

    expect(cueOf(hotbar, "city").marks!.classList).toContain(
      "ofx-hotbar-marks-ready",
    );
  });

  // Three full marks that will never move again say nothing. Their absence is
  // what tells a player the cheap window is over.
  it("hides the marks once the price reaches one million", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 500_000n }, 0n);
    tick();

    match({ City: 1_000_000n }, 0n);
    tick();

    expect(cueOf(hotbar, "city").marks!.classList).toContain(
      "ofx-hotbar-marks-off",
    );
  });

  it("brings the marks back when a lost structure drops the price under the cap", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 1_000_000n }, 0n);
    tick();

    match({ City: 500_000n }, 0n);
    tick();

    const cue = cueOf(hotbar, "city");
    expect(cue.marks!.classList).not.toContain("ofx-hotbar-marks-off");
    expect(cue.lit).toBe(3);
  });

  // A port and a factory share one price pool, so building either one raises
  // the price of both. The cue draws each price as the game reports it.
  it("draws a port and a factory at their own prices", () => {
    const { tick, hotbar, match } = setup();

    match({ Port: 250_000n, Factory: 250_000n, City: 125_000n }, 0n);
    tick();

    expect(cueOf(hotbar, "port").lit).toBe(2);
    expect(cueOf(hotbar, "factory").lit).toBe(2);
    expect(cueOf(hotbar, "city").lit).toBe(1);
  });

  it("draws no step before the game has sent its first prices", () => {
    const { tick, hotbar } = setup();

    tick();

    const cue = cueOf(hotbar, "city");
    expect(cue.lit).toBe(0);
    expect(cue.marks!.classList).toContain("ofx-hotbar-marks-off");
  });
});

describe("the light", () => {
  it("stays out while you cannot afford the thing", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 124_999n);

    tick();

    expect(cueOf(hotbar, "city").light!.className).toBe("ofx-hotbar-light");
  });

  it("fires the moment the icon becomes buildable", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);
    tick();

    match({ City: 125_000n }, 125_000n);
    tick();

    expect(cueOf(hotbar, "city").light!.classList).toContain(
      "ofx-hotbar-light-breathing",
    );
  });

  it("keeps the same light running while nothing changes", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 900_000n);
    tick();
    const before = cueOf(hotbar, "city").light!.dataset.ofxLit;

    tick();
    tick();

    expect(cueOf(hotbar, "city").light!.dataset.ofxLit).toBe(before);
  });

  /**
   * With 900,000 in hand you can build three cities in a row. The light fires
   * for 125,000, fires again at 250,000, and again at 500,000. The price step
   * the light runs at is what says a new one has started.
   */
  it("fires again at every price step you can still afford", () => {
    const { tick, hotbar, match } = setup();
    const lit = () => cueOf(hotbar, "city").light!.dataset.ofxLit;

    match({ City: 125_000n }, 900_000n);
    tick();
    expect(lit()).toBe("1");

    match({ City: 250_000n }, 775_000n);
    tick();
    expect(lit()).toBe("2");

    match({ City: 500_000n }, 525_000n);
    tick();
    expect(lit()).toBe("3");
  });

  it("goes out once you have spent the gold", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 125_000n);
    tick();

    match({ City: 250_000n }, 0n);
    tick();

    const light = cueOf(hotbar, "city").light!;
    expect(light.className).toBe("ofx-hotbar-light");
    expect(light.dataset.ofxLit).toBeUndefined();
  });

  // Past the cap the price never moves again, so a light that is on whenever
  // you hold a million would say nothing about a decision.
  it("stays out once the price reaches one million, however much gold you hold", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 1_000_000n }, 9_000_000n);

    tick();

    expect(cueOf(hotbar, "city").light!.className).toBe("ofx-hotbar-light");
  });

  it("fires on its own for each of the three icons", () => {
    const { tick, hotbar, match } = setup();

    match({ City: 125_000n, Port: 250_000n, Factory: 250_000n }, 125_000n);
    tick();

    expect(cueOf(hotbar, "city").light!.dataset.ofxLit).toBe("1");
    expect(cueOf(hotbar, "port").light!.dataset.ofxLit).toBeUndefined();
  });
});

describe("the breathing pulse, which can be switched off on its own", () => {
  it("holds the light steady after the pulses when it is off", () => {
    const { tick, hotbar, match } = setup({ breathing: false });
    match({ City: 125_000n }, 125_000n);

    tick();

    const light = cueOf(hotbar, "city").light!;
    expect(light.classList).toContain("ofx-hotbar-light-steady");
    expect(light.classList).not.toContain("ofx-hotbar-light-breathing");
  });

  it("keeps the step marks when it is off", () => {
    const { tick, hotbar, match } = setup({ breathing: false });
    match({ City: 250_000n }, 250_000n);

    tick();

    const cue = cueOf(hotbar, "city");
    expect(cue.lit).toBe(2);
    expect(cue.marks!.classList).toContain("ofx-hotbar-marks-ready");
  });

  it("changes a light already running when a player switches it mid-match", () => {
    let breathing = true;
    const panel = createFakeControlPanel();
    const hotbar = createFakeHotbar();
    const game = new FakeGameView();
    panel.game = game;
    const attached = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => breathing,
    });
    const session = hotbarReadout.attach(attached.context)!;
    setHotbarPrices(hotbar, { City: 125_000n });
    game.player!.goldHeld = 125_000n;
    session.tick!();
    expect(cueOf(hotbar, "city").light!.classList).toContain(
      "ofx-hotbar-light-breathing",
    );

    breathing = false;
    session.tick!();

    expect(cueOf(hotbar, "city").light!.classList).toContain(
      "ofx-hotbar-light-steady",
    );
  });
});

describe("the hotbar readout, as a match starts and ends", () => {
  it("takes the readout away when the player dies, as the game's own hotbar does", () => {
    const { game, tick, match } = setup();
    match({ City: 125_000n }, 0n);
    tick();

    game.player!.alive = false;
    tick();

    expect(lights()).toHaveLength(0);
    expect(markRows()).toHaveLength(0);
  });

  /**
   * Lit redraws the hotbar ten times a second, and the game empties it between
   * matches. Both take the cue's nodes out of the page with no error and no
   * event, so every tick checks rather than trusts.
   */
  it("draws again after the game takes its nodes back out", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);
    tick();

    for (const node of document.querySelectorAll(LIGHT)) node.remove();
    tick();

    expect(lights()).toHaveLength(3);
    expect(cueOf(hotbar, "city").lit).toBe(1);
  });

  it("draws again after the game redraws the whole hotbar for a new match", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);
    tick();

    hotbar.fill();
    setHotbarPrices(hotbar, { City: 250_000n });
    tick();

    expect(lights()).toHaveLength(3);
    expect(cueOf(hotbar, "city").lit).toBe(2);
  });

  // The light holds the price step it runs at on its own node, so a redrawn
  // node fires again instead of coming back dark for the rest of the match.
  it("lights a redrawn icon again", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 125_000n);
    tick();

    hotbar.fill();
    tick();

    expect(cueOf(hotbar, "city").light!.dataset.ofxLit).toBe("1");
  });

  /**
   * A lobby can disable a city, a factory or a port on its own, and the game
   * then draws no icon for it. The other two keep their readout.
   */
  it("draws under the icons the lobby left, when one is disabled", () => {
    const { tick, hotbar, match } = setup();
    hotbar.querySelector('img[alt="factory"]')!.closest(".relative")!.remove();
    match({ City: 125_000n, Port: 250_000n }, 0n);

    tick();

    expect(lights()).toHaveLength(2);
    expect(cueOf(hotbar, "city").lit).toBe(1);
    expect(cueOf(hotbar, "port").lit).toBe(2);
  });

  it("draws nothing while the game has emptied the hotbar", () => {
    const { tick, hotbar, match } = setup();
    match({ City: 125_000n }, 0n);
    tick();

    hotbar.replaceChildren();
    tick();

    expect(lights()).toHaveLength(0);
  });

  it("leaves no trace when the match ends", () => {
    const { tick, hotbar, match, detach } = setup();
    match({ City: 125_000n }, 125_000n);
    tick();

    detach();

    expect(lights()).toHaveLength(0);
    expect(markRows()).toHaveLength(0);
    const item = hotbar.querySelector<HTMLElement>(".relative")!;
    expect(item.children).toHaveLength(1);
    expect(item.getAttribute("style")).toBeNull();
  });
});

describe("what the hotbar readout offers a player", () => {
  // A stored choice is written against the id and the option key, so neither
  // can change once a version ships.
  it("is stored under the id a player switches it off by", () => {
    expect(hotbarReadout.id).toBe("hotbar");
  });

  it("declares the breathing pulse as an option that is on by default", () => {
    expect(hotbarReadout.options).toContainEqual({
      key: "breathing",
      name: "Breathing pulse",
      whenUnset: true,
    });
  });

  it("declares how long the badge stays, 3.5 seconds when nothing is set", () => {
    expect(hotbarReadout.options).toContainEqual({
      key: "badge-seconds",
      name: "Seconds the badge stays",
      whenUnset: "3.5",
    });
  });
});
