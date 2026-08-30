import { describe, expect, it } from "vitest";
import type { SettingsStore } from "../../runtime/settings";
import { readGameKeybinds } from "./keybinds";

/** The game's own stored keybinds, as one JSON string. */
function store(value?: unknown): SettingsStore {
  const raw = value === undefined ? null : JSON.stringify(value);
  return { read: () => raw, write: () => {} };
}

const untouched = store();

describe("which keys the game has taken", () => {
  it("counts a key the game binds by default", () => {
    const game = readGameKeybinds(untouched);

    expect(game.isBound("Space")).toBe(true);
    expect(game.isBound("KeyB")).toBe(true);
  });

  it("leaves a key the game binds to nothing free", () => {
    expect(readGameKeybinds(untouched).isBound("Backquote")).toBe(false);
  });

  it("counts a key the player has bound themselves", () => {
    const game = readGameKeybinds(store({ buildCity: "Backquote" }));

    expect(game.isBound("Backquote")).toBe(true);
  });

  it("frees a default key the player has moved elsewhere", () => {
    const game = readGameKeybinds(store({ boatAttack: "Backquote" }));

    expect(game.isBound("KeyB")).toBe(false);
  });

  it("frees a key the player has unbound", () => {
    const game = readGameKeybinds(store({ boatAttack: "Null" }));

    expect(game.isBound("KeyB")).toBe(false);
  });

  /**
   * The game writes a binding three ways: a plain string, an object with a
   * `value`, and a one-item array. All three name a key that is taken.
   */
  it("reads a binding stored as an object", () => {
    const game = readGameKeybinds(store({ buildCity: { value: "Backquote" } }));

    expect(game.isBound("Backquote")).toBe(true);
  });

  it("reads a binding stored as a list", () => {
    const game = readGameKeybinds(store({ buildCity: ["Backquote"] }));

    expect(game.isBound("Backquote")).toBe(true);
  });

  /**
   * The game fires its action only with the modifier down, but a player who
   * holds our key with shift would fire both. The safe answer is to count the
   * key as taken, because the mode must not steal a key the player set.
   */
  it("counts a key the game binds behind a modifier", () => {
    const game = readGameKeybinds(store({ retaliateAttack: "Shift+Backquote" }));

    expect(game.isBound("Backquote")).toBe(true);
  });

  it("counts nothing as taken when no key is asked about", () => {
    expect(readGameKeybinds(untouched).isBound("")).toBe(false);
  });

  /**
   * A check pinned at match start goes stale the moment the player rebinds in
   * the game's settings, so the caller reads again and gets the new answer.
   */
  it("reads storage again on the next call", () => {
    let raw: string | null = null;
    const live: SettingsStore = { read: () => raw, write: () => {} };

    expect(readGameKeybinds(live).isBound("Backquote")).toBe(false);
    raw = JSON.stringify({ buildCity: "Backquote" });
    expect(readGameKeybinds(live).isBound("Backquote")).toBe(true);
  });
});

describe("what the game's keybinds do when storage answers badly", () => {
  it("falls back to the defaults when the stored keybinds are not JSON", () => {
    const broken: SettingsStore = { read: () => "{not json", write: () => {} };
    const game = readGameKeybinds(broken);

    expect(game.isBound("Space")).toBe(true);
    expect(game.isBound("Backquote")).toBe(false);
  });

  it("falls back to the defaults when the stored keybinds are not an object", () => {
    const game = readGameKeybinds(store(["Backquote"]));

    expect(game.isBound("Backquote")).toBe(false);
  });

  it("falls back to the defaults when storage itself throws", () => {
    const disabled: SettingsStore = {
      read() {
        throw new Error("storage is disabled in this browser");
      },
      write: () => {},
    };

    expect(readGameKeybinds(disabled).isBound("Space")).toBe(true);
  });
});

describe("the key the game holds its own alternate view on", () => {
  it("is space until the player moves it", () => {
    expect(readGameKeybinds(untouched).alternateViewKey()).toBe("Space");
  });

  it("follows the player to whatever they moved it to", () => {
    const game = readGameKeybinds(store({ toggleView: "KeyV" }));

    expect(game.alternateViewKey()).toBe("KeyV");
  });

  it("is nothing at all when the player has unbound it", () => {
    const game = readGameKeybinds(store({ toggleView: "Null" }));

    expect(game.alternateViewKey()).toBe("");
  });
});
