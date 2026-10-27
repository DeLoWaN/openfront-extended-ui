import { arrowDegrees, placeBadge, type Point, type Size } from "./badge";

/**
 * The badge node: a small amber panel under the cursor, and an arrow under it.
 *
 * It is one element of the package's own, fixed to the window. It is placed
 * once when it appears and never follows the cursor, so it needs no frame loop.
 * See docs/adr/0005 for why the map surface draws a layer of its own.
 */

/** The badge, fixed to the window. */
export const BADGE = "ofx-hotbar-badge";
/** The badge while it shows. It pulses about once a second. */
export const BADGE_SHOWN = "ofx-hotbar-badge-shown";
/** The panel that carries the icons. */
const PANEL = "ofx-hotbar-badge-panel";
/** One icon in the panel. */
const ICON = "ofx-hotbar-badge-icon";
/** The arrow under the panel. */
const ARROW = "ofx-hotbar-badge-arrow";

/** How long the fade takes, in milliseconds. The stylesheet holds the same. */
export const FADE_MS = 400;

export interface BadgeNode {
  /**
   * Shows the badge with one icon per image address, aimed at a point.
   *
   * Returns false, and draws nothing, when the panel would not fit below the
   * cursor.
   */
  show(icons: readonly string[], cursor: Point, target: Point): boolean;
  /** Fades the badge out, then hides it. */
  fade(): void;
  /** Hides the badge at once. */
  hide(): void;
  isShown(): boolean;
  /** Takes the badge out of the page. */
  remove(): void;
}

export function createBadgeNode(host: ParentNode = document.body): BadgeNode {
  const root = document.createElement("div");
  root.className = BADGE;
  root.hidden = true;

  const panel = document.createElement("div");
  panel.className = PANEL;
  const arrow = document.createElement("div");
  arrow.className = ARROW;
  root.append(panel, arrow);
  host.append(root);

  let fadeTimer: ReturnType<typeof setTimeout> | undefined;

  function stopFade(): void {
    clearTimeout(fadeTimer);
    fadeTimer = undefined;
    root.classList.remove("ofx-hotbar-badge-fading");
  }

  function hide(): void {
    stopFade();
    root.classList.remove(BADGE_SHOWN);
    root.hidden = true;
  }

  return {
    show(icons, cursor, target) {
      stopFade();
      panel.replaceChildren(
        ...icons.map((src) => {
          const image = document.createElement("img");
          image.className = ICON;
          image.src = src;
          image.alt = "";
          return image;
        }),
      );

      // The panel has to be in the page to be measured.
      root.hidden = false;
      const size: Size = {
        width: panel.offsetWidth,
        height: panel.offsetHeight,
      };
      const placed = placeBadge(cursor, size, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      if (!placed) {
        hide();
        return false;
      }

      root.style.left = `${placed.left}px`;
      root.style.top = `${placed.top}px`;
      arrow.style.transform = `rotate(${arrowDegrees(placed.tail, target)}deg)`;
      // Reading a layout figure makes the browser finish the removal, so the
      // class starts the pulse again instead of letting an old one run on.
      root.classList.remove(BADGE_SHOWN);
      void root.offsetWidth;
      root.classList.add(BADGE_SHOWN);
      return true;
    },

    fade() {
      if (root.hidden || fadeTimer !== undefined) return;
      root.classList.add("ofx-hotbar-badge-fading");
      fadeTimer = setTimeout(hide, FADE_MS);
    },

    hide,

    isShown: () => !root.hidden,

    remove() {
      stopFade();
      root.remove();
    },
  };
}
