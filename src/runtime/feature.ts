import type { FeatureContext } from "./context";

/**
 * The key a feature is stored and switched off under.
 *
 * It never changes once a version ships, because a stored setting is written
 * against it.
 */
export type FeatureId = string;

/** What a feature does for as long as one match lasts. */
export interface FeatureSession {
  /**
   * Runs once per game tick, after the game finishes its own update, so the
   * match state is complete and consistent. Ten times a second by default, but
   * singleplayer and replays scale that, and a pause stops it.
   */
  tick?(): void;
}

/**
 * One Feature, in the sense CONTEXT.md gives the word.
 *
 * A feature never attaches or detaches itself, and never asks whether it is
 * switched on. The runtime hands it a context when a match starts, and it takes
 * everything from the page through that context, so the runtime can undo all of
 * it. Nothing a feature does runs outside a try/catch.
 */
export interface Feature {
  readonly id: FeatureId;
  /** The name a player reads when they choose what to switch off. */
  readonly name: string;

  /**
   * Runs once when a match starts, or when a player switches the feature on
   * while a match runs. Returns what to do for the rest of the match, or
   * nothing when there is no per-tick work.
   */
  attach(context: FeatureContext): FeatureSession | void;
}
