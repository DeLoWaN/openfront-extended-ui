import type { GameView, PlayerView } from "../../game/types";

/** One player who has picked a spawn, read from the game on one frame. */
export interface MarkedPlayer {
  readonly id: string;
  readonly name: string;
  /** The centre of the spawn tile, in world tiles. */
  readonly x: number;
  readonly y: number;
  /** The player's own territory colour, as a CSS `rgb()` value. */
  readonly colour: string;
  /** True for the local player, whose mark stands apart from a teammate's. */
  readonly isYou: boolean;
}

/**
 * The local player and their teammates, each at the tile they have picked now.
 *
 * Teammates are the players `isOnSameTeam` accepts. That call is false for
 * everybody in a game without teams, so such a game gives the local player
 * alone. An alliance partner is never one, because the game keeps the two
 * relations apart.
 *
 * Only human teammates are marked by default, as the game's own spawn pulse
 * draws only humans. `includeNations` adds the Nations on the team. A Bot is
 * never marked: Bots sit on a team of their own.
 *
 * The spawn comes from `state.spawnTile` and not from `nameLocation()`, which
 * sits a third of a font size higher.
 */
export function readMarkedPlayers(
  game: GameView,
  includeNations: boolean,
): MarkedPlayer[] {
  const me = game.myPlayer();
  if (!me) return [];

  const marked: MarkedPlayer[] = [];
  for (const player of game.players()) {
    if (player.id() === me.id() || !player.isOnSameTeam(me)) continue;
    if (!isMarkedTeammate(player, includeNations)) continue;
    const mark = readMark(game, player, false);
    if (mark) marked.push(mark);
  }

  const mine = readMark(game, me, true);
  if (mine) marked.push(mine);
  return marked;
}

/** The player's mark, or null before they pick a spawn. */
function readMark(
  game: GameView,
  player: PlayerView,
  isYou: boolean,
): MarkedPlayer | null {
  const tile = player.state.spawnTile;
  if (tile === undefined) return null;

  const { r, g, b } = player.territoryColor().toRgb();
  return {
    id: player.id(),
    name: player.displayName(),
    x: game.x(tile),
    y: game.y(tile),
    colour: `rgb(${r},${g},${b})`,
    isYou,
  };
}

function isMarkedTeammate(player: PlayerView, includeNations: boolean): boolean {
  const type = player.type();
  return type === "HUMAN" || (includeNations && type === "NATION");
}
