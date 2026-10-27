import { GAME_KEYBINDS_KEY } from "../game/keybinds";
import type { ControlPanel } from "../game/types";
import { startSettingsPanel } from "../settings-panel";
import type { Feature } from "./feature";
import { startLifecycle, type Lifecycle } from "./lifecycle";
import { createRegistry, type Registry } from "./registry";
import { localStorageStore, type Settings } from "./settings";
import { createStyleSheet, type StyleSheet } from "./styles";

export interface Package {
  readonly registry: Registry;
  /** Undoes everything the package did to the page. */
  stop(): void;
}

/**
 * Wires the package to a `<control-panel>` element that is already upgraded.
 *
 * Everything the package does to the page happens below this call, and `stop`
 * undoes all of it.
 */
export function start(deps: {
  panel: ControlPanel;
  features: readonly Feature[];
  settings: Settings;
  css: string;
}): Package {
  const registry = createRegistry({
    features: deps.features,
    settings: deps.settings,
  });

  const styles: StyleSheet = createStyleSheet(deps.css);
  styles.injectInto(document);

  // Before the lifecycle, so its key listener comes before any feature's.
  const settingsPanel = startSettingsPanel({
    registry,
    gameKeybinds: localStorageStore(GAME_KEYBINDS_KEY),
  });

  const lifecycle: Lifecycle = startLifecycle({
    panel: deps.panel,
    handlers: {
      onMatchStart: (game) => registry.attachAll({ panel: deps.panel, game }),
      onMatchEnd: () => registry.detachAll(),
      onTick: () => registry.tickAll(),
    },
  });

  return {
    registry,
    stop() {
      lifecycle.stop();
      settingsPanel.stop();
      styles.remove();
    },
  };
}
