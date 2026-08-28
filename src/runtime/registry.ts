import type { ControlPanel, GameView } from "../game/types";
import { createFeatureContext, type AttachedContext } from "./context";
import type {
  Feature,
  FeatureId,
  FeatureOption,
  FeatureSession,
} from "./feature";
import { logError } from "./log";
import type { Settings } from "./settings";

interface Attachment {
  readonly context: AttachedContext;
  readonly session: FeatureSession | null;
}

export interface Match {
  readonly panel: ControlPanel;
  readonly game: GameView;
}

/**
 * Every feature the package ships, and which of them are switched on.
 *
 * Nothing a feature does runs outside a try/catch here, so one broken feature
 * costs only itself. `hookTick` in `lifecycle.ts` carries the reason.
 */
export interface Registry {
  readonly features: readonly Feature[];

  attachAll(match: Match): void;
  detachAll(): void;
  tickAll(): void;

  isEnabled(id: FeatureId): boolean;
  setEnabled(id: FeatureId, enabled: boolean): void;

  /** The options one feature declares, and whether each is switched on. */
  optionsOf(id: FeatureId): Array<FeatureOption & { enabled: boolean }>;
  setOptionEnabled(id: FeatureId, option: string, enabled: boolean): void;
}

export function createRegistry(deps: {
  features: readonly Feature[];
  settings: Settings;
}): Registry {
  const { features, settings } = deps;
  const attached = new Map<FeatureId, Attachment>();
  let currentMatch: Match | null = null;

  /**
   * The option a feature declared under this key, if it declared one.
   *
   * An undeclared key must never reach storage, for the same reason an unknown
   * feature id must not: an option shipped under that key later would start
   * switched off and nobody would know why.
   */
  function optionOf(feature: Feature, key: string): FeatureOption | undefined {
    return feature.options?.find((option) => option.key === key);
  }

  function featureOf(id: FeatureId): Feature | undefined {
    return features.find((candidate) => candidate.id === id);
  }

  function attach(feature: Feature, match: Match): void {
    if (attached.has(feature.id)) return;
    const context = createFeatureContext({
      panel: match.panel,
      game: match.game,
      isOptionEnabled: (key) => {
        const option = optionOf(feature, key);
        if (!option) {
          logError(
            `the ${feature.id} feature asked for the option ${key}, which it does not declare`,
          );
          return false;
        }
        return settings.isOptionEnabled(feature.id, key, option.whenUnset);
      },
    });

    let session: FeatureSession | null = null;
    try {
      session = feature.attach(context.context) ?? null;
    } catch (error) {
      logError(`the ${feature.id} feature failed to start`, error);
      // Whatever it took from the page before it failed still comes back.
      context.detach();
      return;
    }
    attached.set(feature.id, { context, session });
  }

  function detach(id: FeatureId): void {
    const attachment = attached.get(id);
    if (!attachment) return;
    attached.delete(id);
    attachment.context.detach();
  }

  return {
    features,

    attachAll(match) {
      currentMatch = match;
      for (const feature of features) {
        if (settings.isEnabled(feature.id)) attach(feature, match);
      }
    },

    detachAll() {
      currentMatch = null;
      for (const id of [...attached.keys()]) detach(id);
    },

    tickAll() {
      for (const feature of features) {
        const session = attached.get(feature.id)?.session;
        if (!session?.tick) continue;
        try {
          session.tick();
        } catch (error) {
          logError(`the ${feature.id} feature failed on a tick`, error);
        }
      }
    },

    isEnabled: (id) => settings.isEnabled(id),

    optionsOf(id) {
      const feature = featureOf(id);
      return (feature?.options ?? []).map((option) => ({
        ...option,
        enabled: settings.isOptionEnabled(id, option.key, option.whenUnset),
      }));
    },

    // A readout reads its options on each tick, so nothing has to be
    // reattached for a change to show.
    setOptionEnabled(id, option, enabled) {
      const feature = featureOf(id);
      if (!feature || !optionOf(feature, option)) return;
      settings.setOptionEnabled(id, option, enabled);
    },

    setEnabled(id, enabled) {
      const feature = featureOf(id);
      // An unknown id must never reach storage. A feature shipped under that
      // id later would start switched off, and nobody would know why.
      if (!feature) return;

      settings.setEnabled(id, enabled);
      if (enabled) {
        if (currentMatch) attach(feature, currentMatch);
      } else {
        detach(id);
      }
    },
  };
}
