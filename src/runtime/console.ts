import type { FeatureId } from "./feature";
import type { Registry } from "./registry";

/** One of a feature's own choices, as a player sees it. */
export interface ListedOption {
  readonly key: string;
  readonly name: string;
  readonly enabled: boolean;
}

/**
 * The only way to switch a feature off for now.
 *
 * Nobody has designed the settings screen yet, because its shape depends on how
 * many options the readouts turn out to have. Until then a player types these
 * into the browser console.
 */
export interface ConsoleHandle {
  /** Every feature, whether it is switched on, and the options it offers. */
  list(): Array<{
    id: FeatureId;
    name: string;
    enabled: boolean;
    options: ListedOption[];
  }>;
  enable(id: FeatureId): void;
  disable(id: FeatureId): void;
  /**
   * Switches one of a feature's own options on or off.
   *
   * A key the feature does not declare is ignored. `list` shows the keys.
   */
  setOption(id: FeatureId, option: string, enabled: boolean): void;
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
        options: deps.registry.optionsOf(feature.id).map((option) => ({
          key: option.key,
          name: option.name,
          enabled: option.enabled,
        })),
      })),
    enable: (id) => deps.registry.setEnabled(id, true),
    disable: (id) => deps.registry.setEnabled(id, false),
    setOption: (id, option, enabled) =>
      deps.registry.setOptionEnabled(id, option, enabled),
    stop: () => deps.stop(),
  };
}
