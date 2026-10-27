import type { Feature } from "../../runtime/feature";
import { logError } from "../../runtime/log";
import { mapHooksReader } from "../alliance-view/hooks";
import {
  markUnit,
  placePointers,
  type OffScreenMark,
} from "./geometry";
import { createMarkLayer, type RingToDraw } from "./layer";
import { createMarkTracker, fadeAlpha } from "./motion";
import { readTeammates } from "./teammates";

/**
 * The spawn marks. During the spawn phase of a team game, each teammate's
 * spawn carries a ring with the teammate's name above it, in the teammate's own
 * territory colour. A teammate who is off screen gets a chevron at the edge of
 * the screen, pointing at them.
 *
 * The marks sit over the game's own spawn pulse and never change a colour of
 * the game's, so they stay inside docs/adr/0008. They only read the game and
 * send no intent, as docs/adr/0009 asks.
 *
 * The marks draw on a canvas of the package's own, placed again on every drawn
 * frame because the camera moves without telling anyone. See docs/adr/0005.
 *
 * The feature ends with the spawn phase: the marks fade and the loop stops. A
 * game without teams has no teammate, and a replay has no local player, so
 * both draw nothing.
 */

const NATION_TEAMMATES_OPTION = "nation-teammates";

export const spawnMarks: Feature = {
  id: "spawn-marks",
  name: "Spawn marks",
  options: [
    {
      key: NATION_TEAMMATES_OPTION,
      // A solo game holds one human, so it has no human teammate to mark.
      // This is how a solo game, and the test bed on issue #34, can show them.
      name: "Mark Nation teammates too",
      whenUnset: false,
    },
  ],

  attach(context) {
    const readHooks = mapHooksReader();
    const layer = createMarkLayer();
    const tracker = createMarkTracker();

    let frame = 0;
    /** When the spawn phase was first seen to be over, once it is. */
    let phaseEndedAt: number | null = null;

    /**
     * Draws one frame. Returns false once there is nothing left to draw.
     *
     * The phase never starts again inside one match, so once it is over and the
     * fade has run, the loop has no more work.
     */
    function draw(now: number): boolean {
      const game = context.game;
      let alpha = 1;

      if (game.inSpawnPhase()) {
        phaseEndedAt = null;
        tracker.update(
          readTeammates(game, context.isOptionEnabled(NATION_TEAMMATES_OPTION)),
          now,
        );
      } else {
        if (tracker.marks(now).length === 0) return false;
        phaseEndedAt ??= now;
        alpha = fadeAlpha(phaseEndedAt, now);
        if (alpha === 0) return false;
      }

      const hooks = readHooks();
      if (!hooks) return true;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const rings: RingToDraw[] = [];
      const offScreen: OffScreenMark[] = [];
      for (const mark of tracker.marks(now)) {
        const at = hooks.camera.worldToScreenCoordinates(mark);
        if (at.x > 0 && at.y > 0 && at.x < width && at.y < height) {
          rings.push({ ...at, name: mark.name, colour: mark.colour });
        } else {
          offScreen.push({ ...at, colour: mark.colour });
        }
      }

      layer.draw({
        rings,
        pointers: placePointers(offScreen, { width, height }),
        unit: markUnit(hooks.camera.scale),
        nowMs: now,
        alpha,
      });
      return true;
    }

    function finish(): void {
      stopLoop();
      tracker.clear();
      layer.clear();
    }

    /** Runs on every drawn frame, because the camera moves without telling us. */
    function step(now: number): void {
      frame = requestAnimationFrame(step);
      try {
        if (!draw(now)) finish();
      } catch (error) {
        // A loop that throws on every frame would fill the console.
        logError("the spawn marks failed on a frame", error);
        finish();
      }
    }

    function stopLoop(): void {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    }

    frame = requestAnimationFrame(step);
    context.onDetach(() => {
      stopLoop();
      layer.remove();
    });
  },
};
