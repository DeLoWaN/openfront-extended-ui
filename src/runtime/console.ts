import type { FeatureId, OptionValue } from "./feature";
import type { Registry } from "./registry";

/** One of a feature's own choices, as a player sees it. */
export interface ListedOption {
  readonly key: string;
  readonly name: string;
  /** A switch reads `true` or `false`. An option holding a key code reads text. */
  readonly value: OptionValue;
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
   * Sets one of a feature's own options.
   *
   * A key the feature does not declare is ignored, and so is a value of the
   * wrong type. `list` shows the keys and what each one holds now.
   */
  setOption(id: FeatureId, option: string, value: OptionValue): void;
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
          value: option.value,
        })),
      })),
    enable: (id) => deps.registry.setEnabled(id, true),
    disable: (id) => deps.registry.setEnabled(id, false),
    setOption: (id, option, value) =>
      deps.registry.setOption(id, option, value),
    stop: () => deps.stop(),
  };
}
