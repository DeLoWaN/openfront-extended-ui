import { describe, expect, it, vi } from "vitest";
import { createConsoleHandle } from "./console";
import { createRegistry } from "./registry";
import { createSettings } from "./settings";
import type { Feature } from "./feature";
import { createFakeControlPanel, FakeGameView } from "../test/fakes";

function feature(id: string, name: string): Feature {
  return { id, name, attach: vi.fn() };
}

function setup(features: Feature[] = []) {
  let stored = "{}";
  const registry = createRegistry({
    features,
    settings: createSettings({
      read: () => stored,
      write: (value) => {
        stored = value;
      },
    }),
  });
  const stop = vi.fn();
  const panel = createFakeControlPanel();
  const game = new FakeGameView();
  return {
    registry,
    stop,
    handle: createConsoleHandle({ registry, stop }),
    match: { panel: panel.asControlPanel(), game },
  };
}

describe("what a player can reach from the console", () => {
  it("lists every feature with a name and whether it is on", () => {
    const { handle } = setup([feature("troop-bar", "Troop bar")]);

    expect(handle.list()).toEqual([
      { id: "troop-bar", name: "Troop bar", enabled: true },
    ]);
  });

  it("shows a feature as off after it is switched off", () => {
    const { handle } = setup([feature("troop-bar", "Troop bar")]);

    handle.disable("troop-bar");

    expect(handle.list()[0]!.enabled).toBe(false);
  });

  it("switches a feature back on", () => {
    const { handle } = setup([feature("troop-bar", "Troop bar")]);
    handle.disable("troop-bar");

    handle.enable("troop-bar");

    expect(handle.list()[0]!.enabled).toBe(true);
  });

  it("detaches a running feature the moment it is switched off", () => {
    const cleanup = vi.fn();
    const troopBar: Feature = {
      id: "troop-bar",
      name: "Troop bar",
      attach: (context) => context.onDetach(cleanup),
    };
    const { handle, registry, match } = setup([troopBar]);
    registry.attachAll(match);

    handle.disable("troop-bar");

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("ignores an id that belongs to no feature", () => {
    const { handle } = setup([feature("troop-bar", "Troop bar")]);

    expect(() => handle.disable("no-such-feature")).not.toThrow();
    expect(handle.list()).toHaveLength(1);
  });

  it("hands the whole package's teardown to the caller", () => {
    const { handle, stop } = setup();

    handle.stop();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
