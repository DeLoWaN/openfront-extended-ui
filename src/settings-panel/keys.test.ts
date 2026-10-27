import { describe, expect, it } from "vitest";
import { readGameKeybinds } from "../game/keybinds";
import type { SettingsStore } from "../runtime/settings";
import { actionLabel, clashMessage, judgeKey, keyLabel } from "./keys";

/** The game's own stored keybinds, as one JSON string. */
function store(value?: unknown): SettingsStore {
  const raw = value === undefined ? null : JSON.stringify(value);
  return { read: () => raw, write: () => {} };
}

const game = readGameKeybinds(store());

describe("what the key recorder does with a pressed key", () => {
  it("accepts a key the game leaves free", () => {
    expect(judgeKey("KeyJ", game)).toEqual({ kind: "accept", code: "KeyJ" });
  });

  it("cancels on Escape, and never stores it", () => {
    expect(judgeKey("Escape", game)).toEqual({ kind: "cancel" });
  });

  it.each(["ShiftLeft", "ControlRight", "AltLeft", "MetaRight"])(
    "refuses %s pressed on its own",
    (code) => {
      expect(judgeKey(code, game)).toEqual({
        kind: "refuse",
        message: "Pick a key that is not a modifier.",
      });
    },
  );

  it("refuses a key the game binds, and names the game action", () => {
    expect(judgeKey("KeyB", game)).toEqual({
      kind: "refuse",
      message: "The game uses B for Boat attack. Pick another key.",
    });
  });

  it("refuses a key the player bound in the game's own settings", () => {
    const rebound = readGameKeybinds(store({ buildCity: "KeyJ" }));

    expect(judgeKey("KeyJ", rebound)).toEqual({
      kind: "refuse",
      message: "The game uses J for Build city. Pick another key.",
    });
  });

  it("refuses a key event that carries no code", () => {
    expect(judgeKey("", game).kind).toBe("refuse");
  });
});

describe("a stored key the game took later", () => {
  it("says nothing while the key is free", () => {
    expect(clashMessage("Backquote", game)).toBeNull();
  });

  it("names the game action once the player binds the key in the game", () => {
    const rebound = readGameKeybinds(store({ toggleView: "Backquote" }));

    expect(clashMessage("Backquote", rebound)).toBe(
      "The game uses ` for Toggle view. Pick another key.",
    );
  });
});

describe("a key code as a player reads it", () => {
  it.each([
    ["KeyJ", "J"],
    ["Digit7", "7"],
    ["Numpad3", "Numpad 3"],
    ["Backquote", "`"],
    ["Slash", "/"],
    ["F4", "F4"],
    ["ArrowUp", "ArrowUp"],
  ])("shows %s as %s", (code, label) => {
    expect(keyLabel(code)).toBe(label);
  });
});

describe("the game's name for an action as a sentence", () => {
  it.each([
    ["boatAttack", "Boat attack"],
    ["attackRatioDown", "Attack ratio down"],
    ["buildMIRV", "Build MIRV"],
    ["zoomIn", "Zoom in"],
  ])("reads %s as %s", (action, label) => {
    expect(actionLabel(action)).toBe(label);
  });
});
