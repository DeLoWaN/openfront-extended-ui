import type { GameView, PlayerView } from "../../game/types";
import {
  formatClock,
  playerOrNull,
  renewalWindow,
} from "../alliance-view/alliance";
import { readAllianceUpdates } from "./updates";

/**
 * What the alliance panel lists, and in which order.
 *
 * This holds the panel's whole memory and draws nothing. The panel lists three
 * kinds of row:
 *
 * - An alliance you are in, with the time it has left.
 * - An alliance request aimed at you, with the time you have left to answer.
 * - An alliance that just ran out, with the time since it ended.
 *
 * A broken alliance is never a row. The game reports a break on its own, and a
 * betrayal is not a renewal you forgot.
 */

/** How long an expired alliance stays in the list, in ticks. */
export const EXPIRED_STAYS_TICKS = 150;

export type RowKind = "alliance" | "request" | "expired";

export interface Row {
  /** Stays the same for as long as the row means the same thing. */
  readonly key: string;
  readonly kind: RowKind;
  /** The other player. A click on the row moves the camera to them. */
  readonly smallID: number;
  readonly name: string;
  /** `m:ss`. It counts down for an alliance or a request and up for an expired one. */
  readonly clock: string;
  /** True when the game is offering to renew this alliance and you have not agreed. */
  readonly urgent: boolean;
  /**
   * How much of the whole time is left, from 0 to 1. A bar draws it.
   *
   * The whole is the alliance's full run for an alliance and the time to
   * answer for a request. An expired row has nothing left, so it reads 0.
   */
  readonly fraction: number;
}

export interface AlliancePanelRows {
  /**
   * Takes in what the game reported in the last tick.
   *
   * Call once per game tick, before `rows`. A request, an expiry and an
   * agreement to renew each reach the client in one tick only, so a tick that
   * is not observed is lost.
   */
  observe(me: PlayerView): void;
  /** The rows to draw now, with the most time left first. */
  rows(me: PlayerView): Row[];
}

/** A row before it is sorted. `order` is the signed time left, in ticks. */
interface Sortable extends Row {
  readonly order: number;
}

export function createAlliancePanelRows(game: GameView): AlliancePanelRows {
  /** The request's own end tick, by the requestor's `smallID`. */
  const requests = new Map<number, number>();
  /** The tick each expired alliance ended, by the former partner's `smallID`. */
  const expired = new Map<number, number>();
  /**
   * The end tick an alliance had when you agreed to renew it, by alliance id.
   *
   * A renewal moves the end tick on, so the entry stops matching by itself and
   * the next renewal window starts clean.
   */
  const agreed = new Map<number, number>();

  return {
    observe(me) {
      const news = readAllianceUpdates(game);
      const now = game.ticks();
      const mine = me.smallID();

      for (const request of news.requests) {
        if (request.recipientID !== mine) continue;
        requests.set(
          request.requestorID,
          request.createdAt + game.config().allianceRequestDuration(),
        );
      }
      for (const reply of news.replies) {
        if (reply.recipientID === mine) requests.delete(reply.requestorID);
      }

      for (const end of news.expired) {
        const other =
          end.player1ID === mine
            ? end.player2ID
            : end.player2ID === mine
              ? end.player1ID
              : null;
        if (other === null) continue;
        const partner = playerOrNull(game, other);
        // The game's own notice stays quiet when either player is dead.
        if (!partner || !partner.isAlive() || !me.isAlive()) continue;
        expired.set(other, now);
      }

      const window = renewalWindow(game);
      for (const extension of news.extensions) {
        if (extension.playerID !== mine) continue;
        const alliance = me
          .alliances()
          .find((candidate) => candidate.id === extension.allianceID);
        // The second partner's agreement completes the renewal in the same
        // tick, and the alliance then reads as brand new. Noting it would mute
        // the next renewal window before it opens.
        if (!alliance || alliance.expiresAt - now > window) continue;
        agreed.set(alliance.id, alliance.expiresAt);
      }
    },

    rows(me) {
      const now = game.ticks();
      const window = renewalWindow(game);
      const allianceWhole = safely(() => game.config().allianceDuration()) ?? 0;
      const requestWhole =
        safely(() => game.config().allianceRequestDuration()) ?? 0;
      const listed: Sortable[] = [];
      const partners = new Set<number>();
      const live = new Set<number>();

      const byId = new Map<string, PlayerView>();
      for (const player of safely(() => game.players()) ?? []) {
        const id = safely(() => player.id());
        if (id !== undefined) byId.set(id, player);
      }

      for (const alliance of safely(() => me.alliances()) ?? []) {
        live.add(alliance.id);
        const partner = byId.get(alliance.other);
        if (!partner?.isAlive()) continue;
        const row = describe(partner, (smallID, name) => {
          const left = Math.max(0, alliance.expiresAt - now);
          return {
            key: `alliance:${alliance.id}`,
            kind: "alliance",
            smallID,
            name,
            clock: formatClock(left),
            urgent:
              left <= window && agreed.get(alliance.id) !== alliance.expiresAt,
            fraction: shareOf(left, allianceWhole),
            order: left,
          };
        });
        if (!row) continue;
        partners.add(row.smallID);
        listed.push(row);
      }

      // An alliance that ended and then began again is the live one.
      for (const smallID of partners) expired.delete(smallID);
      for (const id of agreed.keys()) if (!live.has(id)) agreed.delete(id);

      for (const [requestor, endsAt] of requests) {
        const partner = playerOrNull(game, requestor);
        const left = endsAt - now;
        if (left <= 0 || !partner?.isAlive() || partners.has(requestor)) {
          requests.delete(requestor);
          continue;
        }
        const row = describe(partner, (smallID, name) => ({
          key: `request:${smallID}`,
          kind: "request",
          smallID,
          name,
          clock: formatClock(left),
          urgent: false,
          fraction: shareOf(left, requestWhole),
          order: left,
        }));
        if (row) listed.push(row);
      }

      for (const [former, endedAt] of expired) {
        const since = now - endedAt;
        const partner = playerOrNull(game, former);
        if (since >= EXPIRED_STAYS_TICKS || !partner) {
          expired.delete(former);
          continue;
        }
        const row = describe(partner, (smallID, name) => ({
          key: `expired:${smallID}`,
          kind: "expired",
          smallID,
          name,
          clock: formatClock(since),
          urgent: false,
          fraction: 0,
          order: -since,
        }));
        if (row) listed.push(row);
      }

      // The list runs downward in time: the most time left on top, the
      // alliance nearest its end below it, and the finished rows under that.
      listed.sort((a, b) => b.order - a.order || a.smallID - b.smallID);
      return listed.map(({ order: _order, ...row }) => row);
    },
  };
}

/**
 * Builds one row from a player, or nothing when the game cannot answer for
 * them yet. The game builds a player view over several ticks, so a half-built
 * one can throw, and one bad row must not cost the others.
 */
function describe(
  player: PlayerView,
  build: (smallID: number, name: string) => Sortable,
): Sortable | null {
  try {
    return build(player.smallID(), player.displayName());
  } catch {
    return null;
  }
}

/** A part of a whole, kept between 0 and 1. A whole the match cannot report reads as full. */
function shareOf(left: number, whole: number): number {
  if (!(whole > 0)) return 1;
  return Math.max(0, Math.min(1, left / whole));
}

function safely<Value>(read: () => Value): Value | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}
