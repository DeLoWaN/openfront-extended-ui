import { beforeEach, describe, expect, it } from "vitest";
import { createSettings, type SettingsStore } from "./settings";

/** A store that keeps one string, standing in for `localStorage`. */
function memoryStore(initial: string | null = null): SettingsStore {
  let raw = initial;
  return {
    read: () => raw,
    write: (value) => {
      raw = value;
    },
  };
}

describe("settings", () => {
  it("reports a feature as on when nothing has been stored", () => {
    const settings = createSettings(memoryStore());

    expect(settings.isEnabled("troop-bar")).toBe(true);
  });

  it("remembers a feature being switched off", () => {
    const store = memoryStore();
    const settings = createSettings(store);

    settings.setEnabled("troop-bar", false);

    expect(settings.isEnabled("troop-bar")).toBe(false);
    expect(createSettings(store).isEnabled("troop-bar")).toBe(false);
  });

  it("leaves the other features alone when one is switched off", () => {
    const settings = createSettings(memoryStore());

    settings.setEnabled("troop-bar", false);

    expect(settings.isEnabled("income")).toBe(true);
  });
});

describe("settings, when the stored value is unusable", () => {
  const unusable = ["not json at all", "[1,2,3]", "null", '"a string"', "7"];

  it.each(unusable)("falls back to every feature on, for %s", (stored) => {
    const settings = createSettings(memoryStore(stored));

    expect(settings.isEnabled("troop-bar")).toBe(true);
  });

  it("ignores a stored entry that is not a boolean", () => {
    const settings = createSettings(memoryStore('{"troop-bar":"nope"}'));

    expect(settings.isEnabled("troop-bar")).toBe(true);
  });

  it("keeps working when the store itself throws", () => {
    const brokenStore: SettingsStore = {
      read() {
        throw new Error("storage is disabled in this browser");
      },
      write() {
        throw new Error("storage is disabled in this browser");
      },
    };

    const settings = createSettings(brokenStore);

    expect(settings.isEnabled("troop-bar")).toBe(true);
    expect(() => settings.setEnabled("troop-bar", false)).not.toThrow();
    expect(settings.isEnabled("troop-bar")).toBe(false);
  });
});

describe("a feature's own options", () => {
  it("reports an option as on when nothing has been stored and it defaults on", () => {
    const settings = createSettings(memoryStore());

    expect(settings.isOptionEnabled("troop-bar", "percentage", true)).toBe(true);
  });

  it("reports an option as off when nothing has been stored and it defaults off", () => {
    const settings = createSettings(memoryStore());

    expect(settings.isOptionEnabled("troop-bar", "ends", false)).toBe(false);
  });

  it("remembers an option being switched off", () => {
    const store = memoryStore();
    const settings = createSettings(store);

    settings.setOptionEnabled("troop-bar", "percentage", false);

    expect(settings.isOptionEnabled("troop-bar", "percentage", true)).toBe(false);
    expect(
      createSettings(store).isOptionEnabled("troop-bar", "percentage", true),
    ).toBe(false);
  });

  // An option and the feature holding it are stored side by side, so a name
  // that collided would switch the wrong thing off.
  it("keeps an option apart from the feature it belongs to", () => {
    const settings = createSettings(memoryStore());

    settings.setOptionEnabled("troop-bar", "percentage", false);

    expect(settings.isEnabled("troop-bar")).toBe(true);
  });

  it("keeps the same option apart on two features", () => {
    const settings = createSettings(memoryStore());

    settings.setOptionEnabled("troop-bar", "percentage", false);

    expect(settings.isOptionEnabled("income", "percentage", true)).toBe(true);
  });
});
