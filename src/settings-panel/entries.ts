import { logError } from "../runtime/log";

/**
 * Keeps an Extended UI row in two of the game's screens, so a player reaches
 * the Settings panel in a match and outside one.
 *
 * - In a match, the game's in-match menu is `<settings-modal>`, which the gear
 *   in the top right sidebar opens. While it is closed its `render()` returns
 *   null, so the game throws the whole menu away and builds it again on the
 *   next open.
 * - Outside a match, the game's settings page is `<user-setting
 *   id="page-settings">`, which SETTINGS in the top bar opens. Its body is
 *   drawn after the script starts.
 *
 * So each row is put back each time the screen's content changes.
 *
 * Read from `SettingsModal.ts` and `UserSettingModal.ts` at OpenFrontIO commit
 * 332e5410e and on the game's `main` of 2026-10-27, whose in-match menus differ.
 */

/** Where the panel goes once a row is clicked. */
export type PanelPlace =
  /** Inside the in-match menu's overlay, over its dialog. */
  | { readonly kind: "menu"; readonly overlay: HTMLElement }
  /** Over the whole page, because no game overlay is open. */
  | { readonly kind: "page" };

/** One of the game's screens that carries a row. */
interface Entry {
  readonly host: string;
  /** Puts the row in the screen. Returns null when the screen is not drawn yet. */
  readonly place: (host: HTMLElement, row: HTMLElement) => PanelPlace | null;
  /** The extra class that makes the row look like the screen's own rows. */
  readonly look?: string;
}

const ROW = "ofx-menu-row";
const ROW_TEXT = "ofx-menu-row-text";
const ROW_TITLE = "ofx-menu-row-title";
const ROW_HINT = "ofx-menu-row-hint";

/** The game's own code looks its overlay up by this class. */
const MENU_OVERLAY = ".modal-overlay";
/** The row that opens the game's own settings, on the game's newer menu. */
const OPEN_SETTINGS = ":scope > [data-open-settings]";

const IN_MATCH_MENU: Entry = {
  host: "settings-modal",
  place(menu, row) {
    const overlay = menu.querySelector<HTMLElement>(MENU_OVERLAY);
    // The menu's dialog holds a header and then the column of rows.
    const column = overlay?.firstElementChild?.lastElementChild;
    if (!overlay || !column) return null;
    // Next to the row that opens the game's own settings, which is the first
    // row on the game's older menu.
    const anchor =
      column.querySelector(OPEN_SETTINGS) ?? column.firstElementChild;
    if (anchor) anchor.after(row);
    else column.prepend(row);
    return { kind: "menu", overlay };
  },
};

const SETTINGS_PAGE: Entry = {
  host: "user-setting#page-settings",
  look: "ofx-menu-row-card",
  place(page, row) {
    // `<o-modal>` slots the page's body as its one child without a slot name.
    const body = page.querySelector(":scope > o-modal > div:not([slot])");
    if (!body) return null;
    body.prepend(row);
    return { kind: "page" };
  },
};

export interface SettingsEntries {
  /** Takes every row out of the page and stops watching. */
  stop(): void;
}

export function watchSettingsEntries(deps: {
  /** The player clicked a row. */
  onOpen: (place: PanelPlace) => void;
}): SettingsEntries {
  const watches = [IN_MATCH_MENU, SETTINGS_PAGE].map((entry) =>
    watch(entry, deps.onOpen),
  );
  return {
    stop() {
      for (const stop of watches) stop();
    },
  };
}

/** Keeps one entry's row in place. Returns what undoes it. */
function watch(entry: Entry, onOpen: (place: PanelPlace) => void): () => void {
  const host = document.querySelector<HTMLElement>(entry.host);
  if (!host) {
    // Silence here would leave the player with one way in fewer, and no reason.
    logError(`no <${entry.host}> in the page, so the settings panel has no row there`);
    return () => {};
  }

  function sync(): void {
    try {
      if (host?.querySelector(`.${ROW}`)) return;
      addRow(entry, host as HTMLElement, onOpen);
    } catch (error) {
      logError("could not add the Extended UI row to the game's screen", error);
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(host, { childList: true, subtree: true });
  sync();

  return () => {
    observer.disconnect();
    for (const row of host.querySelectorAll(`.${ROW}`)) row.remove();
  };
}

function addRow(
  entry: Entry,
  host: HTMLElement,
  onOpen: (place: PanelPlace) => void,
): void {
  const row = drawRow(entry.look);
  const place = entry.place(host, row);
  if (!place) return;
  row.addEventListener("click", () => {
    try {
      onOpen(place);
    } catch (error) {
      logError("could not open the settings panel", error);
    }
  });
}

function drawRow(look?: string): HTMLButtonElement {
  const row = document.createElement("button");
  row.type = "button";
  row.className = look ? `${ROW} ${look}` : ROW;

  const text = document.createElement("span");
  text.className = ROW_TEXT;
  const title = document.createElement("span");
  title.className = ROW_TITLE;
  title.textContent = "Extended UI";
  const hint = document.createElement("span");
  hint.className = ROW_HINT;
  hint.textContent = "Switch the userscript's features and options";
  text.append(title, hint);

  row.append(sliderIcon(), text);
  return row;
}

/** Three sliders, drawn in the current text colour like the game's own icons. */
function sliderIcon(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of ["M4 6h16M14 4v4", "M4 12h16M8 10v4", "M4 18h16M16 16v4"]) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}
