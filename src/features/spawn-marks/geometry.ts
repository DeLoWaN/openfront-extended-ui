/**
 * The sizes and places of a spawn mark, as plain numbers.
 *
 * Nothing here touches the page or the game, so every figure can be checked on
 * its own. The numbers were chosen on screen, on issue #35, in a solo game on
 * World.
 */

/** The camera scale the game starts at on World at 1920 px wide. */
export const REFERENCE_SCALE = 0.864;

/** How small a mark may get, as a share of its nominal size. */
export const MIN_UNIT = 0.35;
/** How large a mark may get, as a share of its nominal size. */
export const MAX_UNIT = 4;

/** The radius of a ring at its nominal size, in pixels. */
const RING_RADIUS_PX = 16;
/** How far a ring breathes either way, in pixels. */
const BREATH_PX = 2;
/** Breath speed in radians per millisecond. One breath takes about 1.05 s. */
const BREATH_SPEED = 0.006;

/** The font size of a name at its nominal size, in pixels. */
const NAME_FONT_PX = 12;
/** A name never draws smaller than this, so it stays readable when zoomed out. */
const NAME_FONT_FLOOR_PX = 11;
/** The gap between the top of a ring at rest and the bottom of its name. */
const NAME_GAP_PX = 8;

/** The width of a ring's line at its nominal size, in pixels. */
const RING_STROKE_PX = 3;

/** Chevrons that land closer than this merge into one. */
export const MERGE_DISTANCE_PX = 70;

/**
 * How far a chevron keeps from each screen edge, in pixels.
 *
 * The bottom margin is larger because the game's bottom row sits there.
 */
export const EDGE_MARGIN_PX = { left: 60, right: 60, top: 60, bottom: 150 };

/** The size of a mark at one camera scale, as a share of its nominal size. */
export function markUnit(cameraScale: number): number {
  return Math.max(MIN_UNIT, Math.min(MAX_UNIT, cameraScale / REFERENCE_SCALE));
}

/** The radius of a ring at rest, in pixels. */
export function ringRadius(unit: number): number {
  return RING_RADIUS_PX * unit;
}

/** How far the ring's radius is from rest at one moment, in pixels. */
export function breathOffset(nowMs: number): number {
  return BREATH_PX * Math.sin(nowMs * BREATH_SPEED);
}

/** The width of a ring's line, in pixels. It never gets thinner than nominal. */
export function ringStrokePx(unit: number): number {
  return RING_STROKE_PX * Math.max(1, unit * 0.8);
}

/** The font size of a name, in pixels. */
export function nameFontPx(unit: number): number {
  return Math.max(NAME_FONT_FLOOR_PX, NAME_FONT_PX * unit);
}

/**
 * How far above the spawn the bottom of a name sits, in pixels.
 *
 * It is measured from the ring at rest, so the name stays still while the ring
 * breathes.
 */
export function nameBaseline(unit: number): number {
  return ringRadius(unit) + NAME_GAP_PX;
}

/** A spawn mark that is off screen, placed where the camera puts it. */
export interface OffScreenMark {
  readonly x: number;
  readonly y: number;
  readonly colour: string;
  readonly isYou: boolean;
}

/** One chevron on the edge of the screen. */
export interface Pointer {
  /** Where the chevron is anchored, on the margin rectangle, in screen pixels. */
  readonly x: number;
  readonly y: number;
  /** The direction the chevron points in, in radians. 0 is to the right. */
  readonly angle: number;
  /** How many spawn marks this chevron stands for. */
  readonly count: number;
  /** The colour of the first spawn mark that landed here. */
  readonly colour: string;
  /** True for the chevron that points at the local player's own spawn. */
  readonly isYou: boolean;
}

/**
 * Where the chevrons go for the spawn marks that are off screen.
 *
 * Each chevron sits where the line from the centre of the screen to its mark
 * crosses the margin rectangle, and points along that line. Chevrons that
 * land within `MERGE_DISTANCE_PX` of each other become one with a count.
 * The local player's chevron never joins another.
 */
export function placePointers(
  offScreen: readonly OffScreenMark[],
  view: { readonly width: number; readonly height: number },
): Pointer[] {
  const left = EDGE_MARGIN_PX.left;
  const top = EDGE_MARGIN_PX.top;
  // A screen smaller than its margins collapses the rectangle to a line, not
  // to a negative size, which would put a chevron on the far side.
  const right = Math.max(left, view.width - EDGE_MARGIN_PX.right);
  const bottom = Math.max(top, view.height - EDGE_MARGIN_PX.bottom);
  const centreX = view.width / 2;
  const centreY = view.height / 2;

  const pointers: Array<{
    x: number;
    y: number;
    angle: number;
    count: number;
    colour: string;
    isYou: boolean;
  }> = [];

  for (const mark of offScreen) {
    const dx = mark.x - centreX;
    const dy = mark.y - centreY;
    const reach = Math.min(
      dx > 0 ? (right - centreX) / dx : dx < 0 ? (left - centreX) / dx : Infinity,
      dy > 0 ? (bottom - centreY) / dy : dy < 0 ? (top - centreY) / dy : Infinity,
    );
    // A mark on the centre has no direction. It is never off screen, so this
    // only keeps a bad input from producing NaN.
    const k = Number.isFinite(reach) ? Math.max(0, reach) : 0;
    const x = centreX + dx * k;
    const y = centreY + dy * k;

    const near = mark.isYou
      ? undefined
      : pointers.find(
          (pointer) =>
            !pointer.isYou &&
            Math.hypot(pointer.x - x, pointer.y - y) < MERGE_DISTANCE_PX,
        );
    if (near) near.count++;
    else {
      pointers.push({
        x,
        y,
        angle: Math.atan2(dy, dx),
        count: 1,
        colour: mark.colour,
        isYou: mark.isYou,
      });
    }
  }
  return pointers;
}
