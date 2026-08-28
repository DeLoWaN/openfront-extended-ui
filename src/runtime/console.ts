import type { FeatureId } from "./feature";
import type { Registry } from "./registry";

/**
 * The only way to switch a feature off for now.
 *
 * Nobody has designed the settings screen yet, because its shape depends on how
 * many options the readouts turn out to have. Until then a player types these
 * into the browser console.
 */
export interface ConsoleHandle {
  /** Every feature, and whether it is switched on. */
  list(): Array<{ id: FeatureId; name: string; enabled: boolean }>;
  enable(id: FeatureId): void;
  disable(id: FeatureId): void;
  /** Undoes everything the package did to the page. */
  stop(): void;
}

export function createConsoleHandle(deps: {
  registry: Registry;
  stop(): void;
}): ConsoleHandle {
  return {
    list: () =>
      deps.registry.features.map((feature) => ({
        id: feature.id,
        name: feature.name,
        enabled: deps.registry.isEnabled(feature.id),
      })),
    enable: (id) => deps.registry.setEnabled(id, true),
    disable: (id) => deps.registry.setEnabled(id, false),
    stop: () => deps.stop(),
  };
}
