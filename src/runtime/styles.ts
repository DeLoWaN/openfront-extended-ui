/**
 * The package's own stylesheet, and the roots it has been put into.
 *
 * The package never uses one of the game's CSS classes, because `<build-menu>`
 * keeps its shadow DOM and the game's utility classes do not reach inside it.
 * So the stylesheet has to go into a shadow root as well as into the page.
 * See docs/adr/0001.
 */

const MARKER = "data-openfront-extended-ui";

export interface StyleSheet {
  /** Adds the stylesheet to a root. Adding it twice to one root does nothing. */
  injectInto(root: Document | ShadowRoot): void;
  /** Takes the stylesheet out of every root it was put into. */
  remove(): void;
}

export function createStyleSheet(css: string): StyleSheet {
  const injected = new Map<Document | ShadowRoot, HTMLStyleElement>();

  return {
    injectInto(root) {
      if (injected.has(root)) return;
      const style = document.createElement("style");
      style.setAttribute(MARKER, "");
      style.textContent = css;
      styleHostOf(root).append(style);
      injected.set(root, style);
    },

    remove() {
      for (const style of injected.values()) style.remove();
      injected.clear();
    },
  };
}

/** A document holds its stylesheets in `<head>`. A shadow root holds its own. */
function styleHostOf(root: Document | ShadowRoot): ParentNode {
  return root.nodeType === Node.DOCUMENT_NODE ? (root as Document).head : root;
}
