/**
 * Whether the alliance view mode has its own colours on the map now.
 *
 * The state lives for the page and stays false while the mode is switched
 * off. The mode sets it, and must clear it whenever its colours come off the
 * map, detach included.
 */

let showing = false;

/** True while the alliance view mode is up. */
export function isAllianceViewShowing(): boolean {
  return showing;
}

/** Records whether the mode's colours are on the map. */
export function setAllianceViewShowing(value: boolean): void {
  showing = value;
}
