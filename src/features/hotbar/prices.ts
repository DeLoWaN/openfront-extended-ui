/**
 * The price step of a city, a port or a factory.
 *
 * The game prices each of the three at `min(1,000,000, 2^n * 125,000)`, where
 * `n` counts the ones you own. `Config.ts:391`, `:467` and `:478` all carry
 * that formula. So the price passes through 125,000, 250,000 and 500,000, and
 * then stops at one million for good.
 *
 * The step is read back from the price, and never from a count of units.
 */

/** The price of the first one. */
const FIRST_PRICE = 125_000;

/** The price that never changes again. `Config.ts:393`. */
export const PRICE_CAP = 1_000_000n;

/** How many price steps there are, and so how many marks are drawn. */
export const STEP_COUNT = 3;

/**
 * The price step this price is, counting from one.
 *
 * Returns null when the price is not one of the three, which covers two real
 * cases. The price has reached the cap, so the cheap window is over. Or the
 * lobby gives this player infinite gold, and the game prices every unit at
 * nothing. A caller must draw nothing in both.
 */
export function priceStep(cost: bigint): number | null {
  const price = Number(cost);
  if (price < FIRST_PRICE || price >= Number(PRICE_CAP)) return null;

  const step = 1 + Math.log2(price / FIRST_PRICE);
  // A price the game did not work out with this formula lands between two
  // steps. Rounding it would draw a step the player cannot reach.
  return Number.isInteger(step) ? step : null;
}
