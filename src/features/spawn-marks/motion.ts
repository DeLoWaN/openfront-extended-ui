import type { MarkedPlayer } from "./players";

/** How long a mark takes to move to a new spawn, in milliseconds. */
export const GLIDE_MS = 350;
/** How long the marks take to fade once the spawn phase ends, in milliseconds. */
export const FADE_MS = 1200;

/** One mark, placed where it is drawn at one moment. */
export interface TrackedMark {
  readonly id: string;
  readonly name: string;
  readonly colour: string;
  readonly isYou: boolean;
  /** In world tiles. Between two spawns while the mark glides. */
  readonly x: number;
  readonly y: number;
}

export interface MarkTracker {
  /**
   * Takes the players the game reports now.
   *
   * A player whose spawn moved starts a glide from where their mark is drawn
   * at `nowMs`. A player the game no longer reports loses the mark.
   */
  update(players: readonly MarkedPlayer[], nowMs: number): void;
  /** Where every mark is drawn at `nowMs`. */
  marks(nowMs: number): TrackedMark[];
  /** Forgets every mark. */
  clear(): void;
}

interface Tracked {
  name: string;
  colour: string;
  isYou: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** When the glide to `to` began. */
  startedAt: number;
}

export function createMarkTracker(): MarkTracker {
  const tracked = new Map<string, Tracked>();

  function place(mark: Tracked, nowMs: number): { x: number; y: number } {
    const progress = Math.min(1, Math.max(0, (nowMs - mark.startedAt) / GLIDE_MS));
    // Ease out: the mark leaves fast and settles gently.
    const eased = 1 - (1 - progress) * (1 - progress);
    return {
      x: mark.fromX + (mark.toX - mark.fromX) * eased,
      y: mark.fromY + (mark.toY - mark.fromY) * eased,
    };
  }

  return {
    update(players, nowMs) {
      const live = new Set<string>();
      for (const player of players) {
        live.add(player.id);
        const known = tracked.get(player.id);
        if (!known) {
          tracked.set(player.id, {
            name: player.name,
            colour: player.colour,
            isYou: player.isYou,
            fromX: player.x,
            fromY: player.y,
            toX: player.x,
            toY: player.y,
            startedAt: nowMs,
          });
          continue;
        }

        known.name = player.name;
        known.colour = player.colour;
        known.isYou = player.isYou;
        if (known.toX !== player.x || known.toY !== player.y) {
          const here = place(known, nowMs);
          known.fromX = here.x;
          known.fromY = here.y;
          known.toX = player.x;
          known.toY = player.y;
          known.startedAt = nowMs;
        }
      }
      for (const id of [...tracked.keys()]) {
        if (!live.has(id)) tracked.delete(id);
      }
    },

    marks(nowMs) {
      return [...tracked.entries()].map(([id, mark]) => ({
        id,
        name: mark.name,
        colour: mark.colour,
        isYou: mark.isYou,
        ...place(mark, nowMs),
      }));
    },

    clear: () => tracked.clear(),
  };
}

/**
 * How opaque the marks are, `endedAtMs` after the spawn phase ended.
 *
 * The fade is linear. It reads 1 at the moment the phase ends and 0 once
 * `FADE_MS` has passed.
 */
export function fadeAlpha(endedAtMs: number, nowMs: number): number {
  return Math.min(1, Math.max(0, 1 - (nowMs - endedAtMs) / FADE_MS));
}
