/**
 * The canvas the spawn marks are drawn on.
 *
 * The map is one WebGL canvas with no element per tile, so the marks go on a
 * layer of the package's own, drawn again on every frame. See docs/adr/0005.
 * A canvas rather than one element per mark, because a team game can hold
 * dozens of marks that all move whenever the camera does.
 */

import { createMapCanvas } from "../../runtime/map-canvas";
import {
  breathOffset,
  nameBaseline,
  nameFontPx,
  ringRadius,
  ringStrokePx,
  type Pointer,
} from "./geometry";

/** The class of the canvas. The stylesheet places it over the map. */
export const LAYER = "ofx-spawn-marks";

/** The dark line under every shape, which keeps a colour readable on land. */
const OUTLINE = "rgba(0,0,0,0.85)";
const TEXT_OUTLINE = "rgba(0,0,0,0.9)";
/**
 * The colour of your own name and chevron. Your ring keeps your territory
 * colour, as docs/adr/0008 asks, so the name is what tells your mark apart.
 */
const YOUR_COLOUR = "#ffffff";
/** How much wider the dark line is than the colour above it, in pixels. */
const OUTLINE_EXTRA_PX = 4;

/**
 * The chevron's corners, in pixels along its direction and across it.
 *
 * The tip is first. The numbers are the first drawing of 25 px long, times
 * 2.4, which the player chose on issue #35 for being easy to see when zoomed in.
 */
const CHEVRON_SCALE = 2.4;
const CHEVRON = [
  [14, 0],
  [-8, -11],
  [-3, 0],
  [-8, 11],
] as const;
/** How far behind the anchor the count sits, in chevron units. */
const COUNT_BACK = 22;
/** The count's font size, in chevron units. */
const COUNT_FONT = 13;

const FONT_FAMILY = "system-ui, sans-serif";

/** A ring and its name, placed on the screen. */
export interface RingToDraw {
  /** Where the spawn is on the screen, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly colour: string;
  /** True for the local player's own mark. */
  readonly isYou: boolean;
}

/** Everything one frame draws. */
export interface Scene {
  readonly rings: readonly RingToDraw[];
  readonly pointers: readonly Pointer[];
  /** The size of a mark as a share of its nominal size. */
  readonly unit: number;
  /** The frame's time in milliseconds, which drives the breath. */
  readonly nowMs: number;
  /** How opaque the whole frame is, 0 to 1. */
  readonly alpha: number;
}

export interface MarkLayer {
  /** Wipes the canvas and draws one frame. */
  draw(scene: Scene): void;
  /** Wipes the canvas and keeps it. */
  clear(): void;
  /** Takes the canvas out of the page. */
  remove(): void;
}

export function createMarkLayer(host: ParentNode = document.body): MarkLayer {
  const { ctx, wipe, remove } = createMapCanvas(LAYER, host);

  function drawRing(ring: RingToDraw, unit: number, nowMs: number): void {
    const radius = ringRadius(unit) + breathOffset(nowMs);
    const width = ringStrokePx(unit);

    ctx.beginPath();
    ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
    ctx.lineWidth = width + OUTLINE_EXTRA_PX;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = ring.colour;
    ctx.stroke();

    // The name is placed from the ring at rest, so it stays still while the
    // ring breathes.
    drawText(
      ring.name,
      ring.x,
      ring.y - nameBaseline(unit),
      nameFontPx(unit),
      ring.isYou ? YOUR_COLOUR : ring.colour,
    );
  }

  function drawText(
    text: string,
    x: number,
    y: number,
    fontPx: number,
    colour: string,
  ): void {
    ctx.font = `700 ${fontPx}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = OUTLINE_EXTRA_PX;
    ctx.strokeStyle = TEXT_OUTLINE;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(text, x, y);
  }

  function drawPointer(pointer: Pointer): void {
    const colour = pointer.isYou ? YOUR_COLOUR : pointer.colour;
    ctx.save();
    ctx.translate(pointer.x, pointer.y);
    ctx.rotate(pointer.angle);
    ctx.beginPath();
    CHEVRON.forEach(([along, across], index) => {
      const x = along * CHEVRON_SCALE;
      const y = across * CHEVRON_SCALE;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.lineWidth = OUTLINE_EXTRA_PX;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.restore();

    if (pointer.count < 2) return;
    // The count sits behind the chevron, on the side away from the edge, so it
    // never leaves the screen.
    const back = COUNT_BACK * CHEVRON_SCALE;
    drawText(
      `×${pointer.count}`,
      pointer.x - Math.cos(pointer.angle) * back,
      pointer.y - Math.sin(pointer.angle) * back,
      COUNT_FONT * CHEVRON_SCALE,
      colour,
    );
  }

  return {
    draw(scene) {
      wipe();
      ctx.globalAlpha = scene.alpha;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const ring of scene.rings) drawRing(ring, scene.unit, scene.nowMs);
      for (const pointer of scene.pointers) drawPointer(pointer);
      ctx.globalAlpha = 1;
    },

    clear: wipe,
    remove,
  };
}
