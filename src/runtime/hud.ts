import { logError } from "./log";

/**
 * Keeps the package's own nodes inside the game's HUD.
 *
 * The package draws its nodes inside the HUD, not as a layer over the page.
 * See docs/adr/0003.
 *
 * A host is one of the game's own elements. This knows nothing about which
 * element that is, or where inside it a readout draws. A feature says how to
 * find its hosts and how to draw in one, and this keeps the drawings in step
 * with the page.
 *
 * It writes no property on any host. A readout that needs a node placed above
 * the game's element has to set `position: relative` on it and undo that on
 * detach, which is the one property ADR-0003 allows. No readout needs it yet.
 */

/** What a feature drew in one host. `Drawn` is the feature's own type. */
export interface InjectedNodes<Drawn> {
  /**
   * Draws in every host with nothing in it, and returns every live drawing.
   *
   * Call this on each tick. The game renders its HUD after a match starts, so
   * the hosts are not in the page from the beginning, and a host can leave the
   * page or lose a drawn node at any time.
   */
  sync(): Drawn[];
  /** Takes every drawing out of the page and forgets it. */
  remove(): void;
}

export function injectedNodes<Drawn>(deps: {
  findHosts: () => readonly HTMLElement[];
  /**
   * Draws inside one host and returns the drawing.
   *
   * Returns null when the host is not ready to be drawn in. The next sync tries
   * that host again.
   */
  draw: (host: HTMLElement) => Drawn | null;
  /** The nodes the drawing added, so they can be checked and taken out. */
  nodesOf: (drawn: Drawn) => readonly HTMLElement[];
}): InjectedNodes<Drawn> {
  const drawings = new Map<HTMLElement, Drawn>();

  function isInPage(drawn: Drawn): boolean {
    return deps.nodesOf(drawn).every((node) => node.isConnected);
  }

  function erase(drawn: Drawn): void {
    for (const node of deps.nodesOf(drawn)) node.remove();
  }

  return {
    sync() {
      let hosts: readonly HTMLElement[];
      try {
        hosts = deps.findHosts();
      } catch (error) {
        logError("could not look for a place to draw", error);
        return [...drawings.values()];
      }

      // A host the game has replaced or hidden away is gone for good. Its
      // drawing would otherwise be counted as live for the rest of the match.
      for (const [host, drawn] of drawings) {
        if (hosts.includes(host)) continue;
        erase(drawn);
        drawings.delete(host);
      }

      for (const host of hosts) {
        const existing = drawings.get(host);
        if (existing && isInPage(existing)) continue;
        // A part-drawn host keeps whatever is left of the old drawing, which
        // would be drawn over rather than replaced.
        if (existing) erase(existing);

        const drawn = deps.draw(host);
        if (drawn === null) {
          drawings.delete(host);
          continue;
        }
        drawings.set(host, drawn);
      }
      return [...drawings.values()];
    },

    remove() {
      for (const drawn of drawings.values()) erase(drawn);
      drawings.clear();
    },
  };
}
