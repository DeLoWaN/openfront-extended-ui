import type { GameView } from "./types";

/**
 * Whether a live local player is on the board, with numbers worth a read.
 *
 * This is the test the game's own `<control-panel>` uses to decide whether to
 * show itself, so a feature that follows it appears and disappears with the
 * game's HUD.
 *
 * It is false in four cases: during the spawn phase, before the first game
 * update arrives, for the whole of a replay, and after the player dies. It says
 * nothing about whether the match has ended. The game offers no such test, and
 * the package works that out from the match boundary instead.
 */
export function isMatchLive(game: GameView): boolean {
  if (game.inSpawnPhase()) return false;
  const me = game.myPlayer();
  return me !== null && me.isAlive();
}
