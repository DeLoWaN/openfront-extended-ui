/**
 * Where the game draws its troop bars.
 *
 * Every selector here reads the game's own markup, which the game can rename at
 * any time. When that happens these return nothing and the package draws
 * nothing, which is the loud failure rather than the quiet one.
 *
 * This belongs to the throwaway marker and goes when the marker goes. The troop
 * bar readout writes its own placement.
 */

/** The blue fill inside the troop bar. */
const TROOP_FILL = ".bg-malibu-blue";
/** The bar itself, which is the fill's grandparent. */
const BAR_CLIPS = "overflow-hidden";

/**
 * The cells that hold the troop bars, one per bar.
 *
 * The game keeps a desktop bar and a mobile bar in the page at all times and
 * hides one of them, so this normally returns two cells.
 */
export function findTroopBarCells(panel: HTMLElement): HTMLElement[] {
  const cells: HTMLElement[] = [];
  for (const fill of panel.querySelectorAll(TROOP_FILL)) {
    const bar = fill.parentElement?.parentElement;
    if (!bar?.classList.contains(BAR_CLIPS)) continue;
    const cell = bar.parentElement;
    if (cell instanceof HTMLElement) cells.push(cell);
  }
  return cells;
}
