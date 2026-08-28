import { logError } from "./log";

/**
 * Keeps the package's own nodes inside the game's HUD.
 *
 * The package draws its nodes inside the HUD, not as a layer over the page.
 * See docs/adr/0003.
 *
 * A host is one of the game's own elements. This knows nothing about which
 * element that is. A feature says where its nodes go, and this puts them there
 * and takes them away again.
 */

export interface InjectedNodes {
  /**
   * Draws one node in every host that has none, and returns every node drawn.
   *
   * Call this on each tick. The game renders its HUD after a match starts, so
   * the hosts are not always in the page at once, and a change of top-level
   * template can take a drawn node away again.
   */
  sync(): HTMLElement[];
  /** Takes every node out and puts the hosts back as they were. */
  remove(): void;
}

/**
 * One node per host, drawn inside it.
 *
 * Use this for a readout that needs a node above the game's element. A host is
 * `position: static`, so this sets `position: relative` on it, and `remove`
 * undoes that exactly. Without it a node inside the host cannot place itself
 * against the host. `position` is the only property the package writes on
 * anything of the game's own.
 *
 * A readout with no label above its element draws inside that element instead,
 * and needs none of this. See docs/adr/0003.
 */
export function injectedNodes(deps: {
  findHosts: () => HTMLElement[];
  build: () => HTMLElement;
}): InjectedNodes {
  const drawn = new Map<HTMLElement, HTMLElement>();
  /** What each host's own inline `position` was, so it can go back. */
  const priorPosition = new Map<HTMLElement, string | null>();
  /** Hosts that had no `style` attribute at all until the package wrote one. */
  const styleAttributeAdded = new Set<HTMLElement>();

  return {
    sync() {
      let hosts: HTMLElement[];
      try {
        hosts = deps.findHosts();
      } catch (error) {
        logError("could not look for a place to draw", error);
        return [...drawn.values()];
      }

      for (const host of hosts) {
        const existing = drawn.get(host);
        if (existing?.isConnected) continue;

        if (!priorPosition.has(host)) {
          if (!host.hasAttribute("style")) styleAttributeAdded.add(host);
          priorPosition.set(host, host.style.position || null);
        }
        host.style.position = "relative";

        const node = deps.build();
        host.append(node);
        drawn.set(host, node);
      }
      return [...drawn.values()];
    },

    remove() {
      for (const node of drawn.values()) node.remove();
      drawn.clear();

      // Only `position` goes back. The game can set its own inline styles on a
      // host while a match runs, and those must survive untouched.
      for (const [host, position] of priorPosition) {
        if (position === null) host.style.removeProperty("position");
        else host.style.position = position;

        // An empty style attribute the package created is still a trace of it.
        if (styleAttributeAdded.has(host) && host.style.length === 0) {
          host.removeAttribute("style");
        }
      }
      priorPosition.clear();
      styleAttributeAdded.clear();
    },
  };
}
