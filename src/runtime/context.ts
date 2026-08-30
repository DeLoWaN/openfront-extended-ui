import type {
  ControlPanel,
  GameEventHandler,
  GameEventType,
  GameView,
} from "../game/types";
import type { OptionValue } from "./feature";
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

  /**
   * Listens on the page's own window. Removed on detach.
   *
   * The game's event bus carries the game's own events alone, so a key press
   * and a cursor position have to come from the window instead.
   *
   * A throw from the handler is caught here, because nothing a feature does
   * runs outside a try/catch.
   */
  onWindowEvent<Type extends keyof WindowEventMap>(
    type: Type,
    handler: (event: WindowEventMap[Type]) => void,
    options?: AddEventListenerOptions,
  ): void;

  /**
   * Whether one of this feature's own options is switched on.
   *
   * Read this where the option is used, not once at attach. A player can
   * switch one while a match runs, and the next read is what picks that up.
   * Asking for an option the feature never declared reports it as off.
   */
  isOptionEnabled(option: string): boolean;

  /**
   * What one of this feature's own text options is set to.
   *
   * Read this where the option is used, not once at attach, so a player who
   * changes it while a match runs is picked up. An option the feature never
   * declared, and one that holds a switch rather than text, both read as an
   * empty string.
   */
  optionText(option: string): string;

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
  /** The stored value, or the option's own default. False for an unknown key. */
  optionValue: (option: string) => OptionValue;
}): AttachedContext {
  const cleanups: Array<() => void> = [];

  const context: FeatureContext = {
    game: deps.game,
    panel: deps.panel,

    isOptionEnabled: (option) => {
      const value = deps.optionValue(option);
      return typeof value === "boolean" ? value : false;
    },

    optionText: (option) => {
      const value = deps.optionValue(option);
      return typeof value === "string" ? value : "";
    },

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

    onWindowEvent(type, handler, options) {
      const guarded = (event: Event): void => {
        try {
          handler(event as WindowEventMap[typeof type]);
        } catch (error) {
          logError("a window event handler failed", error);
        }
      };

      window.addEventListener(type, guarded, options);
      // `removeEventListener` matches on the capture flag as well as the
      // function, so a listener added in the capture phase and removed without
      // it stays registered forever.
      cleanups.push(() => window.removeEventListener(type, guarded, options));
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
