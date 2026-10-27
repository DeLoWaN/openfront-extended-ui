import { logError } from "../runtime/log";

/**
 * Keeps an Extended UI row in the game's in-match menu.
 *
 * The menu is `<settings-modal>`, which the gear in the game's top right
 * sidebar opens. While it is closed its `render()` returns null, so the game
 * throws the whole menu away and builds it again on the next open. The row is
 * therefore put back each time the menu's content changes.
 *
 * Read from `SettingsModal.ts` at OpenFrontIO commit 332e5410e and on the
 * game's `main` of 2026-10-27, whose menus differ.
 */

const MENU = "settings-modal";
/** The game's own code looks its overlay up by this class. */
const OVERLAY = ".modal-overlay";
/** The row that opens the game's own settings, on the game's newer menu. */
const OPEN_SETTINGS = ":scope > [data-open-settings]";

const ROW = "ofx-menu-row";
const ROW_TEXT = "ofx-menu-row-text";
const ROW_TITLE = "ofx-menu-row-title";
const ROW_HINT = "ofx-menu-row-hint";

export interface SettingsMenu {
  /** Takes the row out of the menu and stops watching it. */
  stop(): void;
}

export function watchSettingsMenu(deps: {
  /** The player clicked the row. `overlay` is the menu's own overlay. */
  onOpen: (overlay: HTMLElement) => void;
}): SettingsMenu {
  const menu = document.querySelector<HTMLElement>(MENU);
  if (!menu) {
    // Silence here would leave the package with no screen to switch it off.
    logError(`no <${MENU}> in the page, so the settings panel has no way in`);
    return { stop() {} };
  }

  function sync(): void {
    try {
      addRow(menu as HTMLElement, deps.onOpen);
    } catch (error) {
      logError("could not add the Extended UI row to the game's menu", error);
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(menu, { childList: true, subtree: true });
  sync();

  return {
    stop() {
      observer.disconnect();
      for (const row of menu.querySelectorAll(`.${ROW}`)) row.remove();
    },
  };
}

function addRow(
  menu: HTMLElement,
  onOpen: (overlay: HTMLElement) => void,
): void {
  const overlay = menu.querySelector<HTMLElement>(OVERLAY);
  // The menu's dialog holds a header and then the column of rows.
  const column = overlay?.firstElementChild?.lastElementChild;
  if (!overlay || !column) return;
  if (column.querySelector(`:scope > .${ROW}`)) return;

  const row = drawRow();
  row.addEventListener("click", () => {
    try {
      onOpen(overlay);
    } catch (error) {
      logError("could not open the settings panel", error);
    }
  });

  // Next to the row that opens the game's own settings, which is the first row
  // on the game's older menu.
  const anchor =
    column.querySelector(OPEN_SETTINGS) ?? column.firstElementChild;
  if (anchor) anchor.after(row);
  else column.prepend(row);
}

function drawRow(): HTMLButtonElement {
  const row = document.createElement("button");
  row.type = "button";
  row.className = ROW;

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
