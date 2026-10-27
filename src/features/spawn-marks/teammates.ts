import type { GameView, PlayerView } from "../../game/types";

/** One teammate who has picked a spawn, read from the game on one frame. */
export interface Teammate {
  readonly id: string;
  readonly name: string;
  /** The centre of the spawn tile, in world tiles. */
  readonly x: number;
  readonly y: number;
  /** The teammate's own territory colour, as a CSS `rgb()` value. */
  readonly colour: string;
}

/**
 * The teammates to mark, each at the tile they have picked now.
 *
 * Teammates are the players `isOnSameTeam` accepts. That call is false for
 * everybody in a game without teams, so such a game gives nobody. An alliance
 * partner is never one, because the game keeps the two relations apart.
 *
 * Only humans are marked by default, as the game's own spawn pulse draws only
 * humans. `includeNations` adds the Nations on the team. A Bot is never marked:
 * Bots sit on a team of their own.
 *
 * The spawn comes from `state.spawnTile` and not from `nameLocation()`, which
 * sits a third of a font size higher.
 */
export function readTeammates(
  game: GameView,
  includeNations: boolean,
): Teammate[] {
  const me = game.myPlayer();
  if (!me) return [];

  const teammates: Teammate[] = [];
  for (const player of game.players()) {
    if (player.id() === me.id() || !player.isOnSameTeam(me)) continue;
    if (!isMarked(player, includeNations)) continue;

    const tile = player.state.spawnTile;
    if (tile === undefined) continue;

    const { r, g, b } = player.territoryColor().toRgb();
    teammates.push({
      id: player.id(),
      name: player.displayName(),
      x: game.x(tile),
      y: game.y(tile),
      colour: `rgb(${r},${g},${b})`,
    });
  }
  return teammates;
}

function isMarked(player: PlayerView, includeNations: boolean): boolean {
  const type = player.type();
  return type === "HUMAN" || (includeNations && type === "NATION");
}
