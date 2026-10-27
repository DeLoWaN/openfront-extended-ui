import type { GameKeybinds } from "../game/keybinds";

/**
 * What the key recorder does with one key a player pressed.
 *
 * - `cancel`: the player gave up, and the stored key stays.
 * - `refuse`: the key cannot be used, and `message` says why.
 * - `accept`: the key is free, and `code` is what to store.
 */
export type KeyVerdict =
  | { readonly kind: "cancel" }
  | { readonly kind: "refuse"; readonly message: string }
  | { readonly kind: "accept"; readonly code: string };

const CANCEL = "Escape";

/** A modifier on its own is never a key a player holds to see something. */
const MODIFIERS: ReadonlySet<string> = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

/** The keys whose code names the symbol rather than shows it. */
const SYMBOLS: Readonly<Record<string, string>> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

export function judgeKey(code: string, game: GameKeybinds): KeyVerdict {
  if (code === CANCEL) return { kind: "cancel" };
  // Some synthetic and accessibility key events carry no code at all.
  if (code === "") {
    return { kind: "refuse", message: "This key sends no code. Pick another." };
  }
  if (MODIFIERS.has(code)) {
    return { kind: "refuse", message: "Pick a key that is not a modifier." };
  }
  const message = clashMessage(code, game);
  if (message !== null) return { kind: "refuse", message };
  return { kind: "accept", code };
}

/**
 * What to tell a player whose key the game also binds, or null when it is free.
 *
 * The game's keybinds can change after a key was stored, so this is asked
 * again each time the panel draws the key.
 */
export function clashMessage(code: string, game: GameKeybinds): string | null {
  const action = game.boundAction(code);
  if (action === null) return null;
  return `The game uses ${keyLabel(code)} for ${actionLabel(action)}. Pick another key.`;
}

/**
 * A key code as a player reads it, such as `J` for `KeyJ`.
 *
 * The label follows a US layout. A code names a position on the keyboard, so
 * on another layout the letter printed on the key can differ.
 */
export function keyLabel(code: string): string {
  const letterOrDigit = /^(?:Key|Digit)(.)$/.exec(code);
  if (letterOrDigit) return letterOrDigit[1] ?? code;
  const numpad = /^Numpad(\d)$/.exec(code);
  if (numpad) return `Numpad ${numpad[1]}`;
  return SYMBOLS[code] ?? code;
}

/** The game's name for an action as a sentence, such as `Boat attack`. */
export function actionLabel(action: string): string {
  const words = action.split(/(?<=[a-z])(?=[A-Z])/);
  const sentence = words
    .map((word) => (word === word.toUpperCase() ? word : word.toLowerCase()))
    .join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
