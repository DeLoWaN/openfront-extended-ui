import { describe, expect, it, vi } from "vitest";
import { injectedNodes } from "./hud";

/**
 * A drawing stands in for what a readout puts in one of the game's elements.
 * The runtime knows only which nodes it added, so it can check them and take
 * them out again.
 */
interface Drawing {
  readonly host: HTMLElement;
  readonly node: HTMLElement;
}

function host(): HTMLElement {
  const element = document.createElement("div");
  element.innerHTML = "<span>the game's own content</span>";
  document.body.append(element);
  return element;
}

function drawingsIn(hosts: readonly HTMLElement[]) {
  return injectedNodes<Drawing>({
    findHosts: () => hosts.filter((element) => element.isConnected),
    draw: (element) => {
      const node = document.createElement("div");
      node.className = "ofx-drawing";
      element.append(node);
      return { host: element, node };
    },
    nodesOf: (drawing) => [drawing.node],
  });
}

function drawn(): NodeListOf<Element> {
  return document.querySelectorAll(".ofx-drawing");
}

describe("keeping the package's nodes in the game's HUD", () => {
  it("draws once in every host", () => {
    const drawings = drawingsIn([host(), host()]);

    expect(drawings.sync()).toHaveLength(2);
    expect(drawn()).toHaveLength(2);
  });

  it("leaves a host alone once it has been drawn in", () => {
    const drawings = drawingsIn([host()]);
    drawings.sync();

    drawings.sync();
    drawings.sync();

    expect(drawn()).toHaveLength(1);
  });

  /**
   * `<control-panel>` never clears its own render region today. If the game ever
   * adds an early exit to its `render()`, a drawn node starts disappearing with
   * no error and no event, so every sync checks rather than trusts.
   */
  it("draws again after the game takes a node back out", () => {
    const one = host();
    const drawings = drawingsIn([one]);
    drawings.sync();

    one.replaceChildren();

    expect(drawings.sync()).toHaveLength(1);
    expect(drawn()).toHaveLength(1);
  });

  it("forgets a host that has left the page, and takes its node with it", () => {
    const one = host();
    const two = host();
    const drawings = drawingsIn([one, two]);
    drawings.sync();

    two.remove();

    expect(drawings.sync()).toHaveLength(1);
    expect(drawn()).toHaveLength(1);
    expect(one.querySelector(".ofx-drawing")).not.toBeNull();
  });

  /**
   * This is what lets the troop bar readout claim it leaves no trace. It writes
   * no property on any of the game's own elements, so switching it off has
   * nothing to undo. See docs/adr/0004.
   */
  it("writes nothing on the host", () => {
    const one = host();
    const drawings = drawingsIn([one]);

    drawings.sync();

    expect(one.getAttribute("style")).toBeNull();
    expect(one.attributes).toHaveLength(0);
  });

  it("leaves the game's own content where it was", () => {
    const one = host();
    const drawings = drawingsIn([one]);

    drawings.sync();
    drawings.remove();

    expect(one.innerHTML).toBe("<span>the game's own content</span>");
  });

  it("takes every node out on remove", () => {
    const drawings = drawingsIn([host(), host()]);
    drawings.sync();

    drawings.remove();

    expect(drawn()).toHaveLength(0);
  });

  it("draws again after a remove, so a feature can be switched back on", () => {
    const one = host();
    const drawings = drawingsIn([one]);
    drawings.sync();
    drawings.remove();

    expect(drawings.sync()).toHaveLength(1);
    expect(drawn()).toHaveLength(1);
  });

  it("skips a host it cannot draw in, and tries it again on the next sync", () => {
    const one = host();
    let ready = false;
    const drawings = injectedNodes<Drawing>({
      findHosts: () => [one],
      draw: (element) => {
        if (!ready) return null;
        const node = document.createElement("div");
        node.className = "ofx-drawing";
        element.append(node);
        return { host: element, node };
      },
      nodesOf: (drawing) => [drawing.node],
    });

    expect(drawings.sync()).toHaveLength(0);

    ready = true;

    expect(drawings.sync()).toHaveLength(1);
  });

  // The game renames its markup whenever it likes. Losing the nodes already
  // drawn on top of that would take the readout away for the rest of the match.
  it("keeps what it has drawn when the search for hosts throws", () => {
    const one = host();
    const findHosts = vi
      .fn<() => readonly HTMLElement[]>()
      .mockReturnValueOnce([one])
      .mockImplementation(() => {
        throw new Error("the game's markup changed");
      });
    const drawings = injectedNodes<Drawing>({
      findHosts,
      draw: (element) => {
        const node = document.createElement("div");
        node.className = "ofx-drawing";
        element.append(node);
        return { host: element, node };
      },
      nodesOf: (drawing) => [drawing.node],
    });
    drawings.sync();

    expect(drawings.sync()).toHaveLength(1);
    expect(drawn()).toHaveLength(1);
  });
});
