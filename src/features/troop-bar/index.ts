import { isMatchLive } from "../../game/match";
import type { Feature } from "../../runtime/feature";
import { HIDDEN } from "../../runtime/styles";
import { injectedNodes } from "../../runtime/hud";
import { PLATEAU, shareOfBestRate } from "./regeneration";
import { findFills, findTroopBars, readTroopLevel } from "./troop-bar";

/**
 * The troop bar readout. It marks the plateau, and prints your share of your
 * best regeneration rate.
 *
 * The plateau is the band of troop levels where regeneration stays within 5% of
 * the best rate you could reach at any level. It runs from 30.6% to 54.3% full.
 * A violet strip along the bar's bottom edge marks it, and the number at the
 * bar's far right says how close to your best you are now.
 *
 * Nothing marks the peak itself, and nothing changes state when you cross it.
 * The top of the curve is flat, so there is no state to change.
 * See docs/adr/0004.
 */

/** The strip that marks the plateau. */
const STRIP = "ofx-troop-strip";
/** The share of best rate, printed at the bar's far right. */
const SHARE = "ofx-troop-share";

const PERCENTAGE_OPTION = "percentage";

/** The two nodes the readout draws in one of the game's troop bars. */
interface Readout {
  readonly bar: HTMLElement;
  readonly strip: HTMLElement;
  readonly share: HTMLElement;
  readonly nodes: readonly HTMLElement[];
}

export const troopBar: Feature = {
  id: "troop-bar",
  name: "Troop bar plateau",
  options: [
    {
      key: PERCENTAGE_OPTION,
      name: "Share of best rate",
      whenUnset: true,
    },
  ],

  attach(context) {
    const readouts = injectedNodes<Readout>({
      findHosts: () => findTroopBars(context.panel),
      draw,
      nodesOf: (readout) => readout.nodes,
    });
    context.onDetach(() => readouts.remove());

    return {
      tick() {
        // The game's HUD hides itself when no live player is left, so the
        // readout goes with it rather than a stale percentage on screen.
        if (!isMatchLive(context.game)) {
          readouts.remove();
          return;
        }

        const showShare = context.isOptionEnabled(PERCENTAGE_OPTION);
        for (const readout of readouts.sync()) {
          update(readout, showShare);
        }
      },
    };
  },
};

/**
 * Draws the two nodes inside one troop bar.
 *
 * The strip's place along the bar is written inline, because it comes from the
 * plateau the package works out rather than from the stylesheet. Everything
 * about how the two nodes look lives in the stylesheet.
 */
function draw(bar: HTMLElement): Readout | null {
  const fills = findFills(bar);
  if (!fills) return null;

  const strip = document.createElement("div");
  strip.className = STRIP;
  strip.style.left = `${PLATEAU.lo * 100}%`;
  strip.style.width = `${(PLATEAU.hi - PLATEAU.lo) * 100}%`;

  const share = document.createElement("div");
  share.className = SHARE;

  // Straight after the fills, so both nodes draw over the fills and under the
  // game's troop numbers.
  fills.after(strip, share);

  return { bar, strip, share, nodes: [strip, share] };
}

/**
 * Writes the share of best rate, and hides it when a player asked for that.
 *
 * The strip never moves, so only the number is touched here.
 *
 * An unreadable troop level prints nothing. A share worked out from a guessed
 * level would read exactly like a real one.
 */
function update(readout: Readout, showShare: boolean): void {
  const level = readTroopLevel(readout.bar);
  readout.share.textContent =
    level === null ? "" : `${Math.round(shareOfBestRate(level) * 100)}%`;
  readout.share.classList.toggle(HIDDEN, !showShare);
}
