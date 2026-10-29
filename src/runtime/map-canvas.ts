/**
 * A canvas of the package's own, over the whole window, for a feature that
 * draws on the map.
 *
 * The map is one WebGL canvas with no element per tile, so a feature that
 * draws on it needs a layer of its own. See docs/adr/0005. The stylesheet
 * places the canvas by its class.
 */
export interface MapCanvas {
  readonly ctx: CanvasRenderingContext2D;
  /**
   * Wipes the canvas and returns the window's size in CSS pixels.
   *
   * It first makes the canvas cover the window at the device's own
   * resolution, and sets the transform so the caller draws in CSS pixels.
   */
  wipe(): { width: number; height: number };
  /** Takes the canvas out of the page. */
  remove(): void;
}

/** Throws when the page gives no 2D canvas, so the feature fails on attach. */
export function createMapCanvas(
  className: string,
  host: ParentNode = document.body,
): MapCanvas {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  host.append(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    throw new Error(`the page gave no 2D canvas for ${className}`);
  }

  /**
   * Read on every frame, because a window resize and a move to a screen of
   * another density both change it and neither tells the package. Writing the
   * size also wipes the canvas, so it is written only when it differs.
   */
  function fit(): { width: number; height: number } {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  return {
    ctx,
    wipe() {
      const size = fit();
      ctx.clearRect(0, 0, size.width, size.height);
      return size;
    },
    remove() {
      canvas.remove();
    },
  };
}
