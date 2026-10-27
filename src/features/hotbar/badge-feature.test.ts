import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hotbarReadout } from "./index";
import { createFeatureContext } from "../../runtime/context";
import {
  createFakeControlPanel,
  createFakeHotbar,
  FakeGameView,
  setHotbarPrices,
  type FakeUnitDisplay,
} from "../../test/fakes";

const BADGE = ".ofx-hotbar-badge";
const ICON = ".ofx-hotbar-badge-icon";
const ARROW = ".ofx-hotbar-badge-arrow";

/** Icon boxes along the bottom of an 1600 by 900 screen, 60 px apart. */
const CENTRES: Record<string, { x: number; y: number }> = {
  city: { x: 600, y: 880 },
  factory: { x: 660, y: 880 },
  port: { x: 720, y: 880 },
};

function itemOf(hotbar: FakeUnitDisplay, icon: string): HTMLElement {
  return hotbar.querySelector<HTMLElement>(`img[alt="${icon}"]`)!.parentElement!
    .parentElement!.parentElement!;
}

function setup(options: { seconds?: string | undefined } = {}) {
  const panel = createFakeControlPanel();
  const hotbar = createFakeHotbar();
  for (const [icon, centre] of Object.entries(CENTRES)) {
    itemOf(hotbar, icon).getBoundingClientRect = () =>
      ({
        left: centre.x - 20,
        top: centre.y - 15,
        width: 40,
        height: 30,
      }) as DOMRect;
    hotbar.querySelector<HTMLImageElement>(`img[alt="${icon}"]`)!.src =
      `https://game.test/${icon}.svg`;
  }
  const game = new FakeGameView();
  panel.game = game;
  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
    optionValue: (option: string) => {
      if (option === "breathing") return true;
      if (option === "badge-seconds") return options.seconds ?? "3.5";
      return false;
    },
  });
  const session = hotbarReadout.attach(attached.context);

  return {
    hotbar,
    game,
    detach: attached.detach,
    tick: () => session!.tick!(),
    prices(prices: Record<string, bigint>, gold: bigint) {
      setHotbarPrices(hotbar, prices);
      game.player!.goldHeld = gold;
    },
  };
}

function moveCursor(x: number, y: number): void {
  window.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y }));
}

const badge = () => document.querySelector<HTMLElement>(BADGE)!;
const shown = () => !badge().hidden;

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("when the badge appears", () => {
  it("appears the moment a city becomes affordable", () => {
    const { tick, prices } = setup();
    moveCursor(800, 300);
    prices({ City: 125_000n }, 0n);
    tick();
    expect(shown()).toBe(false);

    prices({ City: 125_000n }, 125_000n);
    tick();

    expect(shown()).toBe(true);
    expect([...document.querySelectorAll<HTMLImageElement>(ICON)].map((i) => i.src)).toEqual([
      "https://game.test/city.svg",
    ]);
  });

  it("does not appear for an icon that was affordable when the readout first looked", () => {
    const { tick, prices } = setup();
    moveCursor(800, 300);
    prices({ City: 125_000n }, 500_000n);

    tick();

    expect(shown()).toBe(false);
  });

  it("does not appear again while the icon stays affordable", () => {
    const { tick, prices } = setup({ seconds: "1" });
    moveCursor(800, 300);
    prices({ City: 125_000n }, 0n);
    tick();
    prices({ City: 125_000n }, 125_000n);
    tick();
    vi.advanceTimersByTime(5000);
    expect(shown()).toBe(false);

    tick();

    expect(shown()).toBe(false);
  });

  it("does not appear before the cursor has moved once", () => {
    const { tick, prices } = setup();
    prices({ City: 125_000n }, 0n);
    tick();
    prices({ City: 125_000n }, 125_000n);

    tick();

    expect(shown()).toBe(false);
  });

  it("draws one badge with both icons when a port and a factory cross together", () => {
    const { tick, prices } = setup();
    moveCursor(800, 300);
    prices({ Factory: 125_000n, Port: 125_000n }, 0n);
    tick();
    prices({ Factory: 125_000n, Port: 125_000n }, 125_000n);

    tick();

    expect(document.querySelectorAll(BADGE)).toHaveLength(1);
    expect([...document.querySelectorAll<HTMLImageElement>(ICON)].map((i) => i.src)).toEqual([
      "https://game.test/factory.svg",
      "https://game.test/port.svg",
    ]);
    // One arrow, aimed between the two icons.
    expect(document.querySelectorAll(ARROW)).toHaveLength(1);
  });
});

describe("where the badge sits", () => {
  it("is 50 pixels below the cursor and centred on its axis", () => {
    const { tick, prices } = setup();
    moveCursor(800, 300);
    prices({ City: 125_000n }, 0n);
    tick();
    prices({ City: 125_000n }, 125_000n);

    tick();

    // jsdom lays nothing out, so the panel measures 0 by 0.
    expect(badge().style.top).toBe("350px");
    expect(badge().style.left).toBe("800px");
  });

  it("stays where it appeared when the cursor moves on", () => {
    const { tick, prices } = setup();
    moveCursor(800, 300);
    prices({ City: 125_000n }, 0n);
    tick();
    prices({ City: 125_000n }, 125_000n);
    tick();

    moveCursor(100, 100);
    tick();

    expect(badge().style.left).toBe("800px");
    expect(badge().style.top).toBe("350px");
  });

  it("points the arrow at the icon, never past 55 degrees", () => {
    const { tick, prices } = setup();
    moveCursor(1500, 700);
    prices({ City: 125_000n }, 0n);
    tick();
    prices({ City: 125_000n }, 125_000n);

    tick();

    const arrow = document.querySelector<HTMLElement>(ARROW)!;
    // The city is far to the left of the cursor and only 180 px below it.
    expect(arrow.style.transform).toBe("rotate(-55deg)");
  });
});

describe("how long the badge stays", () => {
  function showBadge(seconds?: string) {
    const harness = setup({ seconds });
    moveCursor(800, 300);
    harness.prices({ City: 125_000n }, 0n);
    harness.tick();
    harness.prices({ City: 125_000n }, 125_000n);
    harness.tick();
    return harness;
  }

  it("fades after 3.5 seconds when nothing is set", () => {
    showBadge();

    vi.advanceTimersByTime(3499);
    expect(badge().classList.contains("ofx-hotbar-badge-fading")).toBe(false);

    vi.advanceTimersByTime(1);
    expect(badge().classList.contains("ofx-hotbar-badge-fading")).toBe(true);

    vi.advanceTimersByTime(500);
    expect(shown()).toBe(false);
  });

  it("follows the seconds the player set", () => {
    showBadge("6");

    vi.advanceTimersByTime(5999);
    expect(badge().classList.contains("ofx-hotbar-badge-fading")).toBe(false);

    vi.advanceTimersByTime(1);
    expect(badge().classList.contains("ofx-hotbar-badge-fading")).toBe(true);
  });
});

describe("where the badge stands down", () => {
  function ready() {
    const harness = setup();
    moveCursor(800, 300);
    harness.prices({ City: 125_000n }, 0n);
    harness.tick();
    harness.prices({ City: 125_000n }, 125_000n);
    return harness;
  }

  it("draws nothing while the game draws its own crosshair", () => {
    const { tick } = ready();
    const overlay = document.createElement("div");
    overlay.id = "game-input-overlay";
    overlay.style.cursor = "crosshair";
    document.body.append(overlay);

    tick();

    expect(shown()).toBe(false);
  });

  it("takes a shown badge away when the game starts drawing its crosshair", () => {
    const { tick } = ready();
    tick();
    expect(shown()).toBe(true);
    const overlay = document.createElement("div");
    overlay.id = "game-input-overlay";
    overlay.style.cursor = "crosshair";
    document.body.append(overlay);

    tick();

    expect(shown()).toBe(false);
  });

  it("draws nothing in the spawn phase", () => {
    const { tick, game } = ready();
    game.spawnPhase = true;

    tick();

    expect(shown()).toBe(false);
  });

  it("draws nothing when the hotbar has no size, as below 64rem", () => {
    const { tick, hotbar } = ready();
    itemOf(hotbar, "city").getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;

    tick();

    expect(shown()).toBe(false);
  });

  it("draws nothing when it would not fit below the cursor", () => {
    const harness = setup();
    moveCursor(800, 890);
    harness.prices({ City: 125_000n }, 0n);
    harness.tick();
    harness.prices({ City: 125_000n }, 125_000n);

    harness.tick();

    expect(shown()).toBe(false);
  });
});

describe("what happens to the badge when the readout goes", () => {
  it("leaves no node and no timer behind on detach", () => {
    const harness = setup();
    moveCursor(800, 300);
    harness.prices({ City: 125_000n }, 0n);
    harness.tick();
    harness.prices({ City: 125_000n }, 125_000n);
    harness.tick();

    harness.detach();

    expect(document.querySelectorAll(BADGE)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("works again in the next match", () => {
    const first = setup();
    first.detach();
    document.body.replaceChildren();

    const second = setup();
    moveCursor(800, 300);
    second.prices({ City: 125_000n }, 0n);
    second.tick();
    second.prices({ City: 125_000n }, 125_000n);
    second.tick();

    expect(document.querySelectorAll(BADGE)).toHaveLength(1);
    expect(shown()).toBe(true);
  });
});
