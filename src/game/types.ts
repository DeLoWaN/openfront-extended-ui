/**
 * The parts of the game the package reads.
 *
 * These describe objects the game builds, not objects the package builds. Every
 * member here is a guess about somebody else's code, so each one names the file
 * it was read from. The game moves fast. Check a citation before you trust it.
 *
 * Read at OpenFrontIO commit 332e5410e.
 */

/** A player, as the client sees it. `src/client/view/PlayerView.ts`. */
export interface PlayerView {
  /** False after the player dies. The object itself is never removed. */
  isAlive(): boolean;
}

/**
 * One match, as the client sees it. `src/client/view/GameView.ts`.
 *
 * The game builds a new one of these per match and assigns it onto the same
 * `<control-panel>` element. Its identity is the only thing that tells two
 * matches apart.
 */
export interface GameView {
  /**
   * Null before the local player spawns, null until the first game update
   * arrives, and null for the whole match in a replay. Not null after death.
   */
  myPlayer(): PlayerView | null;
  /** True until the spawn phase ends. */
  inSpawnPhase(): boolean;
  /** 0 before the first game update. */
  ticks(): number;
}

/**
 * The page-wide event bus. `src/core/EventBus.ts`.
 *
 * One bus serves every match on the page, and it never forgets a listener.
 * `off` matches by function reference, so an inline arrow can never be removed.
 */
export interface EventBus {
  on(type: GameEventType, handler: GameEventHandler): void;
  off(type: GameEventType, handler: GameEventHandler): void;
}

/** The class the game emits, used as the bus key. */
export type GameEventType = abstract new (...args: never[]) => object;

export type GameEventHandler = (event: never) => void;

/**
 * The `<control-panel>` element. `index.html:338`, `ControlPanel.ts:26`.
 *
 * Static markup that lives for the whole page. `.game` is replaced each match.
 * `.eventBus` is the same object for every match, so it can never tell them
 * apart. Both are absent until the first match runs.
 */
export interface ControlPanel extends HTMLElement {
  game?: GameView;
  eventBus?: EventBus;
  /**
   * A prototype method the game's controller loop calls once per game tick.
   * An own property shadows it, and `delete` restores the original.
   */
  tick?(): void;
}
