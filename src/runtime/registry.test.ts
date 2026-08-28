import { describe, expect, it, vi, type Mock } from "vitest";
import { createRegistry } from "./registry";
import { createSettings } from "./settings";
import type { Feature } from "./feature";
import type { FeatureContext } from "./context";
import { createFakeControlPanel, FakeGameView } from "../test/fakes";

/**
 * A feature whose attach and tick can both be watched.
 *
 * `tick` belongs to the session a feature returns from `attach`, so it is
 * reachable here as `tickSpy` rather than as a property of the feature.
 */
type TestFeature = Feature & { readonly tickSpy: Mock };

function feature(
  id: string,
  overrides: {
    attach?: (context: FeatureContext) => void;
    tick?: () => void;
    noTick?: boolean;
  } = {},
): TestFeature {
  const tickSpy = vi.fn(overrides.tick);
  return {
    id,
    name: id,
    attach: vi.fn((context: FeatureContext) => {
      overrides.attach?.(context);
      return overrides.noTick ? undefined : { tick: tickSpy };
    }),
    tickSpy,
  };
}

function memorySettings(stored: Record<string, boolean> = {}) {
  let raw = JSON.stringify(stored);
  return createSettings({
    read: () => raw,
    write: (value) => {
      raw = value;
    },
  });
}

function setup(features: TestFeature[], stored: Record<string, boolean> = {}) {
  const panel = createFakeControlPanel();
  const game = new FakeGameView();
  panel.game = game;
  const settings = memorySettings(stored);
  const registry = createRegistry({ features, settings });
  const match = { panel: panel.asControlPanel(), game };
  return { registry, match, settings, panel, game };
}

describe("starting a match", () => {
  it("attaches the features that are switched on", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);

    registry.attachAll(match);

    expect(troopBar.attach).toHaveBeenCalledTimes(1);
  });

  it("leaves a switched-off feature alone", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar], { "troop-bar": false });

    registry.attachAll(match);

    expect(troopBar.attach).not.toHaveBeenCalled();
  });

  it("hands each feature the match it is attaching to", () => {
    const troopBar = feature("troop-bar");
    const { registry, match, game } = setup([troopBar]);

    registry.attachAll(match);

    const context = vi.mocked(troopBar.attach).mock.calls[0]![0];
    expect(context.game).toBe(game);
  });

  it("attaches the rest when one feature fails to attach", () => {
    const broken = feature("broken", {
      attach: () => {
        throw new Error("this feature is broken");
      },
    });
    const working = feature("working");
    const { registry, match } = setup([broken, working]);

    expect(() => registry.attachAll(match)).not.toThrow();
    expect(working.attach).toHaveBeenCalledTimes(1);
  });

  it("undoes what a feature took from the page before it failed to attach", () => {
    const cleanup = vi.fn();
    const broken = feature("broken", {
      attach: (context) => {
        context.onDetach(cleanup);
        throw new Error("this feature is broken");
      },
    });
    const { registry, match } = setup([broken]);

    registry.attachAll(match);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not tick a feature that failed to attach", () => {
    const broken = feature("broken", {
      attach: () => {
        throw new Error("this feature is broken");
      },
    });
    const { registry, match } = setup([broken]);
    registry.attachAll(match);

    registry.tickAll();

    expect(broken.tickSpy).not.toHaveBeenCalled();
  });
});

describe("each game tick", () => {
  it("ticks every attached feature", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);

    registry.tickAll();

    expect(troopBar.tickSpy).toHaveBeenCalledTimes(1);
  });

  it("does not tick a feature that never attached", () => {
    const troopBar = feature("troop-bar");
    const { registry } = setup([troopBar]);

    registry.tickAll();

    expect(troopBar.tickSpy).not.toHaveBeenCalled();
  });

  it("ticks the rest when one feature throws", () => {
    const broken = feature("broken", {
      tick: () => {
        throw new Error("this feature is broken");
      },
    });
    const working = feature("working");
    const { registry, match } = setup([broken, working]);
    registry.attachAll(match);

    expect(() => registry.tickAll()).not.toThrow();
    expect(working.tickSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps ticking the broken feature, because one bad tick is not a broken feature", () => {
    const broken = feature("broken", {
      tick: () => {
        throw new Error("this feature is broken");
      },
    });
    const { registry, match } = setup([broken]);
    registry.attachAll(match);

    registry.tickAll();
    registry.tickAll();

    expect(broken.tickSpy).toHaveBeenCalledTimes(2);
  });

  it("accepts a feature with nothing to do on a tick", () => {
    const quiet = feature("quiet", { noTick: true });
    const { registry, match } = setup([quiet]);
    registry.attachAll(match);

    expect(() => registry.tickAll()).not.toThrow();
  });
});

describe("ending a match", () => {
  it("undoes what each feature took from the page", () => {
    const cleanup = vi.fn();
    const troopBar = feature("troop-bar", {
      attach: (context) => context.onDetach(cleanup),
    });
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);

    registry.detachAll();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("stops ticking the features", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);
    registry.detachAll();

    registry.tickAll();

    expect(troopBar.tickSpy).not.toHaveBeenCalled();
  });

  it("attaches again for the next match", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);
    registry.detachAll();

    registry.attachAll(match);

    expect(troopBar.attach).toHaveBeenCalledTimes(2);
  });

  it("gives the next match its own context, so nothing carries over", () => {
    const troopBar = feature("troop-bar");
    const { registry, match, game } = setup([troopBar]);
    registry.attachAll(match);
    registry.detachAll();

    const second = new FakeGameView();
    registry.attachAll({ panel: match.panel, game: second });

    const calls = vi.mocked(troopBar.attach).mock.calls;
    expect(calls[0]![0].game).toBe(game);
    expect(calls[1]![0].game).toBe(second);
  });
});

describe("switching a feature off while a match is running", () => {
  it("undoes what that feature took from the page, right away", () => {
    const cleanup = vi.fn();
    const troopBar = feature("troop-bar", {
      attach: (context) => context.onDetach(cleanup),
    });
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);

    registry.setEnabled("troop-bar", false);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("stops ticking it", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);
    registry.setEnabled("troop-bar", false);

    registry.tickAll();

    expect(troopBar.tickSpy).not.toHaveBeenCalled();
  });

  it("leaves the other features running", () => {
    const troopBar = feature("troop-bar");
    const income = feature("income");
    const { registry, match } = setup([troopBar, income]);
    registry.attachAll(match);

    registry.setEnabled("troop-bar", false);
    registry.tickAll();

    expect(income.tickSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps it off in the next match", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);
    registry.setEnabled("troop-bar", false);
    registry.detachAll();

    registry.attachAll(match);

    expect(troopBar.attach).toHaveBeenCalledTimes(1);
  });
});

describe("switching a feature back on", () => {
  it("attaches it without waiting for the next match", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar], { "troop-bar": false });
    registry.attachAll(match);

    registry.setEnabled("troop-bar", true);

    expect(troopBar.attach).toHaveBeenCalledTimes(1);
  });

  it("waits for a match when none is running", () => {
    const troopBar = feature("troop-bar");
    const { registry } = setup([troopBar], { "troop-bar": false });

    registry.setEnabled("troop-bar", true);

    expect(troopBar.attach).not.toHaveBeenCalled();
    expect(registry.isEnabled("troop-bar")).toBe(true);
  });

  it("does not attach it twice when it is already running", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar]);
    registry.attachAll(match);

    registry.setEnabled("troop-bar", true);

    expect(troopBar.attach).toHaveBeenCalledTimes(1);
  });

  it("does not attach again after the match it was switched on in has ended", () => {
    const troopBar = feature("troop-bar");
    const { registry, match } = setup([troopBar], { "troop-bar": false });
    registry.attachAll(match);
    registry.detachAll();

    registry.setEnabled("troop-bar", true);

    expect(troopBar.attach).not.toHaveBeenCalled();
  });
});

describe("switching a feature that the package does not ship", () => {
  it("writes nothing, so a feature shipped under that id later starts on", () => {
    const write = vi.fn();
    const settings = createSettings({ read: () => null, write });
    const registry = createRegistry({
      features: [feature("troop-bar")],
      settings,
    });

    registry.setEnabled("no-such-feature", false);

    expect(write).not.toHaveBeenCalled();
    expect(registry.isEnabled("no-such-feature")).toBe(true);
  });
});
