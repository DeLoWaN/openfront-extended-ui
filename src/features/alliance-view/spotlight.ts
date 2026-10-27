/**
 * The one player another feature asks the alliance view mode to show on its own.
 *
 * The alliance panel sets it while the cursor rests on one of its rows. The
 * alliance view mode reads it, greys the map and keeps that one player in their
 * own colours. Neither feature imports the other's internals, and either one
 * works while the other is switched off.
 *
 * The state lives for the page, so whoever sets a player must clear it when
 * they stop. The mode itself holds nothing between matches.
 */

let spotlit: number | null = null;
const listeners = new Set<() => void>();

/** The `smallID` of the player to show alone, or null for nobody. */
export function spotlightedPlayer(): number | null {
  return spotlit;
}

/**
 * Sets the player to show alone, or clears it with null.
 *
 * A listener that throws is skipped and the others still run, because the one
 * caller is a mouse handler and must not break on another feature's error.
 */
export function setSpotlight(smallID: number | null): void {
  if (spotlit === smallID) return;
  spotlit = smallID;
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      continue;
    }
  }
}

/** Calls `listener` whenever the spotlit player changes. Returns the way to stop. */
export function onSpotlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
