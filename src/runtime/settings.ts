import type { FeatureId } from "./feature";
import { logError } from "./log";

/**
 * Where the on/off choices are kept.
 *
 * The package has no userscript grants, so it has no `GM_setValue` and uses
 * `localStorage`. See docs/adr/0005. Another store means one more version of
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
}

const STORAGE_KEY = "openfront-extended-ui:features";

export function createSettings(store: SettingsStore): Settings {
  const enabled = readEnabled(store);

  return {
    isEnabled(id) {
      return enabled[id] ?? true;
    },

    setEnabled(id, value) {
      enabled[id] = value;
      try {
        store.write(JSON.stringify(enabled));
      } catch (error) {
        // The choice still applies to this page. It is lost on reload.
        logError("could not save the settings", error);
      }
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
 * Anything that is not an object of booleans is treated as absent, so a value
 * left by an older version of the package can never switch a feature off.
 */
function readEnabled(store: SettingsStore): Record<string, boolean> {
  let stored: string | null;
  try {
    stored = store.read();
  } catch (error) {
    logError("could not read the settings", error);
    return {};
  }
  if (stored === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    logError("the stored settings are not valid JSON, using the defaults");
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    logError("the stored settings are not an object, using the defaults");
    return {};
  }

  const enabled: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value === "boolean") enabled[id] = value;
  }
  return enabled;
}
