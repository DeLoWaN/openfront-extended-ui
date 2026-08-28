import type { ControlPanel } from "../game/types";
import type { Feature } from "./feature";
import { startLifecycle, type Lifecycle } from "./lifecycle";
import { createRegistry, type Registry } from "./registry";
import type { Settings } from "./settings";
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
      styles.remove();
    },
  };
}
