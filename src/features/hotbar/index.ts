import { isMatchLive } from "../../game/match";
import type { UnitDisplay } from "../../game/types";
import type { Feature } from "../../runtime/feature";
import { injectedNodes } from "../../runtime/hud";
import {
  aimPoint,
  MAX_SECONDS,
  MIN_SECONDS,
  stayMs,
  type Point,
} from "./badge";
import { createBadgeNode } from "./badge-node";
import {
  CUED_ICONS,
  findHotbars,
  findIconItem,
  gameOwnsCursor,
  iconCentre,
  iconSource,
  readCost,
} from "./hotbar";
import { STEP_COUNT, priceStep } from "./prices";

/**
 * The hotbar readout. It draws the price step of the next city, port or
 * factory, and lights an icon you can afford now.
 *
 * It draws two nodes inside three of the ten hotbar icons, and leaves the
 * other seven alone. The step marks count the price step. The light covers
 * the icon's own box.
 *
 * Every rule here is read fresh on each tick. The light holds the one thing
 * it has to remember, which is the price step it runs at.
 *
 * When an icon becomes affordable, a badge also appears under the cursor, with
 * an arrow that points down to the icon. See `badge.ts` and `badge-node.ts`. The
 * badge belongs to this readout, so switching the readout off takes it away.
 *
 * The README says what a player sees. The stylesheet holds how the nodes
 * look, including the pulses.
 */

/** The light over one icon's box. */
const LIGHT = "ofx-hotbar-light";
/** The light, running its pulses and then breathing. */
const LIGHT_BREATHING = "ofx-hotbar-light-breathing";
/** The light, running its pulses and then holding steady. */
const LIGHT_STEADY = "ofx-hotbar-light-steady";
/** The row of three step marks under one icon. */
const MARKS = "ofx-hotbar-marks";
/** The row, with no price step to draw. */
const MARKS_OFF = "ofx-hotbar-marks-off";
/** The row, with the gold to build the thing. */
const MARKS_READY = "ofx-hotbar-marks-ready";
/** One step mark. */
const MARK = "ofx-hotbar-mark";
/** One step mark, counted by the price step. */
const MARK_LIT = "ofx-hotbar-mark-lit";

const BREATHING_OPTION = "breathing";
const BADGE_SECONDS_OPTION = "badge-seconds";

/** What the readout draws under one icon. */
interface Cue {
  /** The game's own `UnitType` value, which the price is read by. */
  readonly type: string;
  /** The game's own `alt` for the icon. */
  readonly icon: string;
  /** The item the icon sits in, which the badge's arrow aims at. */
  readonly item: HTMLElement;
  readonly light: HTMLElement;
  readonly marks: HTMLElement;
  /** The three marks, cheapest step first. */
  readonly steps: readonly HTMLElement[];
}

/** What the readout draws in one hotbar. */
interface Readout {
  readonly hotbar: UnitDisplay;
  readonly cues: readonly Cue[];
  readonly nodes: readonly HTMLElement[];
}

export const hotbarReadout: Feature = {
  id: "hotbar",
  name: "Cheap building alerts",
  description:
    "Cities, ports and factories cost more each time you build one. Marks under their icons in the build bar show the next price. The icon lights up when you can afford one, and a reminder pops up under your mouse.",
  options: [
    {
      key: BREATHING_OPTION,
      name: "Keep the icon pulsing",
      description:
        "The lit icon keeps pulsing slowly while you can afford it. When off, it flashes three times and then stays still.",
      whenUnset: true,
    },
    {
      key: BADGE_SECONDS_OPTION,
      name: "Mouse reminder duration",
      description:
        "How many seconds the reminder under your mouse stays, from 0.5 to 30.",
      whenUnset: "3.5",
      control: { kind: "number", min: MIN_SECONDS, max: MAX_SECONDS, step: 0.5 },
    },
  ],

  attach(context) {
    const readouts = injectedNodes<Readout>({
      findHosts: findHotbars,
      draw,
      nodesOf: (readout) => readout.nodes,
    });
    context.onDetach(() => readouts.remove());

    const badge = createBadgeNode();
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    /** Where the cursor was last seen. Null until it has moved once. */
    let cursor: Point | null = null;
    /** Which of the three were affordable on the last tick. Null before one. */
    let affordable: ReadonlySet<string> | null = null;

    function hideBadge(): void {
      clearTimeout(fadeTimer);
      fadeTimer = undefined;
      badge.hide();
    }

    context.onWindowEvent(
      "mousemove",
      (event) => {
        cursor = { x: event.clientX, y: event.clientY };
      },
      { capture: true },
    );
    context.onDetach(() => {
      hideBadge();
      badge.remove();
    });

    /** Shows the badge for the icons that just became affordable. */
    function announce(cues: readonly Cue[]): void {
      if (!cursor || gameOwnsCursor()) return;

      const icons: string[] = [];
      const centres: Point[] = [];
      for (const cue of cues) {
        const source = iconSource(cue.item, cue.icon);
        const centre = iconCentre(cue.item);
        // A hotbar the game hides has no box to point at, so nothing is shown.
        if (!source || !centre) continue;
        icons.push(source);
        centres.push(centre);
      }
      const target = aimPoint(centres);
      if (!target) return;

      clearTimeout(fadeTimer);
      if (!badge.show(icons, cursor, target)) return;
      fadeTimer = setTimeout(
        () => badge.fade(),
        stayMs(context.optionText(BADGE_SECONDS_OPTION)),
      );
    }

    return {
      tick() {
        const me = context.game.myPlayer();
        // The game's own hotbar draws nothing during the spawn phase, after
        // you die, or in a replay, so the readout goes with it.
        if (!isMatchLive(context.game) || !me) {
          readouts.remove();
          hideBadge();
          affordable = null;
          return;
        }

        const gold = me.gold();
        const breathing = context.isOptionEnabled(BREATHING_OPTION);
        const ready = new Map<string, Cue>();
        for (const readout of readouts.sync()) {
          for (const cue of readout.cues) {
            if (update(cue, readout.hotbar, gold, breathing)) {
              ready.set(cue.type, cue);
            }
          }
        }

        // The first tick only learns what is affordable. An icon that was
        // affordable before the readout looked did not just become so.
        const before = affordable;
        affordable = new Set(ready.keys());
        if (!before) return;

        if (gameOwnsCursor()) hideBadge();
        const arrived = [...ready].filter(([type]) => !before.has(type));
        if (arrived.length > 0) announce(arrived.map(([, cue]) => cue));
      },
    };
  },
};

/**
 * Draws the light and the marks under each of the three icons.
 *
 * Both nodes go after the box the game drew, so they sit outside the parts Lit
 * manages and survive its ten redraws a second.
 *
 * An icon the hotbar does not draw is skipped, and the other two keep their
 * readout. A lobby can disable a city, a factory or a port on its own.
 *
 * Returns null while the hotbar draws none of the three, which is how it looks
 * before the game has drawn it at all. The next sync tries again.
 */
function draw(hotbar: HTMLElement): Readout | null {
  const cues: Cue[] = [];
  const nodes: HTMLElement[] = [];

  for (const cued of CUED_ICONS) {
    const item = findIconItem(hotbar, cued.icon);
    if (!item) continue;

    const light = document.createElement("div");
    light.className = LIGHT;

    const marks = document.createElement("div");
    marks.className = `${MARKS} ${MARKS_OFF}`;
    const steps: HTMLElement[] = [];
    for (let step = 0; step < STEP_COUNT; step++) {
      const mark = document.createElement("div");
      mark.className = MARK;
      marks.append(mark);
      steps.push(mark);
    }

    item.append(light, marks);
    cues.push({ type: cued.type, icon: cued.icon, item, light, marks, steps });
    nodes.push(light, marks);
  }

  if (cues.length === 0) return null;
  return { hotbar: hotbar as UnitDisplay, cues, nodes };
}

/**
 * Draws one icon's price step, and lights the box when you can build it.
 * Returns whether you can build it now.
 *
 * A price that falls because you lost a structure is drawn exactly like one
 * that rose.
 */
function update(
  cue: Cue,
  hotbar: UnitDisplay,
  gold: bigint,
  breathing: boolean,
): boolean {
  const cost = readCost(hotbar, cue.type);
  // Past the cap there is no step, and then neither node draws anything.
  const step = cost === null ? null : priceStep(cost);
  const ready = step !== null && cost !== null && cost <= gold;

  cue.marks.classList.toggle(MARKS_OFF, step === null);
  cue.marks.classList.toggle(MARKS_READY, ready);
  cue.steps.forEach((mark, index) => {
    mark.classList.toggle(MARK_LIT, step !== null && index < step);
  });

  setLight(cue.light, ready ? step : null, breathing);
  return ready;
}

/**
 * Lights the box at one price step, or puts the light out.
 *
 * The price step the light runs at is written on the node itself, because the
 * node is replaced whenever the game takes it out of the page. A light that
 * remembered elsewhere would come back dark and stay dark for the rest of the
 * match.
 */
function setLight(
  light: HTMLElement,
  step: number | null,
  breathing: boolean,
): void {
  const wanted = breathing ? LIGHT_BREATHING : LIGHT_STEADY;
  if (step === null) {
    delete light.dataset.ofxLit;
    light.classList.remove(LIGHT_BREATHING, LIGHT_STEADY);
    return;
  }

  const lit = String(step);
  if (light.dataset.ofxLit === lit && light.classList.contains(wanted)) return;

  light.dataset.ofxLit = lit;
  light.classList.remove(LIGHT_BREATHING, LIGHT_STEADY);
  // Reading a layout figure makes the browser finish the removal, so the next
  // class starts the pulses again instead of letting them run on.
  void light.offsetWidth;
  light.classList.add(wanted);
}
