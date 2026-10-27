import { describe, expect, it, vi } from "vitest";
import { FEATURES } from "../features";
import type { Feature } from "../runtime/feature";
import { createRegistry } from "../runtime/registry";
import { createSettings, type SettingsStore } from "../runtime/settings";
import { startSettingsPanel } from ".";

/**
 * The Settings panel inside a stand-in for the game's in-match menu.
 *
 * The stand-in copies what the panel depends on: `<settings-modal>` is empty
 * while closed, and on open it holds an overlay, a dialog, a header and a
 * column of rows. The game builds all of it again on every open.
 */

const NO_GAME_KEYBINDS: SettingsStore = { read: () => null, write: () => {} };

const troopBar: Feature = {
  id: "troop-bar",
  name: "Troop bar plateau",
  attach: () => undefined,
};

function addMenu(): HTMLElement {
  const menu = document.createElement("settings-modal");
  document.body.append(menu);
  return menu;
}

/** What the game draws when the gear opens the menu. */
function openMenu(menu: HTMLElement, { newer = true } = {}): void {
  menu.innerHTML = `
    <div class="modal-overlay">
      <div class="dialog">
        <div class="header"><h2>Settings</h2></div>
        <div class="column">
          ${newer ? `<button data-save-game>Save</button>` : ""}
          <button ${newer ? "data-open-settings" : ""}>Settings</button>
          <button>Toggle terrain</button>
          <div class="divider"><button>Exit game</button></div>
        </div>
      </div>
    </div>`;
}

/** What the game does when the menu closes: `render()` returns null. */
function closeMenu(menu: HTMLElement): void {
  menu.replaceChildren();
}

/** Lets the menu's mutation observer run. */
async function settle(): Promise<void> {
  await Promise.resolve();
}

function setup(features: readonly Feature[] = [troopBar]) {
  const menu = addMenu();
  let raw = "{}";
  const registry = createRegistry({
    features,
    settings: createSettings({
      read: () => raw,
      write: (value) => {
        raw = value;
      },
    }),
  });
  const host = startSettingsPanel({ registry, gameKeybinds: NO_GAME_KEYBINDS });
  return { menu, registry, host };
}

function row(menu: HTMLElement): HTMLElement | null {
  return menu.querySelector<HTMLElement>(".ofx-menu-row");
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".ofx-settings");
}

function press(code: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    code,
    key: code,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(event);
  return event;
}

describe("the Extended UI row in the game's menu", () => {
  it("appears when the menu opens", async () => {
    const { menu } = setup();

    openMenu(menu);
    await settle();

    expect(row(menu)?.textContent).toContain("Extended UI");
  });

  it("sits right after the row that opens the game's own settings", async () => {
    const { menu } = setup();

    openMenu(menu);
    await settle();

    const previous = row(menu)?.previousElementSibling;
    expect(previous?.hasAttribute("data-open-settings")).toBe(true);
  });

  it("sits right after the first row on the game's older menu", async () => {
    const { menu } = setup();

    openMenu(menu, { newer: false });
    await settle();

    expect(row(menu)?.previousElementSibling?.textContent).toBe("Settings");
  });

  it("comes back each time the game builds the menu again", async () => {
    const { menu } = setup();

    openMenu(menu);
    await settle();
    closeMenu(menu);
    await settle();
    openMenu(menu);
    await settle();

    expect(menu.querySelectorAll(".ofx-menu-row")).toHaveLength(1);
  });

  it("goes when the package stops", async () => {
    const { menu, host } = setup();
    openMenu(menu);
    await settle();

    host.stop();

    expect(row(menu)).toBeNull();
  });

  it("says why when the page has no menu to put it in", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const registry = createRegistry({
      features: [],
      settings: createSettings(NO_GAME_KEYBINDS),
    });

    startSettingsPanel({ registry, gameKeybinds: NO_GAME_KEYBINDS }).stop();

    expect(error).toHaveBeenCalledWith(
      "[openfront-extended-ui]",
      expect.stringContaining("no <settings-modal>"),
    );
  });
});

describe("opening and closing the panel", () => {
  async function openPanel() {
    const context = setup();
    openMenu(context.menu);
    await settle();
    row(context.menu)?.click();
    return context;
  }

  it("opens over the game's menu, inside the menu's overlay", async () => {
    const { menu } = await openPanel();

    expect(menu.querySelector(".modal-overlay .ofx-settings")).not.toBeNull();
    expect(menu.querySelector(".dialog")).not.toBeNull();
  });

  it("closes on Escape and leaves the game's menu open", async () => {
    const { menu } = await openPanel();
    const gameMenuKeys = vi.fn();
    window.addEventListener("keydown", gameMenuKeys);

    const event = press("Escape");

    expect(panel()).toBeNull();
    expect(event.defaultPrevented).toBe(true);
    expect(gameMenuKeys).not.toHaveBeenCalled();
    expect(menu.querySelector(".dialog")).not.toBeNull();
    window.removeEventListener("keydown", gameMenuKeys);
  });

  it("closes on an Escape that carries no code", async () => {
    await openPanel();

    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(panel()).toBeNull();
  });

  it("lets every other key through to the game", async () => {
    await openPanel();
    const gameKeys = vi.fn();
    window.addEventListener("keydown", gameKeys);

    press("KeyW");

    expect(gameKeys).toHaveBeenCalledTimes(1);
    window.removeEventListener("keydown", gameKeys);
  });

  it("goes with the game's menu when the game closes it", async () => {
    const { menu } = await openPanel();

    closeMenu(menu);

    expect(panel()).toBeNull();
  });

  it("switches a feature off at once", async () => {
    const { registry } = await openPanel();
    const toggle = document.querySelector<HTMLInputElement>(".ofx-switch");

    toggle?.click();

    expect(registry.isEnabled("troop-bar")).toBe(false);
  });
});

describe("the key recorder inside the game's page", () => {
  it("takes the key before the game and every feature sees it", async () => {
    const { menu, registry } = setup(FEATURES);
    openMenu(menu);
    await settle();
    row(menu)?.click();
    const gameKeys = vi.fn();
    window.addEventListener("keydown", gameKeys, { capture: true });

    document.querySelector<HTMLElement>(".ofx-settings-key")?.click();
    press("KeyJ");

    expect(gameKeys).not.toHaveBeenCalled();
    const holdKey = registry
      .optionsOf("alliance-view")
      .find((option) => option.key === "hold-key");
    expect(holdKey?.value).toBe("KeyJ");
    window.removeEventListener("keydown", gameKeys, { capture: true });
  });
});

describe("the features the package ships, in the panel", () => {
  it("shows the four options a player sets, and never nation-teammates", async () => {
    const { menu } = setup(FEATURES);
    openMenu(menu);
    await settle();
    row(menu)?.click();

    const options = [
      ...document.querySelectorAll(
        ".ofx-settings-options .ofx-settings-name",
      ),
    ].map((name) => name.textContent);
    expect(options).toEqual([
      "Regrowth speed in %",
      "Keep the icon pulsing",
      "Mouse reminder duration",
      "Key to hold",
    ]);
  });

  it("explains every feature and every option it shows in a sentence", async () => {
    const { menu } = setup(FEATURES);
    openMenu(menu);
    await settle();
    row(menu)?.click();

    const rows = [...document.querySelectorAll(".ofx-settings-text")];
    const unexplained = rows
      .filter((text) => !text.querySelector(".ofx-settings-description")?.textContent)
      .map((text) => text.querySelector(".ofx-settings-name")?.textContent);
    expect(rows).toHaveLength(FEATURES.length + 4);
    expect(unexplained).toEqual([]);
  });

  it("gives every text option a control, so none is left out by mistake", () => {
    const textOptions = FEATURES.flatMap((feature) => feature.options ?? []).filter(
      (option) => typeof option.whenUnset === "string",
    );

    expect(textOptions.every((option) => option.control !== undefined)).toBe(true);
  });
});
