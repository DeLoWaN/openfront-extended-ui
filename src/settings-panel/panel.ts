import type { GameKeybinds } from "../game/keybinds";
import type { Feature, FeatureOption, OptionValue } from "../runtime/feature";
import type { Registry } from "../runtime/registry";
import { clashMessage, judgeKey, keyLabel } from "./keys";

/**
 * The Settings panel. It shows one row per feature with a switch, and each
 * feature's options indented under it.
 *
 * Every change goes through the registry at once, as a console call does, so
 * the panel has no Save button and keeps no copy of a setting.
 *
 * The panel is drawn over the game's own menu and goes with it. Where it is
 * put, and how a key reaches it, is in `index.ts`.
 */

const BACKDROP = "ofx-settings-backdrop";
const DIALOG = "ofx-settings";
const HEADER = "ofx-settings-header";
const TITLE = "ofx-settings-title";
const CLOSE = "ofx-settings-close";
const BODY = "ofx-settings-body";
const FEATURE = "ofx-settings-feature";
const ROW = "ofx-settings-row";
const TEXT = "ofx-settings-text";
const NAME = "ofx-settings-name";
const DESCRIPTION = "ofx-settings-description";
const OPTIONS = "ofx-settings-options";
const OPTIONS_OFF = "ofx-settings-options-off";
const SWITCH = "ofx-switch";
const NUMBER = "ofx-settings-number";
const KEY = "ofx-settings-key";
const KEY_LISTENING = "ofx-settings-key-listening";
const WARNING = "ofx-settings-warning";
const FOOTER = "ofx-settings-footer";
const RESET = "ofx-settings-reset";
const RESET_ARMED = "ofx-settings-reset-armed";

const TITLE_TEXT = "Extended UI";
const RESET_TEXT = "Reset to defaults";
const CONFIRM_TEXT = "Confirm?";
const LISTENING_TEXT = "Press a key…";

/** How long the reset button waits for its second click. */
export const CONFIRM_MS = 3000;

export interface SettingsPanel {
  /** The node to put in the page. It holds the backdrop and the dialog. */
  readonly root: HTMLElement;
  /** Moves the keyboard focus into the dialog. */
  focus(): void;
  /**
   * Handles one key press while the panel is open.
   *
   * Returns true when the panel used the key, so nothing else may act on it.
   */
  handleKey(code: string): boolean;
  /** Stops the panel's timer. The caller takes the root out of the page. */
  destroy(): void;
}

/** The key option that waits for a key, and how to hand one to it. */
interface Recording {
  readonly finish: (code: string) => void;
}

export function createSettingsPanel(deps: {
  registry: Registry;
  /** Read again on each use, because the player can rebind in the game. */
  gameKeybinds: () => GameKeybinds;
  /** The player asked to go back to the game's own menu. */
  onClose: () => void;
}): SettingsPanel {
  const { registry } = deps;
  let recording: Recording | null = null;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;

  const root = element("div", BACKDROP);
  const dialog = element("div", DIALOG);
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-label", TITLE_TEXT);
  dialog.tabIndex = -1;
  root.append(dialog);

  // A click on the backdrop, outside the dialog, goes back to the game's menu.
  root.addEventListener("click", (event) => {
    if (event.target === root) deps.onClose();
  });

  const body = element("div", BODY);
  const reset = element("button", RESET);
  reset.type = "button";
  reset.textContent = RESET_TEXT;
  reset.addEventListener("click", onResetClick);

  const footer = element("div", FOOTER);
  footer.append(reset);
  dialog.append(drawHeader(deps.onClose), body, footer);
  drawBody();

  function drawBody(): void {
    recording = null;
    body.replaceChildren(...registry.features.map(drawFeature));
  }

  function drawFeature(feature: Feature): HTMLElement {
    const section = element("section", FEATURE);
    section.dataset.feature = feature.id;

    const enabled = registry.isEnabled(feature.id);
    const toggle = switchInput(enabled);
    toggle.addEventListener("change", () => {
      registry.setEnabled(feature.id, toggle.checked);
      setOff(options, !registry.isEnabled(feature.id));
    });
    section.append(row(feature, toggle));

    const options = element("div", OPTIONS);
    for (const option of registry.optionsOf(feature.id)) {
      const drawn = drawOption(feature, option);
      if (drawn) options.append(drawn);
    }
    if (options.childElementCount > 0) section.append(options);
    setOff(options, !enabled);
    return section;
  }

  function drawOption(
    feature: Feature,
    option: FeatureOption & { value: OptionValue },
  ): HTMLElement | null {
    const control = option.control;
    if (control?.kind === "console-only") return null;

    if (control?.kind === "number") {
      const input = element("input", NUMBER);
      input.type = "number";
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = String(option.value);
      // On `change` rather than `input`, so a half-typed number is never stored.
      input.addEventListener("change", () => {
        const value = Number(input.value);
        const valid =
          input.value.trim() !== "" &&
          value >= control.min &&
          value <= control.max &&
          isStep(value, control.step);
        if (valid) registry.setOption(feature.id, option.key, String(value));
        input.value = String(currentValue(feature, option.key));
      });
      return row(option, input);
    }

    if (control?.kind === "key") return drawKeyOption(feature, option);

    if (typeof option.value !== "boolean") return null;
    const toggle = switchInput(option.value);
    toggle.addEventListener("change", () =>
      registry.setOption(feature.id, option.key, toggle.checked),
    );
    return row(option, toggle);
  }

  function drawKeyOption(feature: Feature, option: FeatureOption): HTMLElement {
    const wrapper = element("div");
    const button = element("button", KEY);
    button.type = "button";
    const warning = element("p", WARNING);
    warning.setAttribute("role", "status");
    wrapper.append(row(option, button), warning);

    function show(message: string | null): void {
      const code = String(currentValue(feature, option.key));
      button.textContent = keyLabel(code);
      button.classList.remove(KEY_LISTENING);
      warning.textContent =
        message ?? clashMessage(code, deps.gameKeybinds()) ?? "";
    }

    button.addEventListener("click", () => {
      button.textContent = LISTENING_TEXT;
      button.classList.add(KEY_LISTENING);
      warning.textContent = "";
      recording = {
        finish(code) {
          const verdict = judgeKey(code, deps.gameKeybinds());
          if (verdict.kind === "refuse") {
            show(verdict.message);
            return;
          }
          if (verdict.kind === "accept") {
            registry.setOption(feature.id, option.key, verdict.code);
          }
          show(null);
        },
      };
    });

    show(null);
    return wrapper;
  }

  function currentValue(feature: Feature, key: string): OptionValue {
    const found = registry
      .optionsOf(feature.id)
      .find((option) => option.key === key);
    return found?.value ?? "";
  }

  function onResetClick(): void {
    if (resetTimer === null) {
      reset.textContent = CONFIRM_TEXT;
      reset.classList.add(RESET_ARMED);
      resetTimer = setTimeout(disarm, CONFIRM_MS);
      return;
    }
    disarm();
    registry.resetAll();
    drawBody();
  }

  function disarm(): void {
    if (resetTimer !== null) clearTimeout(resetTimer);
    resetTimer = null;
    reset.textContent = RESET_TEXT;
    reset.classList.remove(RESET_ARMED);
  }

  return {
    root,
    focus: () => dialog.focus(),

    handleKey(code) {
      if (recording) {
        const { finish } = recording;
        recording = null;
        finish(code);
        return true;
      }
      if (code !== "Escape") return false;
      deps.onClose();
      return true;
    },

    destroy: disarm,
  };
}

function drawHeader(onClose: () => void): HTMLElement {
  const header = element("div", HEADER);
  const title = element("h2", TITLE);
  title.textContent = TITLE_TEXT;
  const close = element("button", CLOSE);
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Back to the game menu");
  close.addEventListener("click", onClose);
  header.append(title, close);
  return header;
}

/** A title, the sentence under it when there is one, and the control. */
function row(
  labelled: { readonly name: string; readonly description?: string },
  control: HTMLElement,
): HTMLElement {
  const label = element("label", ROW);
  const text = element("span", TEXT);
  const name = element("span", NAME);
  name.textContent = labelled.name;
  text.append(name);
  if (labelled.description) {
    const description = element("span", DESCRIPTION);
    description.textContent = labelled.description;
    text.append(description);
  }
  label.append(text, control);
  return label;
}

function switchInput(checked: boolean): HTMLInputElement {
  const input = element("input", SWITCH);
  input.type = "checkbox";
  input.setAttribute("role", "switch");
  input.checked = checked;
  return input;
}

/** Greys a feature's options, and keeps them from taking input, while it is off. */
function setOff(options: HTMLElement, off: boolean): void {
  options.classList.toggle(OPTIONS_OFF, off);
  for (const control of options.querySelectorAll<
    HTMLInputElement | HTMLButtonElement
  >("input, button")) {
    control.disabled = off;
  }
}

/** Whether a value sits on the option's step, allowing for float rounding. */
function isStep(value: number, step: number): boolean {
  const steps = value / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
