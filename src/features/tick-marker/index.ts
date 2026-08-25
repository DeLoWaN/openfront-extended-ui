import { isMatchLive } from "../../game/match";
import { injectedNodes } from "../../runtime/hud";
import type { Feature } from "../../runtime/feature";
import { findTroopBarCells } from "./troop-bar";

/**
 * THROWAWAY. A badge above the troop bar that shows the game's tick count.
 *
 * It proves the skeleton works with no feature in it: the package finds the
 * HUD, draws in it, follows the tick, and takes everything away again. The
 * troop bar readout replaces this whole folder.
 *
 * It carries no visual language. The package's colours and shapes belong to
 * the troop bar readout, and nothing here should be copied into it.
 */

const CLASS = "ofx-tick-marker";

export const tickMarker: Feature = {
  id: "tick-marker",
  name: "Tick counter (throwaway)",

  attach(context) {
    const badges = injectedNodes({
      findHosts: () => findTroopBarCells(context.panel),
      build: buildBadge,
    });
    context.onDetach(() => badges.remove());

    return {
      tick() {
        // The game's HUD hides itself when no live player is left, so the badge
        // goes with it rather than a stale number on screen.
        if (!isMatchLive(context.game)) {
          badges.remove();
          return;
        }

        const label = `tick ${context.game.ticks()}`;
        for (const badge of badges.sync()) badge.textContent = label;
      },
    };
  },
};

function buildBadge(): HTMLElement {
  const badge = document.createElement("div");
  badge.className = CLASS;
  return badge;
}
