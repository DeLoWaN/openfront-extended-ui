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

  /**
   * Listens on the game's event bus. Removed on detach.
   *
   * A throw from the handler is caught here, because the game's own bus has no
   * try/catch around the listeners it calls.
   */
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
      // The game calls every listener in a plain loop with no try/catch. A
      // throw from here would reach the game code that sent the event, and the
      // listeners queued behind this one would never run.
      const guarded: GameEventHandler = (event) => {
        try {
          handler(event);
        } catch (error) {
          logError("a game event handler failed", error);
        }
      };

      bus.on(type, guarded);
      // `off` matches by function reference, so it takes the wrapper.
      cleanups.push(() => bus.off(type, guarded));
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
