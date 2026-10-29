import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeatureContext } from "../../runtime/context";
import type { FeatureSession } from "../../runtime/feature";
import {
  FakeCanvasContext,
  FakeGameView,
  FakeMapRenderer,
  FakePlayerView,
  FakeTransformHandler,
  createFakeBuildMenu,
  createFakeControlPanel,
  installFakeCanvas,
} from "../../test/fakes";
import { setAllianceViewShowing } from "../alliance-view/showing";
import { LAYER } from "./layer";
import { nationHatch } from "./index";

interface Setup {
  game: FakeGameView;
  camera: FakeTransformHandler;
  renderer: FakeMapRenderer;
  nation: FakePlayerView;
  session: FeatureSession;
  detach: () => void;
}

let canvas: FakeCanvasContext;
let restoreCanvas: () => void;
const attachedDetaches: (() => void)[] = [];

/** A match with one nation that owns two tiles and one human that owns one. */
function setup(): Setup {
  const panel = createFakeControlPanel();
  const camera = new FakeTransformHandler();
  createFakeBuildMenu(camera);
  const renderer = new FakeMapRenderer();
  window.__webglView = renderer;

  const game = new FakeGameView();
  panel.game = game;
  const nation = game.add(new FakePlayerView(2, "france"));
  nation.kind = "NATION";
  const human = game.add(new FakePlayerView(3, "spain"));
  human.kind = "HUMAN";
  game.own(5, 5, 2);
  game.own(6, 5, 2);
  game.own(20, 20, 3);

  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
    optionValue: () => false,
  });
  const session = nationHatch.attach(attached.context) ?? {};
  attachedDetaches.push(attached.detach);
  return { game, camera, renderer, nation, session, detach: attached.detach };
}

function frames(count = 1): void {
  for (let i = 0; i < count; i++) vi.advanceTimersToNextFrame();
}

/** The calls of the last frame that drew anything, from its wipe on. */
function lastFrame() {
  const wipe = canvas.calls.map((c) => c.op).lastIndexOf("clearRect");
  return canvas.calls.slice(wipe);
}

/** True when the last frame laid stripes on the screen. */
function hatchDrawn(): boolean {
  return lastFrame().some((call) => call.op === "fillRect");
}

/** The call that cut the stripes down to the nations' tiles, on the last frame. */
function maskCut() {
  return lastFrame().find(
    (call) =>
      call.op === "drawImage" && call.globalCompositeOperation === "destination-in",
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  ({ context: canvas, restore: restoreCanvas } = installFakeCanvas());
});

afterEach(() => {
  for (const detach of attachedDetaches.splice(0)) detach();
  setAllianceViewShowing(false);
  restoreCanvas();
  vi.useRealTimers();
  delete window.__webglView;
});

describe("the nation hatch", () => {
  it("is a feature of its own, on until a player switches it off", () => {
    expect(nationHatch.id).toBe("nation-hatch");
    expect(nationHatch.options ?? []).toEqual([]);
  });

  it("lays stripes over the screen and cuts them down to the nations' tiles", () => {
    setup();
    frames();

    const stripes = lastFrame().find((call) => call.op === "fillRect")!;
    expect(stripes.fillStyle).toEqual({ pattern: true });
    // The camera's scale is 2 and it has no offset, so the 100-tile map spans 200 px.
    expect(maskCut()!.args.slice(1)).toEqual([0, 0, 200, 200]);
  });

  it("keeps the tiles sharp when it scales the mask up to the screen", () => {
    setup();
    frames();

    expect(maskCut()!.imageSmoothingEnabled).toBe(false);
  });

  it("covers only the tiles a nation owns", () => {
    setup();
    frames();

    const put = canvas.of("putImageData").at(-1)!;
    const pixels = (put.args[0] as { data: Uint8ClampedArray }).data;
    const alphaAt = (x: number, y: number) => pixels[(y * 100 + x) * 4 + 3];
    expect([alphaAt(5, 5), alphaAt(6, 5), alphaAt(20, 20), alphaAt(0, 0)]).toEqual([
      255, 255, 0, 0,
    ]);
  });

  it("follows the camera when the map moves or zooms", () => {
    const { camera } = setup();
    frames();

    camera.scale = 4;
    camera.offsetX = 10;
    frames();

    // World x 0 lands at (0 - 10) * 4 = -40 px.
    expect(maskCut()!.args.slice(1)).toEqual([-40, 0, 400, 400]);
  });

  it("follows the territory as it changes, once the game ticks", () => {
    const { game, session } = setup();
    frames();

    game.own(7, 5, 2);
    game.tickCount += 10;
    session.tick?.();
    frames();

    const put = canvas.of("putImageData").at(-1)!;
    const pixels = (put.args[0] as { data: Uint8ClampedArray }).data;
    expect(pixels[(5 * 100 + 7) * 4 + 3]).toBe(255);
  });

  it("uploads only the rows of the map that changed", () => {
    const { game, session } = setup();
    frames();

    game.own(40, 30, 2);
    game.tickCount += 10;
    session.tick?.();
    frames();

    // The image, its place, then the dirty band: x 0, row 30, the full width, one row.
    expect(canvas.of("putImageData").at(-1)!.args.slice(1)).toEqual([0, 0, 0, 30, 100, 1]);
  });

  it("drops a nation's stripes once it dies", () => {
    const { game, nation, session } = setup();
    frames();

    nation.alive = false;
    game.tickCount += 10;
    session.tick?.();
    frames();

    expect(hatchDrawn()).toBe(false);
  });

  it("draws nothing in a Humans vs Nations match", () => {
    const { game, session } = setup();
    game.settings.match = { gameMode: "Team", playerTeams: "Humans Vs Nations" };
    game.tickCount += 10;
    session.tick?.();
    frames();

    expect(hatchDrawn()).toBe(false);
  });

  it("stands aside while the alliance view mode greys the map", () => {
    setup();
    frames();
    expect(hatchDrawn()).toBe(true);

    setAllianceViewShowing(true);
    frames();
    expect(hatchDrawn()).toBe(false);

    setAllianceViewShowing(false);
    frames();
    expect(hatchDrawn()).toBe(true);
  });

  it("stands aside while the game's alternate view is on, from its key or its menu", () => {
    const { renderer } = setup();
    frames();

    renderer.renderer.altView = true;
    frames();
    expect(hatchDrawn()).toBe(false);

    renderer.renderer.altView = false;
    frames();
    expect(hatchDrawn()).toBe(true);
  });

  it("draws nothing until the game's camera exists", () => {
    setup();
    document.querySelector("build-menu")!.remove();
    frames();

    expect(canvas.of("fillRect")).toEqual([]);
  });

  it("takes its canvas off the page when switched off", () => {
    const { detach } = setup();
    frames();
    expect(document.querySelector(`.${LAYER}`)).not.toBeNull();

    detach();

    expect(document.querySelector(`.${LAYER}`)).toBeNull();
  });
});
