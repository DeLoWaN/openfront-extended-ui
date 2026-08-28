import type { ControlPanel, GameView } from "../game/types";
import { logError } from "./log";

/**
 * How often the package looks for a match boundary.
 *
 * Nothing in the game reacts within half a second of a match boundary, and the
 * check costs one identity comparison on one property.
 */
const BOUNDARY_POLL_MS = 500;

export interface MatchHandlers {
  onMatchStart(game: GameView): void;
  onMatchEnd(): void;
  onTick(): void;
}

export interface Lifecycle {
  stop(): void;
}

/**
 * Follows the game from one match to the next.
 *
 * The `<control-panel>` element lives for the whole page and is never rebuilt.
 * Each match assigns a new object to its `.game` property, so that object's
 * identity is the only thing that separates two matches. `.eventBus` is the
 * same object for every match, so it can never separate them.
 */
export function startLifecycle(deps: {
  panel: ControlPanel;
  handlers: MatchHandlers;
}): Lifecycle {
  const { panel, handlers } = deps;

  /**
   * The last match the poll saw on the panel, followed or not.
   *
   * A return to the lobby without a page reload leaves the finished match on
   * `.game`. Without this field, the next poll reads that dead match as a new
   * one.
   */
  let seenGame: GameView | null = null;
  /** The match the package follows now. */
  let currentGame: GameView | null = null;

  function checkBoundary(): void {
    // `.game` is undefined, not null, before the first match of the page.
    const game = panel.game ?? null;
    if (game === seenGame) return;

    endMatch();
    seenGame = game;
    if (game) startMatch(game);
  }

  function startMatch(game: GameView): void {
    currentGame = game;
    hookTick();
    handlers.onMatchStart(game);
  }

  function endMatch(): void {
    if (!currentGame) return;
    currentGame = null;
    unhookTick();
    handlers.onMatchEnd();
  }

  /**
   * Shadows the panel's own `tick` with an own property.
   *
   * The game's controller loop calls `tick` on each controller and has no
   * try/catch. An error here skips every controller after `control-panel` and
   * breaks the game's own HUD. So the game's own tick runs first, and the
   * package's work is wrapped.
   */
  function hookTick(): void {
    const gameOwnTick = panel.tick;
    if (typeof gameOwnTick !== "function") {
      // The element exists in the page before the game registers the class
      // behind it. Silence here leaves every feature drawn once and never
      // updated, which is the quiet failure.
      logError("the panel has no tick method, so no feature can follow a tick");
      return;
    }

    panel.tick = function patchedTick(this: ControlPanel) {
      gameOwnTick.call(this);
      if (!this.game) return;
      try {
        handlers.onTick();
      } catch (error) {
        logError("a tick failed", error);
      }
    };
  }

  /** `tick` is a prototype method, so `delete` restores the game's own one. */
  function unhookTick(): void {
    delete panel.tick;
  }

  const poll = setInterval(checkBoundary, BOUNDARY_POLL_MS);

  // Two of the game's exits never change `.game`, so the poll cannot see them.
  // `pagehide` covers every exit that leaves the page. `leave-lobby` covers the
  // exits that return to the lobby with no page reload.

  // `pagehide` also fires when the browser puts the page in its back/forward
  // cache, and the same page can come back alive afterwards. So this forgets
  // the match it saw, which lets a later poll pick the same match up again.
  const onPageHide = () => {
    if (!currentGame) return;
    endMatch();
    seenGame = null;
  };
  // A return to the lobby is final for that match, and `.game` still points at
  // it, so the match stays remembered and no poll picks it up again.
  const onLeaveLobby = () => endMatch();
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("leave-lobby", onLeaveLobby);

  return {
    stop() {
      clearInterval(poll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("leave-lobby", onLeaveLobby);
      endMatch();
    },
  };
}
