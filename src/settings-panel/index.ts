import { readGameKeybinds } from "../game/keybinds";
import { logError } from "../runtime/log";
import type { Registry } from "../runtime/registry";
import type { SettingsStore } from "../runtime/settings";
import { watchSettingsMenu } from "./menu-row";
import { createSettingsPanel, type SettingsPanel } from "./panel";

/**
 * The Settings panel, from the row in the game's menu to the key presses.
 *
 * The panel goes inside the overlay of the game's own menu, over the menu's
 * dialog. So it dims with the game like the game's own panels, and it goes when
 * the game closes the menu. The menu stays open under it, so a pause the menu
 * started lasts while the panel is up, and the package never touches the pause.
 * See docs/adr/0003 and docs/adr/0009.
 *
 * The game's menu exists in a match only, so the panel does too.
 */

export interface SettingsPanelHost {
  /** Takes the row and the panel out of the page and stops listening. */
  stop(): void;
}

export function startSettingsPanel(deps: {
  registry: Registry;
  /** Where the game keeps the player's own keybinds. */
  gameKeybinds: SettingsStore;
}): SettingsPanelHost {
  let panel: SettingsPanel | null = null;

  function open(overlay: HTMLElement): void {
    close();
    panel = createSettingsPanel({
      registry: deps.registry,
      gameKeybinds: () => readGameKeybinds(deps.gameKeybinds),
      onClose: close,
    });
    overlay.append(panel.root);
    panel.focus();
  }

  function close(): void {
    if (!panel) return;
    panel.destroy();
    panel.root.remove();
    panel = null;
  }

  // The capture phase on the window, added before any feature attaches, so the
  // panel sees a key before the game and before every feature.
  // Escape would otherwise also close the game's menu under the panel.
  function onKeyDown(event: KeyboardEvent): void {
    try {
      if (!panel) return;
      if (!panel.root.isConnected) {
        // The game closed its menu, and the panel went with it.
        close();
        return;
      }
      // The game's menu closes on `key`, and a few key events carry no code.
      const code =
        event.code === "" && event.key === "Escape" ? "Escape" : event.code;
      if (!panel.handleKey(code)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    } catch (error) {
      logError("the settings panel failed on a key press", error);
    }
  }

  const capture = { capture: true };
  window.addEventListener("keydown", onKeyDown, capture);
  const menu = watchSettingsMenu({ onOpen: open });

  return {
    stop() {
      menu.stop();
      close();
      window.removeEventListener("keydown", onKeyDown, capture);
    },
  };
}
