import type {
  ControlPanel,
  GameEventHandler,
  GameEventType,
  GameView,
} from "../game/types";
import { logError } from "./log";

/**
 * What a feature is handed when a match starts.
 *
 * A feature takes everything from the page through this object, and the runtime
 * undoes all of it on detach. A feature that uses only these methods leaves no
 * trace when a player switches it off, and it needs no cleanup code of its own.
 */
export interface FeatureContext {
  /** The current match. A different object in the next match. */
  readonly game: GameView;
  /** The `<control-panel>` element. The same object for the whole page. */
  readonly panel: ControlPanel;

  /** Listens on the game's event bus. Removed on detach. */
  onGameEvent(type: GameEventType, handler: GameEventHandler): void;

  /** Runs on detach. Cleanups run in reverse order of registration. */
  onDetach(cleanup: () => void): void;
}

export interface AttachedContext {
  readonly context: FeatureContext;
  detach(): void;
}

export function createFeatureContext(deps: {
  panel: ControlPanel;
  game: GameView;
}): AttachedContext {
  const cleanups: Array<() => void> = [];

  const context: FeatureContext = {
    game: deps.game,
    panel: deps.panel,

    onGameEvent(type, handler) {
      const bus = deps.panel.eventBus;
      if (!bus) {
        // Silence here would leave the feature sure that it listens.
        logError("no event bus on the panel, so this listener never fires");
        return;
      }
      bus.on(type, handler);
      cleanups.push(() => bus.off(type, handler));
    },

    onDetach(cleanup) {
      cleanups.push(cleanup);
    },
  };

  return {
    context,
    detach() {
      // One broken cleanup must not strand the ones after it, or the package
      // leaves a node or a listener behind for the rest of the page's life.
      while (cleanups.length > 0) {
        const cleanup = cleanups.pop();
        try {
          cleanup?.();
        } catch (error) {
          logError("a cleanup failed on detach", error);
        }
      }
    },
  };
}
