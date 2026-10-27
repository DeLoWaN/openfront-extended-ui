import type { UnitDisplay } from "../../game/types";

/**
 * Where the game draws its hotbar, and what each icon costs now.
 *
 * Every selector here reads the game's own markup, which the game can rename at
 * any time. When that happens these return nothing and the readout draws
 * nothing, which is the loud failure rather than the quiet one.
 *
 * Read from `render` and `renderUnitItem` in
 * `src/client/hud/layers/UnitDisplay.ts` at OpenFrontIO commit 332e5410e.
 */

/** The element the game draws the hotbar in. `index.html:339`. */
const HOTBAR = "unit-display";

/** An item is positioned, which is what the cue draws against. */
const ITEM_IS_POSITIONED = "relative";

/** One of the three icons the readout draws under. */
export interface CuedIcon {
  /** The game's own `UnitType` value. `Game.ts:179`. */
  readonly type: string;
  /** What the game writes in the icon's `alt`. `UnitDisplay.ts:277`. */
  readonly icon: string;
}

/**
 * The three icons the readout draws under, in the order the hotbar lists them.
 *
 * These are the only three whose price stops rising, so they are the only
 * three with a cheap window to miss.
 */
export const CUED_ICONS: readonly CuedIcon[] = [
  { type: "City", icon: "city" },
  { type: "Factory", icon: "factory" },
  { type: "Port", icon: "port" },
];

/**
 * The hotbars in the page.
 *
 * The game writes one `<unit-display>` into its static markup, so this
 * normally returns one. The element stays in the page while the game draws
 * nothing inside it, which is what happens during the spawn phase, after you
 * die, and throughout a replay.
 */
export function findHotbars(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(HOTBAR)];
}

/**
 * The item one icon sits in.
 *
 * The readout places both of its nodes against this item. An item the game no
 * longer positions is read as no item: the nodes would otherwise be placed
 * against some ancestor and land far from the icon.
 *
 * Returns null when the game has not drawn the hotbar yet, or has changed the
 * markup under us.
 */
export function findIconItem(
  hotbar: HTMLElement,
  icon: string,
): HTMLElement | null {
  const image = hotbar.querySelector<HTMLElement>(`img[alt="${icon}"]`);
  // The icon sits in a row of its own, inside the box, inside the item.
  const item = image?.parentElement?.parentElement?.parentElement;
  if (!item?.classList.contains(ITEM_IS_POSITIONED)) return null;
  return item;
}

/**
 * What one item costs now, in gold.
 *
 * The game works the price out in its simulation worker and writes the answer
 * on the element, so no price formula is rewritten here and none can drift
 * from the game's.
 *
 * Returns null until the first prices arrive, for an item the game did not
 * price, and for a price that is not gold. A caller must draw nothing in all
 * three: a guessed price reads exactly like a real one.
 */
export function readCost(hotbar: UnitDisplay, type: string): bigint | null {
  const priced = hotbar.playerBuildables?.find((item) => item.type === type);
  if (typeof priced?.cost !== "bigint") return null;
  return priced.cost;
}
