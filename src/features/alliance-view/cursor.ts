/**
 * Which player the cursor sits over.
 *
 * This is the chain the game's own `HoverHighlightController` uses at `:52`:
 * turn the point into a tile, then read the owner out of that tile's packed
 * state. Read at OpenFrontIO commit 332e5410e.
 */

import type { GameView, TransformHandler } from "../../game/types";

/** The part of a tile's state that names its owner. `TileCodec.ts:9`. */
const OWNER_MASK = 0xfff;

/** Nobody. Water, an unclaimed tile, and a point off the map all read as this. */
export const NOBODY = 0;

/**
 * The `smallID` of the player who owns the tile under a point on the screen.
 *
 * Reads `NOBODY` over water, over an unclaimed tile, off the map, and whenever
 * the game answers badly. The subject sticks, so `NOBODY` leaves the map as it
 * is. A cursor that crosses open water does not throw the subject away.
 */
export function ownerUnderCursor(
  game: GameView,
  camera: TransformHandler,
  screenX: number,
  screenY: number,
): number {
  try {
    const cell = camera.screenToWorldCoordinates(screenX, screenY);
    if (!game.isValidCoord(cell.x, cell.y)) return NOBODY;
    const tile = game.ref(cell.x, cell.y);
    if (!game.isLand(tile)) return NOBODY;
    return game.tileState(tile) & OWNER_MASK;
  } catch {
    // The camera is rebuilt between matches, so it can be half built here.
    return NOBODY;
  }
}
