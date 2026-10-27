import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readGameKeybinds } from "../game/keybinds";
import type { Feature } from "../runtime/feature";
import { createRegistry } from "../runtime/registry";
import { createSettings } from "../runtime/settings";
import { CONFIRM_MS, createSettingsPanel } from "./panel";

/**
 * The Settings panel on its own, driven the way a player drives it: clicks on
 * switches, a number typed and committed, and keys handed to the recorder.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const troopBar: Feature = {
  id: "troop-bar",
  name: "Troop bar plateau",
  description: "A strip on your troop bar.",
  options: [{ key: "percentage", name: "Share of best rate", whenUnset: true }],
  attach: () => undefined,
};

const hotbar: Feature = {
  id: "hotbar",
  name: "Hotbar cheap window",
  options: [
    {
      key: "badge-seconds",
      name: "Seconds the badge stays",
      whenUnset: "3.5",
      control: { kind: "number", min: 0.5, max: 30, step: 0.5 },
    },
  ],
  attach: () => undefined,
};

const allianceView: Feature = {
  id: "alliance-view",
  name: "Alliance view mode",
  options: [
    {
      key: "hold-key",
      name: "Hold key",
      whenUnset: "Backquote",
      control: { kind: "key" },
    },
  ],
  attach: () => undefined,
};

const spawnMarks: Feature = {
  id: "spawn-marks",
  name: "Spawn marks",
  options: [
    {
      key: "nation-teammates",
      name: "Mark Nation teammates too",
      whenUnset: false,
      control: { kind: "console-only" },
    },
  ],
  attach: () => undefined,
};

const FEATURES = [troopBar, hotbar, allianceView, spawnMarks];

function setup(
  gameKeybinds: Record<string, string> = {},
  storedSettings: Record<string, unknown> = {},
) {
  let raw = JSON.stringify(storedSettings);
  const settings = createSettings({
    read: () => raw,
    write: (value) => {
      raw = value;
    },
  });
  const registry = createRegistry({ features: FEATURES, settings });
  const keybindsRaw = JSON.stringify(gameKeybinds);
  const onClose = vi.fn();
  const panel = createSettingsPanel({
    registry,
    gameKeybinds: () =>
      readGameKeybinds({ read: () => keybindsRaw, write: () => {} }),
    onClose,
  });
  document.body.append(panel.root);

  return {
    panel,
    registry,
    onClose,
    stored: () => JSON.parse(raw) as Record<string, unknown>,
  };
}

function section(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-feature="${id}"]`);
  if (!found) throw new Error(`no section for ${id}`);
  return found;
}

function featureSwitch(id: string): HTMLInputElement {
  const found = section(id).querySelector<HTMLInputElement>(
    ":scope > .ofx-settings-row .ofx-switch",
  );
  if (!found) throw new Error(`no switch for ${id}`);
  return found;
}

function click(node: HTMLElement): void {
  node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function toggle(input: HTMLInputElement): void {
  input.checked = !input.checked;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function names(root: ParentNode): string[] {
  return [...root.querySelectorAll(".ofx-settings-name")].map(
    (name) => name.textContent ?? "",
  );
}

function keyButton(): HTMLButtonElement {
  const found = section("alliance-view").querySelector<HTMLButtonElement>(
    ".ofx-settings-key",
  );
  if (!found) throw new Error("no key recorder");
  return found;
}

function warning(): string {
  return (
    section("alliance-view").querySelector(".ofx-settings-warning")
      ?.textContent ?? ""
  );
}

function resetButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(".ofx-settings-reset");
  if (!found) throw new Error("no reset button");
  return found;
}

describe("what the panel shows", () => {
  it("draws one row per feature, in the registry's order", () => {
    setup();

    const sections = [...document.querySelectorAll<HTMLElement>("[data-feature]")];
    expect(sections.map((node) => node.dataset.feature)).toEqual([
      "troop-bar",
      "hotbar",
      "alliance-view",
      "spawn-marks",
    ]);
  });

  it("puts each feature's options under its row", () => {
    setup();

    expect(names(section("troop-bar"))).toEqual([
      "Troop bar plateau",
      "Share of best rate",
    ]);
    expect(names(section("hotbar"))).toEqual([
      "Hotbar cheap window",
      "Seconds the badge stays",
    ]);
  });

  it("leaves out an option that is set from the console only", () => {
    setup();

    expect(names(section("spawn-marks"))).toEqual(["Spawn marks"]);
  });

  it("shows each switch as the registry has it", () => {
    setup({}, { hotbar: false });

    expect(featureSwitch("troop-bar").checked).toBe(true);
    expect(featureSwitch("hotbar").checked).toBe(false);
  });
});

describe("the words on a row", () => {
  it("puts the description under the title", () => {
    setup();

    const text = section("troop-bar").querySelector(".ofx-settings-text");
    expect(text?.querySelector(".ofx-settings-name")?.textContent).toBe(
      "Troop bar plateau",
    );
    expect(text?.querySelector(".ofx-settings-description")?.textContent).toBe(
      "A strip on your troop bar.",
    );
  });

  it("draws no empty line for a row with no description", () => {
    setup();

    expect(section("hotbar").querySelector(".ofx-settings-description")).toBeNull();
  });
});

describe("switching a feature", () => {
  it("switches it off through the registry at once", () => {
    const { registry } = setup();

    toggle(featureSwitch("troop-bar"));

    expect(registry.isEnabled("troop-bar")).toBe(false);
  });

  it("greys its options and stops them taking input while it is off", () => {
    setup();
    const options = section("troop-bar").querySelector(".ofx-settings-options");

    toggle(featureSwitch("troop-bar"));

    expect(options?.classList.contains("ofx-settings-options-off")).toBe(true);
    const inputs = options?.querySelectorAll<HTMLInputElement>("input") ?? [];
    expect([...inputs].every((input) => input.disabled)).toBe(true);
  });

  it("gives the options back when it is switched on again", () => {
    setup();
    const switchNode = featureSwitch("troop-bar");

    toggle(switchNode);
    toggle(switchNode);

    const options = section("troop-bar").querySelector(".ofx-settings-options");
    expect(options?.classList.contains("ofx-settings-options-off")).toBe(false);
  });
});

describe("an option that is a switch", () => {
  it("writes the new value through the registry", () => {
    const { stored } = setup();
    const option = section("troop-bar").querySelector<HTMLInputElement>(
      ".ofx-settings-options .ofx-switch",
    );

    toggle(option as HTMLInputElement);

    expect(stored()["troop-bar:percentage"]).toBe(false);
  });
});

describe("an option that is a number", () => {
  function numberField(): HTMLInputElement {
    const found = section("hotbar").querySelector<HTMLInputElement>(
      ".ofx-settings-number",
    );
    if (!found) throw new Error("no number field");
    return found;
  }

  function commit(value: string): void {
    const field = numberField();
    field.value = value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("shows the stored text, with the option's bounds", () => {
    setup();

    expect(numberField().value).toBe("3.5");
    expect(numberField().min).toBe("0.5");
    expect(numberField().max).toBe("30");
    expect(numberField().step).toBe("0.5");
  });

  it("stores a committed number as text", () => {
    const { stored } = setup();

    commit("7.5");

    expect(stored()["hotbar:badge-seconds"]).toBe("7.5");
  });

  it.each(["31", "0", "1.25", ""])(
    "refuses %j and puts the stored value back",
    (value) => {
      const { stored } = setup();

      commit(value);

      expect(stored()["hotbar:badge-seconds"]).toBeUndefined();
      expect(numberField().value).toBe("3.5");
    },
  );
});

describe("the key recorder", () => {
  it("shows the stored key in a readable form", () => {
    setup();

    expect(keyButton().textContent).toBe("`");
  });

  it("stores the next key once the player clicks it", () => {
    const { panel, stored } = setup();

    click(keyButton());
    const used = panel.handleKey("KeyJ");

    expect(used).toBe(true);
    expect(stored()["alliance-view:hold-key"]).toBe("KeyJ");
    expect(keyButton().textContent).toBe("J");
  });

  it("refuses a key the game binds, and names the game action", () => {
    const { panel, stored } = setup();

    click(keyButton());
    panel.handleKey("KeyB");

    expect(stored()["alliance-view:hold-key"]).toBeUndefined();
    expect(warning()).toBe("The game uses B for Boat attack. Pick another key.");
  });

  it("refuses a modifier pressed on its own", () => {
    const { panel, stored } = setup();

    click(keyButton());
    panel.handleKey("ShiftLeft");

    expect(stored()["alliance-view:hold-key"]).toBeUndefined();
    expect(warning()).toBe("Pick a key that is not a modifier.");
  });

  it("cancels on Escape without closing the panel", () => {
    const { panel, onClose, stored } = setup();

    click(keyButton());
    const used = panel.handleKey("Escape");

    expect(used).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(stored()["alliance-view:hold-key"]).toBeUndefined();
    expect(keyButton().textContent).toBe("`");
  });

  it("stops listening after one key", () => {
    const { panel } = setup();

    click(keyButton());
    panel.handleKey("KeyJ");

    expect(panel.handleKey("KeyK")).toBe(false);
  });

  it("shows a clash when the game took the stored key later", () => {
    setup({ buildCity: "Backquote" });

    expect(warning()).toBe("The game uses ` for Build city. Pick another key.");
  });
});

describe("the panel and the keyboard", () => {
  it("closes on Escape", () => {
    const { panel, onClose } = setup();

    expect(panel.handleKey("Escape")).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("lets every other key through to the game", () => {
    const { panel, onClose } = setup();

    expect(panel.handleKey("KeyW")).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a click on the backdrop, and not on one inside the dialog", () => {
    const { panel, onClose } = setup();

    click(section("troop-bar"));
    expect(onClose).not.toHaveBeenCalled();

    click(panel.root);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Reset to defaults", () => {
  it("asks for a second click before it resets", () => {
    const { registry } = setup();
    toggle(featureSwitch("troop-bar"));

    click(resetButton());

    expect(resetButton().textContent).toBe("Confirm?");
    expect(registry.isEnabled("troop-bar")).toBe(false);
  });

  it("resets every feature and option on the second click, a hidden one too", () => {
    const { registry, stored } = setup();
    registry.setEnabled("troop-bar", false);
    registry.setOption("alliance-view", "hold-key", "KeyJ");
    registry.setOption("spawn-marks", "nation-teammates", true);

    click(resetButton());
    click(resetButton());

    expect(stored()).toEqual({});
    expect(registry.isEnabled("troop-bar")).toBe(true);
    expect(featureSwitch("troop-bar").checked).toBe(true);
    expect(keyButton().textContent).toBe("`");
    expect(resetButton().textContent).toBe("Reset to defaults");
  });

  it("forgets the first click after three seconds", () => {
    const { registry } = setup();
    toggle(featureSwitch("troop-bar"));

    click(resetButton());
    vi.advanceTimersByTime(CONFIRM_MS);
    click(resetButton());

    expect(resetButton().textContent).toBe("Confirm?");
    expect(registry.isEnabled("troop-bar")).toBe(false);
  });
});
