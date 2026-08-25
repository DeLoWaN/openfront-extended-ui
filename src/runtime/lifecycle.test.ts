import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startLifecycle, type MatchHandlers } from "./lifecycle";
import {
  createFakeControlPanel,
  FakeControlPanel,
  FakeGameView,
} from "../test/fakes";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Long enough for the boundary poll to have run at least once. */
function letThePollRun() {
  vi.advanceTimersByTime(600);
}

function setup(overrides: Partial<MatchHandlers> = {}) {
  const panel = createFakeControlPanel();
  const handlers: MatchHandlers = {
    onMatchStart: vi.fn(),
    onMatchEnd: vi.fn(),
    onTick: vi.fn(),
    ...overrides,
  };
  const lifecycle = startLifecycle({
    panel: panel.asControlPanel(),
    handlers,
  });
  return { panel, handlers, lifecycle };
}

describe("the match boundary", () => {
  it("starts a match when the game first assigns one to the panel", () => {
    const { panel, handlers } = setup();
    expect(handlers.onMatchStart).not.toHaveBeenCalled();

    panel.game = new FakeGameView();
    letThePollRun();

    expect(handlers.onMatchStart).toHaveBeenCalledTimes(1);
    expect(handlers.onMatchStart).toHaveBeenCalledWith(panel.game);
  });

  it("does not start it again while the same match is running", () => {
    const { panel, handlers } = setup();
    panel.game = new FakeGameView();

    letThePollRun();
    letThePollRun();
    letThePollRun();

    expect(handlers.onMatchStart).toHaveBeenCalledTimes(1);
    expect(handlers.onMatchEnd).not.toHaveBeenCalled();
  });

  it("ends the old match and starts the new one when a second match begins", () => {
    const { panel, handlers } = setup();
    panel.game = new FakeGameView();
    letThePollRun();

    // A second match with no page reload. The game overwrites `.game` in place.
    const second = new FakeGameView();
    panel.game = second;
    letThePollRun();

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onMatchStart).toHaveBeenCalledTimes(2);
    expect(handlers.onMatchStart).toHaveBeenLastCalledWith(second);
  });

  it("ignores the panel having no match, which is how it starts on the home page", () => {
    const { handlers } = setup();

    letThePollRun();

    expect(handlers.onMatchStart).not.toHaveBeenCalled();
    expect(handlers.onMatchEnd).not.toHaveBeenCalled();
  });
});

describe("the tick hook", () => {
  function running(overrides: Partial<MatchHandlers> = {}) {
    const parts = setup(overrides);
    parts.panel.game = new FakeGameView();
    letThePollRun();
    return parts;
  }

  it("runs the package's work when the game's controller loop ticks", () => {
    const { panel, handlers } = running();


    panel.tick();

    expect(handlers.onTick).toHaveBeenCalledTimes(1);
  });

  it("still runs the game's own tick", () => {
    const { panel } = running();

    panel.tick();

    expect(panel.ownTicks).toBe(1);
  });

  it("does not break the game's own tick when the package's work throws", () => {
    const { panel } = running({
      onTick: () => {
        throw new Error("a feature is broken");
      },
    });

    expect(() => panel.tick()).not.toThrow();
    expect(panel.ownTicks).toBe(1);

    // The next tick still works, so one bad tick does not end the match.
    expect(() => panel.tick()).not.toThrow();
    expect(panel.ownTicks).toBe(2);
  });

  it("gives the game back its own tick when the package is switched off", () => {
    const { panel, handlers, lifecycle } = running();

    lifecycle.stop();
    panel.tick();

    expect(handlers.onTick).not.toHaveBeenCalled();
    expect(panel.ownTicks).toBe(1);
    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });

  it("says so loudly when the panel has no tick to hook", () => {
    const complaint = vi.spyOn(console, "error").mockImplementation(() => {});
    const { panel, handlers } = setup();
    // The element is in the page before the game registers the class behind it.
    delete (panel as Partial<FakeControlPanel>).tick;
    Object.setPrototypeOf(panel, HTMLElement.prototype);

    panel.game = new FakeGameView();
    letThePollRun();

    expect(complaint).toHaveBeenCalled();
    expect(handlers.onMatchStart).toHaveBeenCalledTimes(1);
  });

  it("hooks the second match after unhooking the first", () => {
    const { panel, handlers } = running();
    panel.tick();

    panel.game = new FakeGameView();
    letThePollRun();
    panel.tick();

    expect(handlers.onTick).toHaveBeenCalledTimes(2);
    expect(panel.ownTicks).toBe(2);
  });
});

/**
 * Two of the game's exits leave `.game` pointing at the finished match, so the
 * boundary poll never fires for them. Each needs its own signal.
 */
describe("leaving a match by a route that does not change the panel", () => {
  function running() {
    const parts = setup();
    parts.panel.game = new FakeGameView();
    letThePollRun();
    return parts;
  }

  it("ends the match when the page goes away", () => {
    const { panel, handlers } = running();

    window.dispatchEvent(new Event("pagehide"));

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });

  it("ends the match when the game goes back to the lobby without reloading", () => {
    const { panel, handlers } = running();

    document.dispatchEvent(new Event("leave-lobby"));

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(panel, "tick")).toBe(false);
  });

  it("ends the match once, not once per signal", () => {
    const { handlers } = running();

    document.dispatchEvent(new Event("leave-lobby"));
    window.dispatchEvent(new Event("pagehide"));

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
  });

  it("does not pick the finished match back up on the next poll", () => {
    const { handlers } = running();

    document.dispatchEvent(new Event("leave-lobby"));
    letThePollRun();
    letThePollRun();

    // `.game` still points at the match that just ended. Reading it as a new
    // match would attach every feature to a dead GameView.
    expect(handlers.onMatchStart).toHaveBeenCalledTimes(1);
  });

  it("picks the same match back up when the page returns from the back/forward cache", () => {
    const { panel, handlers } = running();

    // The browser fires `pagehide` when it caches the page, and the very same
    // page can come back alive with the very same match still running.
    window.dispatchEvent(new Event("pagehide"));
    letThePollRun();

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onMatchStart).toHaveBeenCalledTimes(2);
    expect(Object.hasOwn(panel, "tick")).toBe(true);
  });

  it("does not pick a finished match up when the page is cached after a lobby return", () => {
    const { handlers } = running();
    document.dispatchEvent(new Event("leave-lobby"));

    window.dispatchEvent(new Event("pagehide"));
    letThePollRun();

    expect(handlers.onMatchStart).toHaveBeenCalledTimes(1);
  });

  it("starts the next match after a lobby return, although `.game` never changed", () => {
    const { panel, handlers } = running();
    document.dispatchEvent(new Event("leave-lobby"));

    panel.game = new FakeGameView();
    letThePollRun();

    expect(handlers.onMatchStart).toHaveBeenCalledTimes(2);
  });
});

describe("switching the package off", () => {
  it("stops watching for a match", () => {
    const { panel, handlers, lifecycle } = setup();

    lifecycle.stop();
    panel.game = new FakeGameView();
    letThePollRun();

    expect(handlers.onMatchStart).not.toHaveBeenCalled();
  });

  it("ends a match that is still running", () => {
    const { panel, handlers, lifecycle } = setup();
    panel.game = new FakeGameView();
    letThePollRun();

    lifecycle.stop();

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
  });

  it("stops listening for the exit signals", () => {
    const { panel, handlers, lifecycle } = setup();
    panel.game = new FakeGameView();
    letThePollRun();

    lifecycle.stop();
    document.dispatchEvent(new Event("leave-lobby"));
    window.dispatchEvent(new Event("pagehide"));

    expect(handlers.onMatchEnd).toHaveBeenCalledTimes(1);
  });
});
