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
      isOptionEnabled: (option) => option === "percentage",
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
      isOptionEnabled: () => true,
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
      isOptionEnabled: () => on,
    });

    expect(context.isOptionEnabled("percentage")).toBe(false);
    on = true;
    expect(context.isOptionEnabled("percentage")).toBe(true);
  });
});
