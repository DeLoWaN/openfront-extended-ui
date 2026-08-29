/**
 * Where the game draws its troop bars, and what level each one shows.
 *
 * Every selector here reads the game's own markup, which the game can rename at
 * any time. When that happens these return nothing and the readout draws
 * nothing, which is the loud failure rather than the quiet one.
 *
 * Read from `renderDesktopTroopBar` and `renderMobileTroopBar` in
 * `src/client/hud/layers/ControlPanel.ts` at OpenFrontIO commit 332e5410e.
 */

/** The fill that draws your troops. The bar's first fill. */
const TROOPS_FILL = ".bg-malibu-blue";
/** The bar clips its own overflow, which is how it is told from other nodes. */
const BAR_CLIPS = "overflow-hidden";

/**
 * The troop bars in the page.
 *
 * The game keeps a wide bar and a narrow bar in the page at all times and hides
 * one of them with CSS, so this normally returns two. Each bar is already
 * positioned and already clips its overflow, so the package can draw inside one
 * without writing a property on it.
 */
export function findTroopBars(panel: HTMLElement): HTMLElement[] {
  const bars: HTMLElement[] = [];
  for (const troops of panel.querySelectorAll<HTMLElement>(TROOPS_FILL)) {
    const bar = troops.parentElement?.parentElement;
    if (!bar?.classList.contains(BAR_CLIPS)) continue;
    bars.push(bar);
  }
  return bars;
}

/**
 * The node holding a bar's two fills.
 *
 * The package's own nodes go straight after it. The bar lists its fills first
 * and its troop numbers second, and nothing in it sets a `z-index`, so a node
 * inserted there draws over the fills and under the numbers.
 *
 * Returns null when the bar has no fills, which means the game has changed the
 * markup under us.
 */
export function findFills(bar: HTMLElement): HTMLElement | null {
  return bar.querySelector<HTMLElement>(TROOPS_FILL)?.parentElement ?? null;
}

/**
 * The fraction of a scale transform the game wrote on a fill.
 *
 * The game writes the fill's width as `transform: scaleX(...)` and rewrites it
 * on every tick. The troops fill carries nothing else, so a bare `scaleX` is
 * the whole transform.
 */
const SCALE_X = /^\s*scaleX\(\s*([-\d.e+]+)\s*\)\s*$/i;

/**
 * The troop level the bar draws, as a fraction of your maximum.
 *
 * Returns null when the game has not written a fill yet, or has written one the
 * package does not understand. A caller must draw nothing in that case: a level
 * guessed here would print as a confident percentage.
 *
 * Only the troops fill counts. Committed troops are drawn in a second fill
 * stacked after it, and they leave your pool the moment an attack launches, so
 * they no longer feed regeneration.
 */
export function readTroopLevel(bar: HTMLElement): number | null {
  const troops = bar.querySelector<HTMLElement>(TROOPS_FILL);
  if (!troops) return null;

  const scale = SCALE_X.exec(troops.style.transform);
  if (!scale) return null;

  const level = Number(scale[1]);
  if (!Number.isFinite(level)) return null;

  // The bar cannot draw past its own ends, so neither can the level read off it.
  return Math.min(1, Math.max(0, level));
}
