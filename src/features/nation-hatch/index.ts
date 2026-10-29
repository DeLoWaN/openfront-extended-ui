import type { MapRenderer } from "../../game/types";
import type { Feature } from "../../runtime/feature";
import { logError } from "../../runtime/log";
import { mapHooksReader } from "../alliance-view/hooks";
import { isAllianceViewShowing } from "../alliance-view/showing";
import { createHatchLayer } from "./layer";
import { createNationMask, type RowSpan } from "./mask";
import { readHatchedNations } from "./nations";

/**
 * The nation hatch. Thin diagonal stripes cover each living nation's
 * territory for the whole match, so a player tells a nation from a human at a
 * glance, even when the human took a country's name.
 *
 * The stripes leave the territory's own colour visible between them, as
 * docs/adr/0008 allows. They only read the game and send no intent, as
 * docs/adr/0009 asks.
 *
 * The hatch stands aside in three cases:
 *
 * - In a Humans vs Nations match, where the team colour already tells.
 * - While the alliance view mode is up.
 * - While the game's own alternate view is on. That view draws each territory
 *   in a relation colour, which the stripes would cover.
 *
 * The hatch draws on a canvas of the package's own, drawn again whenever the
 * camera moves, because the camera gives no signal when it moves. See
 * docs/adr/0005.
 */

/**
 * How many game ticks pass between two reads of the map, about half a second.
 * One read walks every tile, which is millions on the larger maps.
 */
const REFRESH_TICKS = 5;

export const nationHatch: Feature = {
  id: "nation-hatch",
  name: "Nation stripes",
  description:
    "Thin stripes cover the territory of every Nation, so you can tell a Nation from a player who took a country's name. They are hidden in Humans vs Nations games.",

  attach(context) {
    const game = context.game;
    const readHooks = mapHooksReader();
    const layer = createHatchLayer(game.width(), game.height());
    context.onDetach(() => layer.remove());
    const mask = createNationMask(game.width(), game.height(), layer.pixels);

    /** The mask rows the canvas has not drawn yet, or null when it is current. */
    let pending: RowSpan | null = null;
    let refreshedAt = game.ticks();
    /** The camera and window the canvas was last drawn for. Empty while blank. */
    let drawnFor = "";
    let frame = 0;
    /** True once a frame failed. The hatch then stays off for the match. */
    let failed = false;

    function refresh(): void {
      const changed = mask.refresh(
        game.tileStateBuffer(),
        readHatchedNations(game),
      );
      if (!changed) return;
      pending = pending
        ? {
            first: Math.min(pending.first, changed.first),
            last: Math.max(pending.last, changed.last),
          }
        : changed;
    }

    function draw(): void {
      const hooks = readHooks();
      if (
        !hooks ||
        mask.isEmpty() ||
        isAlternateViewOn(hooks.view) ||
        isAllianceViewShowing()
      ) {
        if (drawnFor !== "") layer.clear();
        drawnFor = "";
        return;
      }

      const { camera } = hooks;
      const origin = camera.worldToScreenCoordinates({ x: 0, y: 0 });
      const placement = { x: origin.x, y: origin.y, scale: camera.scale };
      const viewKey = [
        placement.x,
        placement.y,
        placement.scale,
        window.innerWidth,
        window.innerHeight,
        window.devicePixelRatio,
      ].join(",");
      // A still camera over an unchanged map needs no new frame.
      if (!pending && viewKey === drawnFor) return;

      layer.draw(placement, pending);
      pending = null;
      drawnFor = viewKey;
    }

    /** Runs on every drawn frame, because the camera moves without a signal. */
    function step(): void {
      frame = requestAnimationFrame(step);
      try {
        draw();
      } catch (error) {
        // A loop that throws on every frame would fill the console.
        logError("the nation hatch failed on a frame", error);
        failed = true;
        stopLoop();
        layer.clear();
      }
    }

    function stopLoop(): void {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    }

    refresh();
    frame = requestAnimationFrame(step);
    context.onDetach(stopLoop);

    return {
      tick() {
        if (failed || game.ticks() - refreshedAt < REFRESH_TICKS) return;
        refreshedAt = game.ticks();
        refresh();
      },
    };
  },
};

/** The renderer's own flag, which the hold key and the settings menu both set. */
function isAlternateViewOn(view: MapRenderer): boolean {
  return view.renderer?.altView === true;
}
