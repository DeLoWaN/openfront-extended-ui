import type { GameView } from "../../game/types";

/**
 * The alliance news the game reports for one tick.
 *
 * Every player is named by `smallID`. A renewal is not here as a request:
 * the game sends it as an extension.
 */
export interface AllianceUpdates {
  /** Someone asks someone else for an alliance. `createdAt` is a tick. */
  readonly requests: readonly {
    requestorID: number;
    recipientID: number;
    createdAt: number;
  }[];
  /** A request was answered. It may have been accepted or rejected. */
  readonly replies: readonly { requestorID: number; recipientID: number }[];
  /** An alliance ran out. A broken alliance is a different update and is not read. */
  readonly expired: readonly { player1ID: number; player2ID: number }[];
  /** One partner agreed to renew one alliance. */
  readonly extensions: readonly { playerID: number; allianceID: number }[];
}

const NONE: AllianceUpdates = {
  requests: [],
  replies: [],
  expired: [],
  extensions: [],
};

/**
 * Reads the alliance news from the last tick.
 *
 * The game keeps one list per kind of update and keys it by `GameUpdateType`,
 * a numeric enum written in source order. The page does not expose the enum,
 * and a member added in the game moves every number after it. Reading the
 * lists by number would work on the commit this was written against and go
 * silently blank on the first release that adds a member. So each list is
 * told apart by the fields its first update carries. Every update in one list
 * has the same kind.
 *
 * Returns no news when the game reports no tick yet, or when a list holds
 * something this cannot read.
 */
export function readAllianceUpdates(game: GameView): AllianceUpdates {
  const lists = game.updatesSinceLastTick();
  if (!lists) return NONE;

  const requests: Array<AllianceUpdates["requests"][number]> = [];
  const replies: Array<AllianceUpdates["replies"][number]> = [];
  const expired: Array<AllianceUpdates["expired"][number]> = [];
  const extensions: Array<AllianceUpdates["extensions"][number]> = [];

  for (const list of Object.values(lists)) {
    if (!list || list.length === 0) continue;
    const first = list[0];
    if (typeof first !== "object" || first === null) continue;

    if (hasNumbers(first, "requestorID", "recipientID", "createdAt")) {
      for (const update of list) {
        if (hasNumbers(update, "requestorID", "recipientID", "createdAt")) {
          requests.push(update);
        }
      }
    } else if (isReply(first)) {
      for (const update of list) {
        if (isReply(update)) replies.push(update.request);
      }
    } else if (hasNumbers(first, "player1ID", "player2ID")) {
      for (const update of list) {
        if (hasNumbers(update, "player1ID", "player2ID")) expired.push(update);
      }
    } else if (hasNumbers(first, "playerID", "allianceID")) {
      for (const update of list) {
        if (hasNumbers(update, "playerID", "allianceID")) {
          extensions.push(update);
        }
      }
    }
  }

  return { requests, replies, expired, extensions };
}

/** Whether a value is an object holding every named field as a number. */
function hasNumbers<Key extends string>(
  value: unknown,
  ...keys: Key[]
): value is Record<Key, number> {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return keys.every((key) => typeof fields[key] === "number");
}

/** The shape of a reply: the request it answers, and whether it was accepted. */
function isReply(
  value: unknown,
): value is { request: { requestorID: number; recipientID: number } } {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as Record<string, unknown>;
  return (
    typeof fields.accepted === "boolean" &&
    hasNumbers(fields.request, "requestorID", "recipientID")
  );
}
