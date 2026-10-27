import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeatureContext } from "../../runtime/context";
import type { OptionValue } from "../../runtime/feature";
import {
  FakeCanvasContext,
  FakeGameView,
  FakeMapRenderer,
  FakePlayerView,
  FakeTransformHandler,
  createFakeBuildMenu,
  createFakeControlPanel,
  fakeColour,
  installFakeCanvas,
} from "../../test/fakes";
import { FADE_MS, GLIDE_MS } from "./motion";
import { LAYER } from "./layer";
import { spawnMarks } from "./index";

const NATIONS = "nation-teammates";

interface Setup {
  game: FakeGameView;
  camera: FakeTransformHandler;
  me: FakePlayerView;
  mate: FakePlayerView;
  detach: () => void;
}

let canvas: FakeCanvasContext;
let restoreCanvas: () => void;
/** Every instance a test attached, so one never keeps drawing into the next. */
const attachedDetaches: (() => void)[] = [];

function setup(options: { nations?: boolean; teams?: boolean } = {}): Setup {
  const panel = createFakeControlPanel();
  const camera = new FakeTransformHandler();
  createFakeBuildMenu(camera);
  window.__webglView = new FakeMapRenderer();

  const game = new FakeGameView();
  game.spawnPhase = true;
  panel.game = game;

  const team = options.teams === false ? null : "Red";
  const me = game.add(new FakePlayerView(1, "me", fakeColour(255, 0, 0)));
  game.player = me;
  me.teamName = team;
  const mate = game.add(new FakePlayerView(2, "mate", fakeColour(10, 200, 30)));
  mate.teamName = team;
  mate.name = "Ada";
  mate.spawnAt(10, 10, game);

  return { game, camera, me, mate, ...attach(panel, options.nations ?? false) };
}

function attach(
  panel: ReturnType<typeof createFakeControlPanel>,
  nations: boolean,
): { detach: () => void } {
  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game: panel.game!,
    optionValue: (option): OptionValue =>
      option === NATIONS ? nations : false,
  });
  spawnMarks.attach(attached.context);
  attachedDetaches.push(attached.detach);
  return { detach: attached.detach };
}

function frames(count = 1): void {
  for (let i = 0; i < count; i++) vi.advanceTimersToNextFrame();
}

/** The names drawn on the last frame. */
function lastFrameNames(): string[] {
  const calls = canvas.calls;
  const wipe = calls.map((c) => c.op).lastIndexOf("clearRect");
  return calls
    .slice(wipe)
    .filter((c) => c.op === "fillText")
    .map((c) => String(c.args[0]));
}

function lastFrame() {
  const wipe = canvas.calls.map((c) => c.op).lastIndexOf("clearRect");
  return canvas.calls.slice(wipe);
}

beforeEach(() => {
  vi.useFakeTimers();
  ({ context: canvas, restore: restoreCanvas } = installFakeCanvas());
});

afterEach(() => {
  for (const detach of attachedDetaches.splice(0)) detach();
  restoreCanvas();
  vi.useRealTimers();
  delete window.__webglView;
});

describe("the spawn marks feature", () => {
  it("is a feature of its own with one option, for Nations", () => {
    expect(spawnMarks.id).toBe("spawn-marks");
    expect(spawnMarks.options?.map((option) => option.key)).toEqual([NATIONS]);
    expect(spawnMarks.options?.[0]?.whenUnset).toBe(false);
  });

  it("marks a teammate's spawn with a ring and their name", () => {
    setup({ nations: true });
    // The camera scale is 2, so the tile (10, 10) lands at (20, 20).
    frames();

    const arc = canvas.of("arc")[0]!;
    expect(arc.args.slice(0, 2)).toEqual([20, 20]);
    expect(lastFrameNames()).toEqual(["Ada"]);
  });

  it("draws the ring and the name in the teammate's own colour", () => {
    setup({ nations: true });
    frames();

    expect(canvas.of("fillText")[0]!.fillStyle).toBe("rgb(10,200,30)");
  });

  it("makes the ring bigger as the player zooms in", () => {
    const { camera } = setup({ nations: true });
    frames();
    const before = canvas.of("arc").at(-1)!.args[2] as number;

    camera.scale = 4;
    frames();

    expect(canvas.of("arc").at(-1)!.args[2] as number).toBeGreaterThan(before);
  });

  it("follows the camera when the map moves", () => {
    const { camera } = setup({ nations: true });
    frames();

    camera.offsetX = 5;
    frames();

    // (10 - 5) * 2 = 10
    expect(canvas.of("arc").at(-1)!.args[0]).toBe(10);
  });
});

describe("which games get marks", () => {
  it("draws no mark for a Nation teammate unless the player asks", () => {
    const { mate } = setup();
    mate.kind = "NATION";
    frames();

    expect(canvas.of("arc")).toHaveLength(0);
  });

  it("draws a mark for a human teammate with the option off", () => {
    setup();
    frames();

    expect(canvas.of("arc")).toHaveLength(1);
  });

  it("draws nothing in a game without teams", () => {
    setup({ teams: false });
    frames(3);

    expect(canvas.of("arc")).toHaveLength(0);
    expect(canvas.of("fillText")).toHaveLength(0);
  });

  it("draws nothing while the game has no local player, as in a replay", () => {
    const { game } = setup();
    game.player = null;
    frames(3);

    expect(canvas.of("arc")).toHaveLength(0);
  });

  it("draws nothing for a teammate who has not picked a spawn", () => {
    const { mate } = setup();
    delete mate.state.spawnTile;
    frames();

    expect(canvas.of("arc")).toHaveLength(0);
  });

  it("waits for the camera instead of failing", () => {
    setup();
    document.querySelector("build-menu")!.remove();
    frames(2);

    expect(canvas.of("arc")).toHaveLength(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });
});

describe("a teammate who is off screen", () => {
  it("gets a chevron at the screen edge instead of a ring", () => {
    const { camera } = setup();
    camera.offsetX = -2000;
    frames();

    expect(canvas.of("arc")).toHaveLength(0);
    expect(canvas.of("fill")).toHaveLength(1);
    expect(canvas.of("translate")[0]!.args[0]).toBe(window.innerWidth - 60);
  });

  it("merges the chevrons of teammates that land together, with a count", () => {
    const { game, camera } = setup();
    for (const id of [3, 4]) {
      const extra = game.add(new FakePlayerView(id, `m${id}`));
      extra.teamName = "Red";
      extra.spawnAt(10 + id, 10, game);
    }
    camera.offsetX = -2000;
    frames();

    expect(canvas.of("fill")).toHaveLength(1);
    expect(lastFrameNames()).toEqual(["×3"]);
  });

  it("swaps the chevron for a ring when the teammate comes into view", () => {
    const { camera } = setup();
    camera.offsetX = -2000;
    frames();

    camera.offsetX = 0;
    frames();

    expect(lastFrame().some((call) => call.op === "arc")).toBe(true);
    expect(lastFrame().some((call) => call.op === "translate")).toBe(false);
  });
});

describe("a teammate who picks a spawn again", () => {
  it("makes the ring glide to the new spawn", () => {
    const { game, mate } = setup();
    frames();
    mate.spawnAt(30, 10, game);

    frames(4);
    const during = canvas.of("arc").at(-1)!.args[0] as number;
    vi.advanceTimersByTime(GLIDE_MS + 50);
    frames();
    const after = canvas.of("arc").at(-1)!.args[0] as number;

    expect(during).toBeGreaterThan(20);
    expect(during).toBeLessThan(60);
    expect(after).toBe(60);
  });
});

describe("when the spawn phase ends", () => {
  it("fades the marks over 1.2 s and then draws nothing more", () => {
    const { game } = setup();
    frames();

    game.spawnPhase = false;
    frames();
    const first = canvas.of("fillText").at(-1)!.globalAlpha;
    vi.advanceTimersByTime(FADE_MS / 2);
    frames();
    const middle = canvas.of("fillText").at(-1)!.globalAlpha;
    vi.advanceTimersByTime(FADE_MS);
    frames(2);

    expect(first).toBeGreaterThan(0.9);
    expect(middle).toBeGreaterThan(0.3);
    expect(middle).toBeLessThan(0.7);
    expect(lastFrame().filter((c) => c.op !== "clearRect" && c.op !== "setTransform")).toEqual([]);
  });

  it("stops looping once the fade is over", () => {
    const { game } = setup();
    frames();

    game.spawnPhase = false;
    vi.advanceTimersByTime(FADE_MS + 200);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the marks where they were while it fades", () => {
    const { game, mate } = setup();
    frames();
    game.spawnPhase = false;
    mate.spawnAt(40, 10, game);

    frames();

    expect(canvas.of("arc").at(-1)!.args[0]).toBe(20);
  });

  it("draws nothing for a feature switched on after the phase ended", () => {
    const { game, detach } = setup();
    detach();
    canvas.calls.length = 0;
    game.spawnPhase = false;

    attach(createFakeControlPanel(), false);
    frames(3);

    expect(canvas.of("arc")).toHaveLength(0);
  });
});

describe("switching the feature off and the match ending", () => {
  it("takes the canvas out of the page and stops the loop on detach", () => {
    const { detach } = setup();
    frames();

    detach();

    expect(document.querySelectorAll(`canvas.${LAYER}`)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("draws again in the next match", () => {
    const first = setup();
    frames();
    first.detach();
    document.body.replaceChildren();
    canvas.calls.length = 0;

    setup();
    frames();

    expect(canvas.of("arc")).toHaveLength(1);
    expect(document.querySelectorAll(`canvas.${LAYER}`)).toHaveLength(1);
  });

  it("gives up and clears the canvas when a frame throws", () => {
    const { game } = setup();
    frames();
    game.players = () => {
      throw new Error("the match is gone");
    };

    frames();

    expect(vi.getTimerCount()).toBe(0);
    expect(lastFrame().some((call) => call.op === "arc")).toBe(false);
  });
});
