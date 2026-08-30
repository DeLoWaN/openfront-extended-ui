/**
 * What the alliance view mode reaches for in the page.
 *
 * Two things, and neither belongs to the `<control-panel>` every other feature
 * works from. `window.__webglView` is the map renderer, assigned by
 * `ClientGameRunner.ts:394` with no development-only guard, so it is there in a
 * real match too. The camera is assigned onto the `<build-menu>` element by
 * `GameRenderer.ts:87`. Read at OpenFrontIO commit 332e5410e.
 *
 * Neither appears until a match runs, so this returns null until then and the
 * mode does nothing.
 */

import type { BuildMenu, MapRenderer, TransformHandler } from "../../game/types";

const BUILD_MENU = "build-menu";

declare global {
  interface Window {
    /** The map renderer the game leaves on the page. */
    __webglView?: MapRenderer;
  }
}

/** The renderer and the camera, both live. */
export interface MapHooks {
  readonly view: MapRenderer;
  readonly camera: TransformHandler;
}

/**
 * A reader for the two hooks, or null while either is missing.
 *
 * The `<build-menu>` element is static markup that lives for the whole page, so
 * it is cached and looked up again only if it leaves. The camera itself is read
 * fresh every time, because the game builds a new one for each match.
 */
export function mapHooksReader(): () => MapHooks | null {
  let menu: BuildMenu | null = null;

  return () => {
    const view = window.__webglView;
    if (!view) return null;

    if (!menu?.isConnected) {
      menu = document.querySelector<BuildMenu>(BUILD_MENU);
    }
    const camera = menu?.transformHandler;
    if (!camera) return null;

    return { view, camera };
  };
}
