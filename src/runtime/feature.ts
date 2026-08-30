import type { FeatureContext } from "./context";

/**
 * The key a feature is stored and switched off under.
 *
 * It never changes once a version ships, because a stored setting is written
 * against it.
 */
export type FeatureId = string;

/**
 * What one of a feature's own options can be set to.
 *
 * A switch is a boolean. An option that holds a key code is text.
 */
export type OptionValue = boolean | string;

/**
 * Whether a stored value is the same kind as the option's own default.
 *
 * An option's default says which kind it holds. A value of the other kind
 * reaching the option leaves the feature on its own default for good, and
 * nothing says why.
 */
export function matchesOption(value: unknown, whenUnset: OptionValue): boolean {
  return typeof value === typeof whenUnset;
}

/**
 * One choice a feature offers beyond being switched on or off.
 *
 * A feature declares its options so the runtime can refuse a key nothing
 * offers, the same way it refuses an unknown feature id.
 */
export interface FeatureOption {
  /** The key the choice is stored under. It never changes once it ships. */
  readonly key: string;
  /** The name a player reads when they choose. */
  readonly name: string;
  /**
   * What the option means before a player has chosen.
   *
   * Its type is the option's type. A stored value of another type is read as
   * nothing stored, so a switch can never come back as text.
   */
  readonly whenUnset: OptionValue;
}

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
  /** The choices this feature offers beyond on and off. */
  readonly options?: readonly FeatureOption[];

  /**
   * Runs once when a match starts, or when a player switches the feature on
   * while a match runs. Returns what to do for the rest of the match, or
   * nothing when there is no per-tick work.
   */
  attach(context: FeatureContext): FeatureSession | void;
}
