/**
 * Where the badge goes, where its arrow points, and how long it stays.
 *
 * Everything here is arithmetic on screen pixels. The badge node is in
 * `badge-node.ts`.
 */

/** How far the badge's top edge sits below the cursor, in pixels. */
export const BADGE_OFFSET_PX = 50;

/**
 * The widest angle the arrow may make with the vertical, in degrees.
 *
 * Past this the arrow lies almost flat when the cursor is far to one side,
 * which puts it back beside the cursor where the badge keeps clear.
 */
export const MAX_ARROW_DEGREES = 55;

/** How long the badge stays when the player has set nothing, in seconds. */
export const DEFAULT_SECONDS = 3.5;

const MIN_SECONDS = 0.5;
const MAX_SECONDS = 30;

/** A point on the screen, in pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The size of the badge's panel, in pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Where the badge's panel sits, as its top left corner. */
export interface Placement {
  readonly left: number;
  readonly top: number;
  /** The point the arrow starts from, in the middle of the panel's bottom edge. */
  readonly tail: Point;
}

/**
 * Places the panel under the cursor.
 *
 * The panel's centre sits on the cursor's own vertical axis, and its top edge
 * sits `BADGE_OFFSET_PX` below the cursor. Only a screen edge moves it
 * sideways, and nothing moves it up.
 *
 * Returns null when the panel would not fit below the cursor. The cursor is
 * then at the hotbar already, so a badge would only cover it.
 */
export function placeBadge(
  cursor: Point,
  panel: Size,
  screen: Size,
): Placement | null {
  const top = cursor.y + BADGE_OFFSET_PX;
  if (top + panel.height > screen.height) return null;

  const wanted = cursor.x - panel.width / 2;
  const left = Math.min(Math.max(wanted, 0), Math.max(screen.width - panel.width, 0));
  return { left, top, tail: { x: left + panel.width / 2, y: top + panel.height } };
}

/**
 * The angle of the arrow, in degrees from straight down.
 *
 * Positive points to the right of the screen. The angle is capped at
 * `MAX_ARROW_DEGREES` on either side. A target level with the tail or above it
 * gets the cap, towards the side the target is on.
 */
export function arrowDegrees(tail: Point, target: Point): number {
  const across = target.x - tail.x;
  const down = target.y - tail.y;
  const side = across < 0 ? -1 : 1;
  if (down <= 0) return side * MAX_ARROW_DEGREES;

  const degrees = (Math.atan(Math.abs(across) / down) * 180) / Math.PI;
  return side * Math.min(degrees, MAX_ARROW_DEGREES);
}

/**
 * The point the arrow aims at.
 *
 * One icon is aimed at in its middle. Two or more are aimed at between them,
 * so one arrow serves a badge that carries both.
 */
export function aimPoint(centres: readonly Point[]): Point | null {
  if (centres.length === 0) return null;
  const total = centres.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / centres.length, y: total.y / centres.length };
}

/**
 * How long the badge stays, from the text a player stored.
 *
 * Text that is not a number between half a second and thirty seconds reads as
 * nothing stored, so a typo cannot keep the badge on screen for good or hide it.
 */
export function stayMs(text: string): number {
  const seconds = Number(text.trim());
  const valid =
    text.trim() !== "" &&
    Number.isFinite(seconds) &&
    seconds >= MIN_SECONDS &&
    seconds <= MAX_SECONDS;
  return (valid ? seconds : DEFAULT_SECONDS) * 1000;
}
