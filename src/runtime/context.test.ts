import { describe, expect, it, vi } from "vitest";
import { createFeatureContext } from "./context";
import { createFakeControlPanel, FakeGameView } from "../test/fakes";
import type { ControlPanel } from "../game/types";

function setup() {
  const panel = createFakeControlPanel();
  const game = new FakeGameView();
  panel.game = game;
  return {
    panel,
    game,
    ...createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: (option: string) => option === "percentage",
    }),
  };
}

describe("a feature context", () => {
  it("removes a game event listener on detach, by the reference it registered", () => {
    const { panel, context, detach } = setup();
    class GoldEvent {}
    const handler = vi.fn();

    context.onGameEvent(GoldEvent, handler);
    expect(panel.eventBus.listenerCount()).toBe(1);

    detach();

    expect(panel.eventBus.listenerCount()).toBe(0);
  });

  it("runs every cleanup even when one of them throws", () => {
    const { panel, context, detach } = setup();
    class GoldEvent {}

    context.onGameEvent(GoldEvent, vi.fn());
    const cleanedUp = vi.fn();
    context.onDetach(() => {
      throw new Error("a feature's cleanup is broken");
    });
    context.onDetach(cleanedUp);

    expect(() => detach()).not.toThrow();

    expect(panel.eventBus.listenerCount()).toBe(0);
    expect(cleanedUp).toHaveBeenCalledTimes(1);
  });

  it("keeps a throw from a game event handler away from the game", () => {
    const complaint = vi.spyOn(console, "error").mockImplementation(() => {});
    const { panel, context } = setup();
    class GoldEvent {}
    const laterListener = vi.fn();

    context.onGameEvent(GoldEvent, () => {
      throw new Error("a feature's event handler is broken");
    });
    // The game's own code, queued behind the feature on the shared bus.
    panel.eventBus.on(GoldEvent, laterListener);

    expect(() => panel.eventBus.emit(GoldEvent, new GoldEvent())).not.toThrow();

    expect(laterListener).toHaveBeenCalledTimes(1);
    expect(complaint).toHaveBeenCalled();
  });

  it("says so loudly when there is no event bus to listen on", () => {
    const complaint = vi.spyOn(console, "error").mockImplementation(() => {});
    // Before the first match the panel carries neither a game nor a bus.
    const bare = document.createElement("div") as unknown as ControlPanel;
    const { context } = createFeatureContext({
      panel: bare,
      game: new FakeGameView(),
      optionValue: () => true,
    });
    class GoldEvent {}

    context.onGameEvent(GoldEvent, vi.fn());

    expect(complaint).toHaveBeenCalled();
  });

  it("does nothing on a second detach", () => {
    const { panel, context, detach } = setup();
    class GoldEvent {}
    const handler = vi.fn();

    context.onGameEvent(GoldEvent, handler);
    detach();
    panel.eventBus.on(GoldEvent, handler);

    detach();

    expect(panel.eventBus.listenerCount()).toBe(1);
  });
});

describe("a feature context, listening on the page's own window", () => {
  it("hands the feature every event of that kind", () => {
    const { context } = setup();
    const seen: string[] = [];
    context.onWindowEvent("keydown", (event) => seen.push(event.code));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));

    expect(seen).toEqual(["KeyJ"]);
  });

  it("stops listening on detach", () => {
    const { context, detach } = setup();
    const seen: string[] = [];
    context.onWindowEvent("keydown", (event) => seen.push(event.code));

    detach();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));

    expect(seen).toEqual([]);
  });

  /**
   * `removeEventListener` matches on the capture flag as well as the function,
   * so a listener added one way and removed the other stays registered for the
   * rest of the page's life.
   */
  it("stops listening on detach for a listener in the capture phase", () => {
    const { context, detach } = setup();
    const seen: string[] = [];
    context.onWindowEvent("keydown", (event) => seen.push(event.code), {
      capture: true,
    });

    detach();
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));

    expect(seen).toEqual([]);
  });

  // Nothing a feature does runs outside a try/catch.
  it("catches a throw from the feature's own handler", () => {
    const { context } = setup();
    context.onWindowEvent("keydown", () => {
      throw new Error("this handler is broken");
    });

    expect(() =>
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" })),
    ).not.toThrow();
  });
});

describe("a feature context, reading the feature's own options", () => {
  it("reports what the runtime says about an option", () => {
    const { context } = setup();

    expect(context.isOptionEnabled("percentage")).toBe(true);
    expect(context.isOptionEnabled("ends")).toBe(false);
  });

  // A readout reads its options on every tick, so a player switching one takes
  // effect without the feature being detached and attached again.
  it("reads the option each time it is asked, not once at attach", () => {
    const panel = createFakeControlPanel();
    const game = new FakeGameView();
    let on = false;
    const { context } = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => on,
    });

    expect(context.isOptionEnabled("percentage")).toBe(false);
    on = true;
    expect(context.isOptionEnabled("percentage")).toBe(true);
  });

  it("reports the text of an option that holds a key code", () => {
    const panel = createFakeControlPanel();
    const game = new FakeGameView();
    const { context } = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => "Backquote",
    });

    expect(context.optionText("hold-key")).toBe("Backquote");
  });

  /**
   * A feature asking the wrong way round must get a value it can act on. An
   * empty key code matches no key, and a switch read as off draws nothing.
   */
  it("reports an empty string for an option that holds a switch", () => {
    const panel = createFakeControlPanel();
    const game = new FakeGameView();
    const { context } = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => true,
    });

    expect(context.optionText("percentage")).toBe("");
  });

  it("reports an option that holds text as switched off", () => {
    const panel = createFakeControlPanel();
    const game = new FakeGameView();
    const { context } = createFeatureContext({
      panel: panel.asControlPanel(),
      game,
      optionValue: () => "Backquote",
    });

    expect(context.isOptionEnabled("hold-key")).toBe(false);
  });
});
