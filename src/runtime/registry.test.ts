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

describe("a feature's own options", () => {
  /** A feature that reports what its context says about two option keys. */
  function withOptions(seen: Record<string, boolean>): TestFeature {
    const optioned = feature("troop-bar", {
      attach: (context) => {
        seen.percentage = context.isOptionEnabled("percentage");
      },
    });
    return {
      ...optioned,
      options: [
        { key: "percentage", name: "Share of best rate", whenUnset: true },
        { key: "ends", name: "End lines", whenUnset: false },
      ],
    };
  }

  it("lists what a feature declares, with each option's own default", () => {
    const { registry } = setup([withOptions({})]);

    expect(registry.optionsOf("troop-bar")).toEqual([
      {
        key: "percentage",
        name: "Share of best rate",
        whenUnset: true,
        value: true,
      },
      { key: "ends", name: "End lines", whenUnset: false, value: false },
    ]);
  });

  it("lists nothing for a feature that declares no option", () => {
    const { registry } = setup([feature("troop-bar")]);

    expect(registry.optionsOf("troop-bar")).toEqual([]);
  });

  it("lists nothing for a feature the package does not ship", () => {
    const { registry } = setup([feature("troop-bar")]);

    expect(registry.optionsOf("no-such-feature")).toEqual([]);
  });

  it("hands a running feature the option a player chose", () => {
    const seen: Record<string, boolean> = {};
    const { registry, match } = setup([withOptions(seen)], {
      "troop-bar:percentage": false,
    });

    registry.attachAll(match);

    expect(seen.percentage).toBe(false);
  });

  it("remembers a choice, so it holds into the next match", () => {
    const seen: Record<string, boolean> = {};
    const { registry, match, settings } = setup([withOptions(seen)]);

    registry.setOption("troop-bar", "percentage", false);

    expect(settings.optionValue("troop-bar", "percentage", true)).toBe(false);
    registry.attachAll(match);
    expect(seen.percentage).toBe(false);
  });

  /**
   * A key nothing declares must never reach storage. An option shipped under
   * that key later would start switched off, and nobody would know why.
   */
  it("refuses a key the feature does not declare", () => {
    const { registry, settings } = setup([withOptions({})]);

    registry.setOption("troop-bar", "no-such-option", false);

    expect(settings.optionValue("troop-bar", "no-such-option", true)).toBe(
      true,
    );
  });

  it("refuses an option on a feature the package does not ship", () => {
    const { registry, settings } = setup([withOptions({})]);

    registry.setOption("other", "percentage", false);

    expect(settings.optionValue("other", "percentage", true)).toBe(true);
  });

  /**
   * A switch stored as text reads as the option's own default forever after,
   * so the player sees no change and nothing says why.
   */
  it("refuses a value of the wrong type for the option", () => {
    const { registry, settings } = setup([withOptions({})]);

    registry.setOption("troop-bar", "percentage", "KeyJ");

    expect(settings.optionValue("troop-bar", "percentage", true)).toBe(true);
  });

  it("stores a key code for an option that holds text", () => {
    const keyed: TestFeature = {
      ...feature("alliance-view"),
      options: [{ key: "hold-key", name: "Hold key", whenUnset: "Backquote" }],
    };
    const { registry, settings } = setup([keyed]);

    registry.setOption("alliance-view", "hold-key", "KeyJ");

    expect(settings.optionValue("alliance-view", "hold-key", "Backquote")).toBe(
      "KeyJ",
    );
  });

  it("leaves a running feature attached when one of its options changes", () => {
    const optioned = withOptions({});
    const { registry, match } = setup([optioned]);
    registry.attachAll(match);

    registry.setOption("troop-bar", "percentage", false);

    // A readout reads its options on each tick, so nothing is reattached.
    expect(optioned.attach).toHaveBeenCalledTimes(1);
  });

  // Silence would leave the feature sure it read a real choice.
  it("says so loudly when a feature asks for an option it never declared", () => {
    const complaint = vi.spyOn(console, "error").mockImplementation(() => {});
    const seen: Record<string, boolean> = {};
    const asksForUnknown: TestFeature = {
      ...feature("troop-bar", {
        attach: (context) => {
          seen.unknown = context.isOptionEnabled("never-declared");
        },
      }),
      options: [{ key: "percentage", name: "Share", whenUnset: true }],
    };
    const { registry, match } = setup([asksForUnknown]);

    registry.attachAll(match);

    expect(seen.unknown).toBe(false);
    expect(complaint).toHaveBeenCalled();
    complaint.mockRestore();
  });
});
