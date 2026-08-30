/**
 * Which keys the game has already taken.
 *
 * The alliance view mode is held on a key of its own, and the game's keybinds
 * are the player's to change. The mode must not steal a key the player set, so
 * it asks here before it engages.
 *
 * The game keeps its own keybinds in `localStorage` and merges them over its
 * defaults on every read. This reads them the same way, on every press rather
 * than once at match start, because a check pinned at match start goes stale
 * the moment the player rebinds mid-match.
 *
 * Read from `getDefaultKeybinds` and `keybinds` in
 * `src/core/game/UserSettings.ts:16` and `:532`, at OpenFrontIO commit
 * 332e5410e.
 */

import { readStoredObject, type SettingsStore } from "../../runtime/settings";

/** Where the game keeps the player's own keybinds. `UserSettings.ts:68`. */
export const GAME_KEYBINDS_KEY = "settings.keybinds";

/** What the game writes for an action the player has unbound. `:541`. */
const UNBOUND = "Null";

/** The action the game holds its own alternate view on. */
const ALTERNATE_VIEW = "toggleView";

/**
 * Every key the game binds out of the box. `UserSettings.ts:17`.
 *
 * A Mac binds `MetaLeft` for `buildMenuModifier` instead. This does not know
 * which machine it runs on, so a Mac player who picks that bare modifier as a
 * hold key is not warned.
 */
const DEFAULTS: Readonly<Record<string, string>> = {
  toggleView: "Space",
  coordinateGrid: "KeyM",
  buildCity: "Digit1",
  buildFactory: "Digit2",
  buildPort: "Digit3",
  buildDefensePost: "Digit4",
  buildMissileSilo: "Digit5",
  buildSamLauncher: "Digit6",
  buildWarship: "Digit7",
  buildAtomBomb: "Digit8",
  buildHydrogenBomb: "Digit9",
  buildMIRV: "Digit0",
  attackRatioDown: "KeyT",
  attackRatioUp: "KeyY",
  boatAttack: "KeyB",
  groundAttack: "KeyG",
  retaliateAttack: "Shift+KeyR",
  requestAlliance: "KeyK",
  breakAlliance: "KeyL",
  swapDirection: "KeyU",
  zoomOut: "KeyQ",
  zoomIn: "KeyE",
  centerCamera: "KeyC",
  moveUp: "KeyW",
  moveLeft: "KeyA",
  moveDown: "KeyS",
  moveRight: "KeyD",
  buildMenuModifier: "ControlLeft",
  emojiMenuModifier: "AltLeft",
  shiftKey: "ShiftLeft",
  resetGfx: "KeyR",
  selectAllWarships: "KeyF",
  pauseGame: "KeyP",
  gameSpeedUp: "Period",
  gameSpeedDown: "Comma",
  altKey: "AltLeft",
};

/** The game's keybinds as they stand now. */
export interface GameKeybinds {
  /**
   * Whether the game has this key bound to one of its own actions.
   *
   * A binding behind a modifier, such as `Shift+KeyR`, takes the key too. The
   * game fires that action only with the modifier down, but a player who holds
   * our key with shift would fire both.
   */
  isBound(code: string): boolean;

  /**
   * The key the game holds its own alternate view on.
   *
   * Under that view the territory shader draws no owned tile at all, so nothing
   * the mode writes to the palette reaches the screen. An empty string means
   * the player has unbound it, so nothing can hold it.
   */
  alternateViewKey(): string;
}

/**
 * The game's defaults, with the player's own choices over the top.
 *
 * Call this on every press. The player can rebind mid-match, and a map read
 * once at match start goes stale the moment they do.
 */
export function readGameKeybinds(store: SettingsStore): GameKeybinds {
  const merged: Record<string, string> = { ...DEFAULTS, ...stored(store) };
  for (const [action, binding] of Object.entries(merged)) {
    if (binding === UNBOUND) delete merged[action];
  }

  return {
    isBound(code) {
      if (code === "") return false;
      return Object.values(merged).some((binding) => keyOf(binding) === code);
    },
    alternateViewKey: () => keyOf(merged[ALTERNATE_VIEW] ?? ""),
  };
}

/**
 * The player's own keybinds, flattened to one binding per action.
 *
 * The game writes a binding three ways: a plain string, an object carrying a
 * `value`, and a one-item list. `normalizedUserKeybinds` at
 * `UserSettings.ts:513` reads all three, so this does too.
 */
function stored(store: SettingsStore): Record<string, string> {
  // Nothing is reported. A problem here leaves the game on its own defaults
  // too, so it is not the package's to complain about.
  const bindings: Record<string, string> = {};
  for (const [action, value] of Object.entries(readStoredObject(store))) {
    const binding = flatten(value);
    if (binding !== null) bindings[action] = binding;
  }
  return bindings;
}

function flatten(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    return flatten((value as { value: unknown }).value);
  }
  return null;
}

/** The key a binding names, with any modifier prefix dropped. */
function keyOf(binding: string): string {
  return binding.slice(binding.lastIndexOf("+") + 1);
}
