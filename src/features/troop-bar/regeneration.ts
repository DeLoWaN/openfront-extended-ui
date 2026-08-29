/**
 * The regeneration curve, and the plateau the readout draws.
 *
 * Regeneration is the troops the game gives you each tick for free. Its rate
 * depends on how full your army already is: it rises, peaks near 42% full, and
 * falls to zero at your maximum.
 *
 * Everything here is worked out once, at load. The plateau never moves during a
 * match, which is what lets the readout draw it as a fixed strip.
 * See docs/adr/0004.
 */

/**
 * The game's own rate, from `troopIncreaseRate` in
 * `src/core/configuration/Config.ts:875`, read at OpenFrontIO commit 332e5410e.
 *
 * The game scales this by player type and by difficulty. None of those factors
 * appear here, because a share of the best rate divides them out.
 */
function rate(internalTroops: number, internalMaxTroops: number): number {
  const toAdd = 10 + Math.pow(internalTroops, 0.73) / 4;
  return toAdd * (1 - internalTroops / internalMaxTroops);
}

/**
 * The army size the curve is worked out at, as an internal troop count.
 *
 * The game keeps its internal count ten times larger than the number it prints,
 * so this is 100,000 displayed troops.
 *
 * One fixed size is enough because the share of best rate barely depends on it.
 * Across 5,000 to 500,000 displayed troops the curve moves by under one point
 * everywhere the plateau lies. A size that followed the match would make the
 * percentage and the strip disagree, because only the percentage would move.
 */
const REFERENCE_MAX_TROOPS = 1_000_000;

/** The share of the best rate that the plateau's edges mark. */
export const PLATEAU_SHARE = 0.95;

/** A troop level, as a fraction of your maximum. This is the bar's fill. */
type TroopLevel = number;

function rateAtLevel(level: TroopLevel): number {
  return rate(level * REFERENCE_MAX_TROOPS, REFERENCE_MAX_TROOPS);
}

function clampToBar(level: TroopLevel): TroopLevel {
  return Math.min(1, Math.max(0, level));
}

/**
 * The troop level where regeneration peaks.
 *
 * The curve has one maximum, so a ternary search finds it. The familiar 42.2%
 * result drops the constant 10 from the game's formula; this does not, so it
 * returns the true peak, which sits a little lower.
 */
function findPeak(): TroopLevel {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 200; step++) {
    const third = (high - low) / 3;
    const left = low + third;
    const right = high - third;
    if (rateAtLevel(left) < rateAtLevel(right)) low = left;
    else high = right;
  }
  return (low + high) / 2;
}

const PEAK: TroopLevel = findPeak();
const BEST_RATE = rateAtLevel(PEAK);

/**
 * The troop level where regeneration peaks, as a fraction of your maximum.
 *
 * Nothing in the readout draws this level. It is the reference the plateau is
 * checked against. See docs/adr/0004.
 */
export function troopLevelOfPeakRate(): TroopLevel {
  return PEAK;
}

/**
 * Your regeneration at a troop level, as a fraction of the best rate you could
 * reach at any level.
 *
 * Returns 1 at the peak and 0 at a full army. A level outside the bar is
 * clamped to it, because a share above 1 would report a rate the game cannot
 * give.
 */
export function shareOfBestRate(level: TroopLevel): number {
  return rateAtLevel(clampToBar(level)) / BEST_RATE;
}

/**
 * The one troop level on the given side of the peak whose share is `share`.
 *
 * The curve rises to the peak and falls after it, so each side crosses any
 * share exactly once and a bisection finds the crossing.
 */
function findCrossing(share: number, side: "below" | "above"): TroopLevel {
  // The peak always reaches the share, and the level at the end of the side
  // never does. Each step halves the gap between the two.
  let reaches = PEAK;
  let fallsShort = side === "below" ? 0 : 1;
  for (let step = 0; step < 100; step++) {
    const middle = (reaches + fallsShort) / 2;
    if (shareOfBestRate(middle) >= share) reaches = middle;
    else fallsShort = middle;
  }
  return (reaches + fallsShort) / 2;
}

/**
 * The troop levels whose regeneration reaches `PLATEAU_SHARE` of the best rate.
 *
 * This is 30.6% to 54.3% full, about a quarter of the bar. Its midpoint sits
 * within 0.55 of a point of the peak, which is why nothing marks the peak
 * itself. See docs/adr/0004.
 */
export const PLATEAU: { readonly lo: TroopLevel; readonly hi: TroopLevel } = {
  lo: findCrossing(PLATEAU_SHARE, "below"),
  hi: findCrossing(PLATEAU_SHARE, "above"),
};
