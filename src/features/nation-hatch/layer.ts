/**
 * The canvas the nation hatch is drawn on.
 *
 * Each frame fills the screen with stripes, then keeps them only where the
 * mask is opaque. The stripes are laid in screen pixels, so their spacing
 * stays the same at every zoom. The mask is scaled with the camera, one mask
 * pixel per tile.
 */

import { createMapCanvas } from "../../runtime/map-canvas";
import type { RowSpan } from "./mask";

/** The class of the canvas. The stylesheet places it over the map. */
export const LAYER = "ofx-nation-hatch";

/** The side of the square that repeats to make the stripes, in CSS pixels. */
const STRIPE_SPACING_PX = 8;
/**
 * Each stripe is a dark line with a light line beside it, so it shows on a
 * light territory and on a dark one. The territory's colour stays visible in
 * the gap, as docs/adr/0008 asks.
 */
const DARK_STRIPE = { colour: "rgba(20,20,30,0.55)", widthPx: 1.6, offsetPx: 0 };
const LIGHT_STRIPE = { colour: "rgba(255,255,255,0.35)", widthPx: 1.2, offsetPx: 2.5 };

/** Where the map's top left corner sits on the screen, and its zoom. */
export interface MapPlacement {
  /** Screen pixels of world point (0, 0). */
  readonly x: number;
  readonly y: number;
  /** Screen pixels per world tile. */
  readonly scale: number;
}

export interface HatchLayer {
  /** The mask: one RGBA pixel per tile, row after row. Only the alpha counts. */
  readonly pixels: Uint8ClampedArray;
  /**
   * Wipes the canvas and draws the hatch over the masked tiles.
   *
   * `changedRows` are the rows of `pixels` that changed since the last draw.
   * Only those are sent to the mask canvas, because a large map holds tens of
   * megabytes of mask.
   */
  draw(placement: MapPlacement, changedRows: RowSpan | null): void;
  /** Wipes the canvas and keeps it. */
  clear(): void;
  /** Takes the canvas out of the page. */
  remove(): void;
}

/** Throws when the page gives no 2D canvas, so the feature fails on attach. */
export function createHatchLayer(
  mapWidth: number,
  mapHeight: number,
  host: ParentNode = document.body,
): HatchLayer {
  const { ctx, wipe, remove } = createMapCanvas(LAYER, host);

  // The mask lives off the page, at one pixel per tile.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mapWidth;
  maskCanvas.height = mapHeight;
  const maskCtx = context2d(maskCanvas);
  const maskImage = maskCtx.createImageData(mapWidth, mapHeight);

  const stripes = ctx.createPattern(stripeTile(), "repeat");
  if (!stripes) throw new Error("the page gave no pattern for the nation hatch");

  return {
    pixels: maskImage.data,

    draw(placement, changedRows) {
      if (changedRows) {
        maskCtx.putImageData(
          maskImage,
          0,
          0,
          0,
          changedRows.first,
          mapWidth,
          changedRows.last - changedRows.first + 1,
        );
      }
      const { width, height } = wipe();

      ctx.fillStyle = stripes;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "destination-in";
      // With smoothing on, each tile's edge blurs into its neighbours.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        maskCanvas,
        placement.x,
        placement.y,
        mapWidth * placement.scale,
        mapHeight * placement.scale,
      );
      ctx.globalCompositeOperation = "source-over";
    },

    clear() {
      wipe();
    },

    remove,
  };
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("the page gave no 2D canvas for the nation hatch");
  return ctx;
}

/** One square of the stripes, drawn so that copies of it join with no seam. */
function stripeTile(): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = STRIPE_SPACING_PX;
  tile.height = STRIPE_SPACING_PX;
  const ctx = context2d(tile);

  for (const stripe of [DARK_STRIPE, LIGHT_STRIPE]) {
    ctx.strokeStyle = stripe.colour;
    ctx.lineWidth = stripe.widthPx;
    ctx.beginPath();
    // The line x + y = c, drawn once inside the square and once on each side,
    // so the part a copy cuts off at one edge comes back at the other.
    for (const shift of [-STRIPE_SPACING_PX, 0, STRIPE_SPACING_PX]) {
      const c = stripe.offsetPx + shift;
      ctx.moveTo(c + STRIPE_SPACING_PX, -STRIPE_SPACING_PX);
      ctx.lineTo(c - STRIPE_SPACING_PX, STRIPE_SPACING_PX);
    }
    ctx.stroke();
  }
  return tile;
}
