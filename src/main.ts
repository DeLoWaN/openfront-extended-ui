import css from "./styles/package.css?inline";
import { FEATURES } from "./features";
import type { ControlPanel } from "./game/types";
import { start } from "./runtime/boot";
import { createConsoleHandle, type ConsoleHandle } from "./runtime/console";
import { logError, logInfo } from "./runtime/log";
import { createSettings, localStorageStore } from "./runtime/settings";

/**
 * The userscript entry point.
 *
 * The script takes no grants, so this runs in the page's own context and
 * `window` is the page's window. See docs/adr/0007.
 */

const PANEL = "control-panel";
const HANDLE = "openfrontExtendedUi";

declare global {
  interface Window {
    [HANDLE]?: ConsoleHandle;
  }
}

async function main(): Promise<void> {
  // A second copy of the script, or a reload in development, would otherwise
  // leave the first copy's tick hook and its nodes on the page forever.
  window[HANDLE]?.stop();

  // The element sits in the page's static HTML long before the game's bundle
  // registers the class behind it. Until this resolves it is a plain
  // HTMLElement with no `tick` and no `game`.
  await customElements.whenDefined(PANEL);

  const panel = document.querySelector<ControlPanel>(PANEL);
  if (!panel) {
    logError(`no <${PANEL}> in the page, so there is nothing to attach to`);
    return;
  }

  const pkg = start({
    panel,
    features: FEATURES,
    settings: createSettings(localStorageStore()),
    css,
  });

  window[HANDLE] = createConsoleHandle({
    registry: pkg.registry,
    stop() {
      pkg.stop();
      delete window[HANDLE];
    },
  });
  logInfo(`ready. window.${HANDLE}.list() shows what can be switched off.`);
}

void main().catch((error) => logError("could not start", error));
