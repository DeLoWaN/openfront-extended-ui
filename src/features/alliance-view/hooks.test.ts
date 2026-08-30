import { afterEach, describe, expect, it } from "vitest";
import {
  FakeMapRenderer,
  FakeTransformHandler,
  createFakeBuildMenu,
} from "../../test/fakes";
import { mapHooksReader } from "./hooks";

afterEach(() => delete window.__webglView);

describe("what the mode reaches for in the page", () => {
  it("reads the renderer and the camera once a match is running", () => {
    const view = new FakeMapRenderer();
    const camera = new FakeTransformHandler();
    window.__webglView = view;
    createFakeBuildMenu(camera);

    expect(mapHooksReader()()).toEqual({ view, camera });
  });

  it("reaches for nothing before the game has built its renderer", () => {
    createFakeBuildMenu();

    expect(mapHooksReader()()).toBeNull();
  });

  it("reaches for nothing before the game has built its camera", () => {
    window.__webglView = new FakeMapRenderer();

    expect(mapHooksReader()()).toBeNull();
  });

  /** The game builds a new camera for each match onto the same element. */
  it("reads the camera again rather than the one it saw first", () => {
    window.__webglView = new FakeMapRenderer();
    const menu = createFakeBuildMenu();
    const hooks = mapHooksReader();
    hooks();

    const next = new FakeTransformHandler();
    menu.transformHandler = next;

    expect(hooks()?.camera).toBe(next);
  });

  it("looks the element up again after it leaves the page", () => {
    window.__webglView = new FakeMapRenderer();
    const menu = createFakeBuildMenu();
    const hooks = mapHooksReader();
    hooks();

    menu.remove();
    const camera = new FakeTransformHandler();
    createFakeBuildMenu(camera);

    expect(hooks()?.camera).toBe(camera);
  });
});
