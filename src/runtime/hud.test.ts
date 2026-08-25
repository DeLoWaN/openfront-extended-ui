import { describe, expect, it, vi } from "vitest";
import { injectedNodes } from "./hud";

/** Stands in for one of the game's own elements. */
function host(): HTMLElement {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
}

function marker(): HTMLElement {
  const node = document.createElement("div");
  node.className = "ofx-marker";
  return node;
}

function nodesIn(hosts: HTMLElement[]) {
  return injectedNodes({ findHosts: () => hosts, build: marker });
}

function markers(): NodeListOf<Element> {
  return document.querySelectorAll(".ofx-marker");
}

describe("drawing in the game's HUD", () => {
  it("draws one node in every host", () => {
    const nodes = nodesIn([host(), host()]);

    nodes.sync();

    expect(markers()).toHaveLength(2);
  });

  it("adds nothing on a second sync", () => {
    const nodes = nodesIn([host(), host()]);

    nodes.sync();
    nodes.sync();

    expect(markers()).toHaveLength(2);
  });

  it("draws again after the game wiped a node in a redraw", () => {
    const nodes = nodesIn([host()]);
    nodes.sync();
    markers()[0]!.remove();

    nodes.sync();

    expect(markers()).toHaveLength(1);
  });

  it("waits for the game to render before it draws anything", () => {
    const nodes = nodesIn([]);

    expect(nodes.sync()).toHaveLength(0);
  });

  it("makes the host a positioning context, which it is not by default", () => {
    const cell = host();
    expect(cell.style.position).toBe("");

    nodesIn([cell]).sync();

    expect(cell.style.position).toBe("relative");
  });

  it("keeps quiet and draws nothing when the search for a host throws", () => {
    const complaint = vi.spyOn(console, "error").mockImplementation(() => {});
    const nodes = injectedNodes({
      findHosts: () => {
        throw new Error("the game's markup changed under us");
      },
      build: marker,
    });

    expect(() => nodes.sync()).not.toThrow();
    expect(markers()).toHaveLength(0);
    expect(complaint).toHaveBeenCalled();
  });
});

describe("taking the package's nodes back out", () => {
  it("removes them", () => {
    const nodes = nodesIn([host(), host()]);
    nodes.sync();

    nodes.remove();

    expect(markers()).toHaveLength(0);
  });

  it("leaves no inline style on a host that had none", () => {
    const cell = host();
    const nodes = nodesIn([cell]);
    nodes.sync();

    nodes.remove();

    expect(cell.getAttribute("style")).toBeNull();
  });

  it("puts back a position the game had set itself", () => {
    const cell = host();
    cell.style.position = "absolute";
    const nodes = nodesIn([cell]);
    nodes.sync();

    nodes.remove();

    expect(cell.style.position).toBe("absolute");
  });

  it("leaves alone an inline style the game set while the match ran", () => {
    const cell = host();
    const nodes = nodesIn([cell]);
    nodes.sync();
    // The game writes its own inline style after the package has drawn.
    cell.style.opacity = "0.5";

    nodes.remove();

    expect(cell.style.opacity).toBe("0.5");
    expect(cell.style.position).toBe("");
  });

  it("draws again after a removal", () => {
    const nodes = nodesIn([host()]);
    nodes.sync();
    nodes.remove();

    nodes.sync();

    expect(markers()).toHaveLength(1);
  });
});
