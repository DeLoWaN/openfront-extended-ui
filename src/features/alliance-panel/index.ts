import { isMatchLive } from "../../game/match";
import type { BuildMenu, GameView } from "../../game/types";
import type { FeatureContext } from "../../runtime/context";
import type { Feature } from "../../runtime/feature";
import { injectedNodes } from "../../runtime/hud";
import { logError } from "../../runtime/log";
import { HIDDEN } from "../../runtime/styles";
import { playerOrNull } from "../alliance-view/alliance";
import { setSpotlight, spotlightedPlayer } from "../alliance-view/spotlight";
import { createAlliancePanelRows, type Row, type RowKind } from "./rows";

/**
 * The alliance panel. It lists your alliances in the top right corner of the
 * HUD, with the time each one has left, and it renews nothing.
 *
 * The panel is the third child of the static `<div>` at `index.html:365`, below
 * `<game-right-sidebar>` and `<replay-panel>`. Nothing re-renders that div, so
 * the panel stays put. Its 8 px gap is what keeps the panel off the game's own
 * buttons, and its `z-1000` sits under every modal, so the panel dims with the
 * game and needs no measuring.
 *
 * A click on a row moves the camera to that player. It is the only thing a
 * click does: the package never sends an intent. See docs/adr/0009.
 *
 * While the cursor rests on a row, the panel asks the alliance view mode to
 * show that player on their own. See `spotlight.ts`.
 *
 * What the rows are, and their order, is in `rows.ts`. This file draws them.
 * The stylesheet holds how they look.
 */

/** The element the game's top right buttons sit in. `index.html:365`. */
const SIDEBAR = "game-right-sidebar";

/** The panel. It is hidden while there is no row to show. */
const PANEL = "ofx-alliance-panel";
const ROW = "ofx-alliance-row";
const NAME = "ofx-alliance-name";
const TAG = "ofx-alliance-tag";
const TIME = "ofx-alliance-time";
const URGENT_ROW = "ofx-alliance-row-urgent";
const EXPIRED_ROW = "ofx-alliance-row-expired";

/** The custom property a row's bar is drawn from. */
const FRACTION = "--ofx-frac";

/**
 * How long the cursor rests on a row before the map answers.
 *
 * The cursor crosses the panel on its way to a row, and a map that greys for
 * every row it passes over reads as a flicker.
 */
const HOVER_DELAY_MS = 60;

/** The words a row carries besides the name and the clock. An alliance has none. */
const TAGS: Record<RowKind, string> = {
  alliance: "",
  request: "asks you",
  expired: "ended",
};

/** Where the camera hangs. `GameRenderer.ts:87`. */
const BUILD_MENU = "build-menu";

/** What the panel keeps for one row it has drawn. */
interface DrawnRow {
  readonly node: HTMLElement;
  readonly name: HTMLElement;
  readonly tag: HTMLElement;
  readonly time: HTMLElement;
}

/**
 * The panel in one sidebar.
 *
 * A row's nodes are kept and updated in place. The panel redraws ten times a
 * second, and a node rebuilt between the press and the release of a click
 * would eat the click.
 */
interface Panel {
  readonly root: HTMLElement;
  readonly drawn: Map<string, DrawnRow>;
}

export const alliancePanel: Feature = {
  id: "alliance-panel",
  name: "Alliance panel",

  attach(context) {
    const state = createAlliancePanelRows(context.game);
    const panels = injectedNodes<Panel>({
      findHosts: findSidebars,
      draw: (host) => drawPanel(host, context.game, hover),
      nodesOf: (panel) => [panel.root],
    });
    context.onDetach(() => panels.remove());
    const hover = createHover(context);

    return {
      tick() {
        const me = context.game.myPlayer();
        // The game's own buttons stay on screen, but a list of alliances
        // means nothing before you spawn, after you die, or in a replay,
        // where `myPlayer()` is null.
        if (!isMatchLive(context.game) || !me) {
          // A removed panel never reports that the cursor left it.
          hover.leave();
          panels.remove();
          return;
        }

        state.observe(me);
        const rows = state.rows(me);
        for (const panel of panels.sync()) render(panel, rows);
        hover.keepOnlyRowsIn(rows);
      },
    };
  },
};

/**
 * The elements the panel goes into.
 *
 * It is the parent of the game's own sidebar, which is the static `<div>`
 * holding the settings and leaderboard buttons. The game offers no name for
 * that `<div>` to look it up by.
 */
function findSidebars(): HTMLElement[] {
  const hosts = new Set<HTMLElement>();
  for (const sidebar of document.querySelectorAll(SIDEBAR)) {
    if (sidebar.parentElement) hosts.add(sidebar.parentElement);
  }
  return [...hosts];
}

/** What the cursor resting on a row asks of the map. */
interface Hover {
  /** The cursor reached a row. The map answers after a short rest. */
  over(smallID: number): void;
  /** The cursor left the panel, or the panel is gone. */
  leave(): void;
  /** Ends the spotlight when the row it shows is no longer listed. */
  keepOnlyRowsIn(rows: readonly Row[]): void;
}

function createHover(context: FeatureContext): Hover {
  let timer: number | null = null;

  function cancel(): void {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
  }

  // The spotlight is page-wide state. A feature switched off while the cursor
  // rests on a row must not leave the map grey.
  context.onDetach(() => {
    cancel();
    setSpotlight(null);
  });

  return {
    over(smallID) {
      cancel();
      if (spotlightedPlayer() === smallID) return;
      timer = window.setTimeout(() => {
        timer = null;
        setSpotlight(smallID);
      }, HOVER_DELAY_MS);
    },
    leave() {
      cancel();
      setSpotlight(null);
    },
    keepOnlyRowsIn(rows) {
      const lit = spotlightedPlayer();
      if (lit !== null && !rows.some((row) => row.smallID === lit)) {
        setSpotlight(null);
      }
    },
  };
}

/** Adds an empty, hidden panel after the game's own children. */
function drawPanel(host: HTMLElement, game: GameView, hover: Hover): Panel {
  const root = document.createElement("div");
  root.className = `${PANEL} ${HIDDEN}`;
  root.addEventListener("click", (event) => {
    try {
      const row = (event.target as Element | null)?.closest<HTMLElement>(
        `.${ROW}`,
      );
      const smallID = Number(row?.dataset.ofxPlayer);
      if (!row || Number.isNaN(smallID)) return;
      moveCameraTo(game, smallID);
    } catch (error) {
      logError("a click on the alliance panel failed", error);
    }
  });
  root.addEventListener("mouseover", (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>(
      `.${ROW}`,
    );
    const smallID = Number(row?.dataset.ofxPlayer);
    if (row && !Number.isNaN(smallID)) hover.over(smallID);
  });
  root.addEventListener("mouseleave", () => hover.leave());
  host.append(root);
  return { root, drawn: new Map() };
}

/**
 * Moves the camera to one player. It changes your own view and reaches nobody
 * else, which is the only move the package allows itself on the game.
 *
 * `onGoToPlayer` reads only the `player` it is given, so a plain object serves
 * where the game would pass its own event class.
 */
function moveCameraTo(game: GameView, smallID: number): void {
  const player = playerOrNull(game, smallID);
  const camera = document.querySelector<BuildMenu>(BUILD_MENU)?.transformHandler;
  if (!player || !camera) {
    logError("no camera or no player to move the camera to");
    return;
  }
  camera.onGoToPlayer({ player });
}

/**
 * Draws the rows into one panel.
 *
 * The panel appends the rows again only when their order changed. Appending
 * moves a node, and a moved node loses a click that was under way.
 */
function render(panel: Panel, rows: readonly Row[]): void {
  const wanted = new Set(rows.map((row) => row.key));
  for (const [key, drawn] of panel.drawn) {
    if (wanted.has(key)) continue;
    drawn.node.remove();
    panel.drawn.delete(key);
  }

  const ordered: HTMLElement[] = [];
  for (const row of rows) {
    let drawn = panel.drawn.get(row.key);
    if (!drawn) {
      drawn = createRow();
      panel.drawn.set(row.key, drawn);
    }
    drawn.node.dataset.ofxPlayer = String(row.smallID);
    setText(drawn.name, row.name);
    setText(drawn.tag, TAGS[row.kind]);
    setText(drawn.time, row.clock);
    drawn.tag.classList.toggle(HIDDEN, TAGS[row.kind] === "");
    drawn.node.classList.toggle(URGENT_ROW, row.urgent);
    drawn.node.classList.toggle(EXPIRED_ROW, row.kind === "expired");
    const bar = `${Math.round(row.fraction * 1000) / 10}%`;
    if (drawn.node.style.getPropertyValue(FRACTION) !== bar) {
      drawn.node.style.setProperty(FRACTION, bar);
    }
    ordered.push(drawn.node);
  }

  const current = [...panel.root.children];
  const inOrder =
    current.length === ordered.length &&
    ordered.every((node, index) => current[index] === node);
  if (!inOrder) panel.root.append(...ordered);

  panel.root.classList.toggle(HIDDEN, rows.length === 0);
}

function createRow(): DrawnRow {
  const node = document.createElement("div");
  node.className = ROW;
  const name = document.createElement("span");
  name.className = NAME;
  const tag = document.createElement("span");
  tag.className = TAG;
  const time = document.createElement("span");
  time.className = TIME;
  node.append(name, tag, time);
  return { node, name, tag, time };
}

/** Writes a text only when it changed, so a still row costs the page nothing. */
function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
