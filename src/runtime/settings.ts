import { matchesOption, type FeatureId, type OptionValue } from "./feature";
import { logError } from "./log";

/**
 * Where the on/off choices are kept.
 *
 * The package has no userscript grants, so it has no `GM_setValue` and uses
 * `localStorage`. See docs/adr/0007. Another store means one more version of
 * this interface and no other change.
 */
export interface SettingsStore {
  read(): string | null;
  write(value: string): void;
}

export interface Settings {
  /** A feature nobody has switched off is on. */
  isEnabled(id: FeatureId): boolean;
  setEnabled(id: FeatureId, enabled: boolean): void;

  /**
   * What one of a feature's own options is set to.
   *
   * `whenUnset` is what the option means before a player has chosen, so each
   * option carries its own default instead of one default for every option. It
   * also says which type the option holds, and a stored value of another type
   * is read as nothing stored.
   */
  optionValue<Value extends OptionValue>(
    id: FeatureId,
    option: string,
    whenUnset: Value,
  ): Value;
  setOptionValue(id: FeatureId, option: string, value: OptionValue): void;
}

const STORAGE_KEY = "openfront-extended-ui:features";

/**
 * The stored key for one of a feature's options.
 *
 * A feature id never contains a colon, so an option can never collide with a
 * feature. Both live in the one stored object.
 */
function optionKey(id: FeatureId, option: string): string {
  return `${id}:${option}`;
}

export function createSettings(store: SettingsStore): Settings {
  const stored = readStored(store);

  function save(): void {
    try {
      store.write(JSON.stringify(stored));
    } catch (error) {
      // The choice still applies to this page. It is lost on reload.
      logError("could not save the settings", error);
    }
  }

  return {
    isEnabled(id) {
      const value = stored[id];
      return typeof value === "boolean" ? value : true;
    },

    setEnabled(id, value) {
      stored[id] = value;
      save();
    },

    optionValue<Value extends OptionValue>(
      id: FeatureId,
      option: string,
      whenUnset: Value,
    ): Value {
      const value = stored[optionKey(id, option)];
      return matchesOption(value, whenUnset) ? (value as Value) : whenUnset;
    },

    setOptionValue(id, option, value) {
      stored[optionKey(id, option)] = value;
      save();
    },
  };
}

/** Reads `localStorage`, which throws when the browser has storage switched off. */
export function localStorageStore(key: string = STORAGE_KEY): SettingsStore {
  return {
    read: () => localStorage.getItem(key),
    write: (value) => localStorage.setItem(key, value),
  };
}

/**
 * Reads one JSON object out of a store.
 *
 * Every problem gives back an empty object, so a caller always has something to
 * read. `report` names the problem in plain words, for a caller that wants to
 * say so. A caller that does not pass one hears nothing.
 */
export function readStoredObject(
  store: SettingsStore,
  report: (problem: string, error?: unknown) => void = () => {},
): Record<string, unknown> {
  let raw: string | null;
  try {
    raw = store.read();
  } catch (error) {
    report("could not be read", error);
    return {};
  }
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    report("are not valid JSON");
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    report("are not an object");
    return {};
  }
  return parsed as Record<string, unknown>;
}

/**
 * Anything that is not a boolean or a string is treated as absent, so a value
 * left by an older version of the package can never switch a feature off.
 */
function readStored(store: SettingsStore): Record<string, OptionValue> {
  const stored = readStoredObject(store, (problem, error) =>
    logError(`the stored settings ${problem}, using the defaults`, error),
  );

  const values: Record<string, OptionValue> = {};
  for (const [id, value] of Object.entries(stored)) {
    if (typeof value === "boolean" || typeof value === "string") {
      values[id] = value;
    }
  }
  return values;
}
