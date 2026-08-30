/**
 * The clocks the alliance view mode draws on the map.
 *
 * The map is one WebGL canvas. There is no element per territory to hang a
 * label on, and the game draws its player names inside the renderer where a
 * userscript cannot reach. So the clocks are a layer of the package's own,
 * placed by measurement on every drawn frame. See docs/adr/0005.
 *
 * Each clock sits under its ally's own name, because `nameLocation()` hands
 * back the very anchor the game's name pass uses.
 *
 * The steps that set the size are the game's own, read from
 * `src/client/render/gl/shaders/name/name.vert.glsl:96` and the atlas metrics
 * in `resources/atlases/msdf-atlas.json`, at OpenFrontIO commit 332e5410e.
 */

import type { NameLocation, TransformHandler } from "../../game/types";
import { HIDDEN } from "../../runtime/styles";

/** The layer every clock is drawn on. */
export const LAYER = "ofx-alliance-clocks";
/** One clock. */
export const CLOCK = "ofx-alliance-clock";
/** A clock the game offers to renew now. */
export const URGENT = "ofx-alliance-clock-urgent";

/** `nameScaleFactor` in the game's render settings. */
const NAME_SCALE_FACTOR = 0.4;
/** `nameScaleCap` in the game's render settings. */
const NAME_SCALE_CAP = 3;
/** The atlas font size the game divides its name scale by. */
const FONT_SIZE = 48;
/** The atlas baseline the game multiplies its name scale by. */
const FONT_BASE = 36;
/** `cullThreshold`: below this share of the screen the game drops a name. */
const CULL_THRESHOLD = 0.008;

/**
 * How large one font unit draws, in pixels per unit of camera scale.
 *
 * The game's own ratio is `FONT_BASE / FONT_SIZE`. The clock draws larger than
 * that on purpose, which was judged on screen on issue #14.
 */
const CLOCK_PIXELS_PER_UNIT = 1.2;

/** How large a clock is allowed to grow, whatever the camera does. */
export const CLOCK_MAX_PX = 28;

/** How far below the name anchor a clock sits, as a share of its own size. */
const CLOCK_DROP = 0.9;

/** How far past the edge of the screen a clock is still worth placing. */
const OFF_SCREEN_MARGIN_PX = 100;

/** One ally's clock, ready to place. */
export interface Clock {
  /** Where the game draws this ally's own name. */
  readonly anchor: NameLocation;
  /** The time left, as a player reads it. */
  readonly text: string;
  /** True once the game offers to renew this alliance. */
  readonly urgent: boolean;
}

export interface ClockLayer {
  /**
   * Places one clock per ally.
   *
   * Call this on every drawn frame. The camera moves and sends no event, so a
   * clock placed once drifts away from the name it belongs to.
   */
  place(clocks: readonly Clock[], camera: TransformHandler): void;
  /** Takes every clock off the screen and keeps the layer. */
  hide(): void;
  /** Takes the layer out of the page. */
  remove(): void;
}

export function createClockLayer(host: ParentNode = document.body): ClockLayer {
  const root = document.createElement("div");
  root.className = LAYER;
  host.append(root);

  // A hover across a crowded map would otherwise build and drop nodes on every
  // frame, so the clocks are reused rather than rebuilt.
  const pool: HTMLElement[] = [];

  function nodeAt(index: number): HTMLElement {
    let node = pool[index];
    if (!node) {
      node = document.createElement("div");
      node.className = CLOCK;
      root.append(node);
      pool[index] = node;
    }
    return node;
  }

  function hideFrom(index: number): void {
    for (let i = index; i < pool.length; i++) {
      pool[i]?.classList.add(HIDDEN);
    }
  }

  return {
    place(clocks, camera) {
      const viewWidth = window.innerWidth;
      const viewHeight = window.innerHeight;

      let placed = 0;
      for (const clock of clocks) {
        const units = nameUnits(clock.anchor.size);
        if (!isNameDrawn(units, camera.scale, viewWidth)) continue;

        const at = camera.worldToScreenCoordinates(clock.anchor);
        if (
          at.x < -OFF_SCREEN_MARGIN_PX ||
          at.y < -OFF_SCREEN_MARGIN_PX ||
          at.x > viewWidth + OFF_SCREEN_MARGIN_PX ||
          at.y > viewHeight + OFF_SCREEN_MARGIN_PX
        ) {
          continue;
        }

        const size = Math.min(
          CLOCK_MAX_PX,
          units * camera.scale * CLOCK_PIXELS_PER_UNIT,
        );
        const node = nodeAt(placed++);
        node.classList.remove(HIDDEN);
        node.classList.toggle(URGENT, clock.urgent);
        node.style.left = `${at.x}px`;
        node.style.top = `${at.y + size * CLOCK_DROP}px`;
        node.style.fontSize = `${size}px`;
        node.textContent = clock.text;
      }
      hideFrom(placed);
    },

    hide: () => hideFrom(0),

    remove() {
      root.remove();
      pool.length = 0;
    },
  };
}

/**
 * How many font units one name draws at, before the camera is applied.
 *
 * A name grows with the square of its owner's room until a cap, not in step
 * with it, so a clock scaled straight from the camera would drift away from
 * the name as an empire grows.
 */
export function nameUnits(size: number): number {
  const baseSize = Math.max(1, Math.floor(size));
  const nameSize = Math.max(4, Math.floor(baseSize * NAME_SCALE_FACTOR));
  const nameScale = Math.min(baseSize * 0.25, NAME_SCALE_CAP);
  return nameSize * nameScale;
}

/**
 * Whether the game still draws the name this clock sits under.
 *
 * The game drops a name once it covers less than `CULL_THRESHOLD` of the
 * screen's width. A clock with no name over it has lost the thing it was
 * anchored to, and at that zoom the colour already answers who is in the web.
 *
 * The game measures this against a clip space two units wide, which is why the
 * screen width divides in twice over. The game scales both its camera and its
 * canvas by the device pixel ratio, so that ratio cancels and this check does
 * not need it.
 */
export function isNameDrawn(
  units: number,
  cameraScale: number,
  viewWidth: number,
): boolean {
  if (viewWidth <= 0) return false;
  const share = ((units * FONT_BASE) / FONT_SIZE) * ((2 * cameraScale) / viewWidth);
  return share >= CULL_THRESHOLD;
}
