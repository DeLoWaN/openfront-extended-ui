/**
 * Who is in the subject's alliance web, and how long each alliance has left.
 *
 * The subject is the player the map is drawn around, named by their `smallID`.
 * Only their direct alliance partners are in the web: one ring, because an
 * alliance is a contract between two players and the question at the cursor is
 * who comes to this player's aid. See issue #13.
 *
 * Every read here is guarded. The game builds a player view over several ticks,
 * so a half-built one can throw, and one bad ally must not cost the whole web.
 */

import type { GameView, PlayerView } from "../../game/types";

/**
 * How the game turns ticks into seconds.
 *
 * It divides by a fixed ten at `PlayerPanel.ts:150`. A singleplayer speed
 * setting moves the real tick rate, so the game's own countdown is wrong
 * whenever the speed is not normal. This copies the game and does not correct
 * it, because two clocks that disagree read as a bug. See issue #13.
 */
const TICKS_PER_SECOND = 10;

/** The renewal window to use when the match will not report its own. */
const EXTENSION_WINDOW_TICKS = 300;

/** One of the subject's alliance partners. */
export interface Ally {
  readonly player: PlayerView;
  readonly smallID: number;
  /** Ticks until this alliance ends, or null when the game reports no row. */
  readonly remainingTicks: number | null;
  /** True once the game offers to renew this one. */
  readonly urgent: boolean;
}

/** The subject, their alliance partners, and who the map keeps in colour. */
export interface AllianceWeb {
  readonly subject: PlayerView;
  readonly allies: readonly Ally[];
  /** The subject and every ally. Everybody else greys. */
  readonly coloured: ReadonlySet<number>;
}

/**
 * The web around one subject, or null when there is no subject to draw.
 *
 * Null means the map goes back to the game's own colours. It happens before the
 * cursor has found anyone, over an unclaimed tile, and for a player the match
 * cannot resolve.
 */
export function readWeb(
  game: GameView,
  subjectID: number,
): AllianceWeb | null {
  const subject = playerOrNull(game, subjectID);
  if (!subject) return null;

  const allies = readAllies(subject, subjectID);
  const expiry = readExpiry(game, subject);
  const window = renewalWindow(game);

  const coloured = new Set<number>([subjectID]);
  const web: Ally[] = [];
  for (const [smallID, player] of allies) {
    coloured.add(smallID);
    const remainingTicks = expiry.get(player.id()) ?? null;
    web.push({
      player,
      smallID,
      remainingTicks,
      urgent: remainingTicks !== null && remainingTicks <= window,
    });
  }
  return { subject, allies: web, coloured };
}

/** A clock a player reads, as `m:ss`. */
export function formatClock(remainingTicks: number): string {
  const seconds = Math.max(0, Math.floor(remainingTicks / TICKS_PER_SECOND));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The subject's alliance partners, keyed by `smallID`.
 *
 * The subject is dropped, because a player who was both greyed and coloured
 * would draw whichever slot was written last.
 */
function readAllies(
  subject: PlayerView,
  subjectID: number,
): Map<number, PlayerView> {
  let listed: readonly PlayerView[];
  try {
    listed = subject.allies();
  } catch {
    // `allies` resolves every partner through the game's own player lookup,
    // which throws for an id it does not know yet.
    return new Map();
  }

  const allies = new Map<number, PlayerView>();
  for (const ally of listed) {
    let smallID: number;
    try {
      smallID = ally.smallID();
    } catch {
      continue;
    }
    if (smallID === subjectID) continue;
    allies.set(smallID, ally);
  }
  return allies;
}

/**
 * The end tick of each of the subject's alliances, keyed by the partner's id.
 *
 * An alliance names its partner by `PlayerID`, which is a different identifier
 * from the `smallID` the palette is keyed by, so the two are matched here.
 *
 * The game builds this list for every player rather than only the local one, so
 * a stranger's clocks are readable. It shows the figure itself only for an
 * alliance you are in, at `PlayerInfoOverlay.ts:394`. Reading it for somebody
 * else is the same move the colours make: the reference point shifts from you
 * to whoever you point at.
 */
function readExpiry(game: GameView, subject: PlayerView): Map<string, number> {
  const remaining = new Map<string, number>();
  let alliances: ReturnType<PlayerView["alliances"]>;
  try {
    alliances = subject.alliances() ?? [];
  } catch {
    return remaining;
  }

  const now = game.ticks();
  for (const alliance of alliances) {
    remaining.set(alliance.other, Math.max(0, alliance.expiresAt - now));
  }
  return remaining;
}

/**
 * The last stretch of an alliance, in ticks.
 *
 * This is the game's own renewal window, so a red clock means the game offers
 * to renew that alliance now. The window is read from the match rather than
 * written here, so the two stay in step if the game ever moves it.
 */
function renewalWindow(game: GameView): number {
  try {
    const window = game.config().allianceExtensionPromptOffset();
    return window > 0 ? window : EXTENSION_WINDOW_TICKS;
  } catch {
    return EXTENSION_WINDOW_TICKS;
  }
}

/** The player owning one `smallID`, or null. 0 is TerraNullius, not a player. */
function playerOrNull(game: GameView, smallID: number): PlayerView | null {
  if (smallID === 0) return null;
  try {
    const player = game.playerBySmallID(smallID);
    return player.isPlayer() ? player : null;
  } catch {
    return null;
  }
}
