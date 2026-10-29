import type { GameView } from "../../game/types";

/**
 * The team preset where one whole team is nations. `GameTypes.ts:94`, read at
 * OpenFrontIO commit 8ca8e5895.
 */
const HUMANS_VS_NATIONS = "Humans Vs Nations";

/**
 * The `smallID` of every player the nation hatch covers: each living nation.
 *
 * Empty in a Humans vs Nations match, where the team colour already sets every
 * nation apart and stripes would cover half the map.
 */
export function readHatchedNations(game: GameView): ReadonlySet<number> {
  const hatched = new Set<number>();
  if (game.config().gameConfig().playerTeams === HUMANS_VS_NATIONS) {
    return hatched;
  }
  for (const player of game.players()) {
    if (player.type() === "NATION" && player.isAlive()) {
      hatched.add(player.smallID());
    }
  }
  return hatched;
}
