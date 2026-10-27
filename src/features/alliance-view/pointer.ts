/**
 * The pointer that shows where a spotlit player is when they are off screen.
 *
 * An ally you rest the cursor on is usually far away, so the greyed map shows
 * nothing in colour. The pointer is an arrow at the screen's edge, turned
 * toward that player, with their name under it. It is a mark of our own drawn
 * on top of the map. It never changes a real colour, and it takes the
 * player's own colour as its fill so a reader can tell whose it is. See
 * docs/adr/0008.
 *
 * Like the clocks, it is placed by measurement on every drawn frame, because
 * the camera moves and sends no event. It draws nothing while the player is on
 * screen, since their colour already answers the question there.
 */

import type { NameLocation, TransformHandler } from "../../game/types";
import { HIDDEN } from "../../runtime/styles";

/** The pointer. */
export const POINTER = "ofx-spotlight-pointer";
/** The arrow inside it. */
export const ARROW = "ofx-spotlight-arrow";
/** The name under the arrow. */
export const NAME = "ofx-spotlight-name";

/**
 * How far in from each edge of the screen the pointer sits, in pixels.
 *
 * The game's own panels sit in the corners and along the bottom edge, and the
 * pointer draws below them. A pointer on the very edge would often land under
 * one. The bottom is the largest: the troop bar and the hotbar take the middle
 * of that edge, and the pointer carries a name under its arrow.
 */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const EDGE_INSETS: Insets = { top: 72, right: 72, bottom: 150, left: 72 };

/** Where the pointer goes and which way it faces. */
export interface EdgePoint {
  readonly x: number;
  readonly y: number;
  /** Degrees. 0 faces right, 90 faces down. */
  readonly angle: number;
}

/**
 * Where the pointer goes for a target, or null while the target is on screen.
 *
 * The pointer sits where the line from the middle of the screen to the target
 * meets a rectangle drawn `insets` inside the edge. So it keeps the target's
 * bearing, and two targets on one bearing share a place.
 */
export function edgePoint(
  target: { x: number; y: number },
  width: number,
  height: number,
  insets: Insets = EDGE_INSETS,
): EdgePoint | null {
  if (target.x >= 0 && target.x <= width && target.y >= 0 && target.y <= height) {
    return null;
  }

  const centreX = width / 2;
  const centreY = height / 2;
  const dx = target.x - centreX;
  const dy = target.y - centreY;

  // How far along the line each side of the rectangle is. A line that never
  // reaches a side has no such distance. A window too small for its insets
  // leaves the pointer in the middle.
  const reach = (offset: number, near: number, far: number): number => {
    if (offset === 0) return Infinity;
    const side = offset > 0 ? far : near;
    return Math.max(0, side / Math.abs(offset));
  };
  const along = Math.min(
    reach(dx, centreX - insets.left, centreX - insets.right),
    reach(dy, centreY - insets.top, centreY - insets.bottom),
  );

  return {
    x: centreX + dx * along,
    y: centreY + dy * along,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/** The player a pointer is drawn for. */
export interface PointerTarget {
  /** Where the game draws this player's own name. */
  readonly anchor: NameLocation;
  readonly name: string;
  /** A CSS colour, taken from the player's own territory. */
  readonly colour: string;
}

export interface Pointer {
  /**
   * Draws the pointer for one target, or takes it off the screen for null or a
   * target that is on screen. Call this on every drawn frame.
   */
  place(target: PointerTarget | null, camera: TransformHandler): void;
  /** Takes the pointer off the screen and keeps its node. */
  hide(): void;
  /** Takes the pointer out of the page. */
  remove(): void;
}

export function createPointer(host: ParentNode = document.body): Pointer {
  const root = document.createElement("div");
  root.className = `${POINTER} ${HIDDEN}`;
  const arrow = document.createElement("div");
  arrow.className = ARROW;
  const name = document.createElement("div");
  name.className = NAME;
  root.append(arrow, name);
  host.append(root);

  return {
    place(target, camera) {
      if (!target) {
        root.classList.add(HIDDEN);
        return;
      }

      const at = camera.worldToScreenCoordinates(target.anchor);
      const point = edgePoint(at, window.innerWidth, window.innerHeight);
      if (!point) {
        root.classList.add(HIDDEN);
        return;
      }

      root.classList.remove(HIDDEN);
      root.style.left = `${point.x}px`;
      root.style.top = `${point.y}px`;
      root.style.setProperty("--ofx-pointer-colour", target.colour);
      arrow.style.transform = `rotate(${point.angle}deg)`;
      if (name.textContent !== target.name) name.textContent = target.name;
    },

    hide() {
      root.classList.add(HIDDEN);
    },

    remove() {
      root.remove();
    },
  };
}
