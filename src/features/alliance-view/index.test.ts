import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFeatureContext } from "../../runtime/context";
import type { OptionValue } from "../../runtime/feature";
import { HIDDEN } from "../../runtime/styles";
import {
  FakeGameView,
  FakeMapRenderer,
  FakePlayerView,
  FakeTransformHandler,
  createFakeBuildMenu,
  createFakeControlPanel,
  fakeColour,
} from "../../test/fakes";
import { allianceView } from "./index";
import { CLOCK, URGENT } from "./clocks";
import { GREY, readSlot } from "./palette";

const HOLD = "Backquote";

/** Where each player owns a tile, and where that tile lands on the screen. */
const SUBJECT_AT = { tile: { x: 3, y: 4 }, screen: { x: 6, y: 8 } };
const STRANGER_AT = { tile: { x: 40, y: 40 }, screen: { x: 80, y: 80 } };
const OCEAN_AT = { tile: { x: 50, y: 50 }, screen: { x: 100, y: 100 } };

interface Setup {
  game: FakeGameView;
  renderer: FakeMapRenderer;
  camera: FakeTransformHandler;
  subject: FakePlayerView;
  ally: FakePlayerView;
  detach: () => void;
}

function setup(
  options: { keybinds?: Record<string, string>; holdKey?: string } = {},
): Setup {
  const panel = createFakeControlPanel();
  const camera = new FakeTransformHandler();
  createFakeBuildMenu(camera);
  const renderer = new FakeMapRenderer();
  window.__webglView = renderer;

  const game = new FakeGameView();
  game.tickCount = 0;
  panel.game = game;
  const subject = game.add(
    new FakePlayerView(1, "p1", fakeColour(255, 0, 0)),
  );
  const ally = game.add(
    new FakePlayerView(2, "p2", fakeColour(0, 255, 0)),
  );
  game.add(new FakePlayerView(3, "p3", fakeColour(0, 0, 255)));
  subject.allyWith(ally, 2000);
  ally.nameData = { x: 10, y: 10, size: 40 };

  game.own(SUBJECT_AT.tile.x, SUBJECT_AT.tile.y, 1);
  game.own(STRANGER_AT.tile.x, STRANGER_AT.tile.y, 3);
  game.makeWater(OCEAN_AT.tile.x, OCEAN_AT.tile.y);

  if (options.keybinds) {
    localStorage.setItem("settings.keybinds", JSON.stringify(options.keybinds));
  }

  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
    optionValue: (option): OptionValue =>
      option === "hold-key" ? (options.holdKey ?? HOLD) : false,
  });
  allianceView.attach(attached.context);

  return {
    game,
    renderer,
    camera,
    subject,
    ally,
    detach: attached.detach,
  };
}

function keyDown(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
}

function keyUp(code: string): void {
  window.dispatchEvent(new KeyboardEvent("keyup", { code }));
}

function pointAt(at: { x: number; y: number }): void {
  window.dispatchEvent(
    new MouseEvent("mousemove", { clientX: at.x, clientY: at.y }),
  );
}

function frames(count = 1): void {
  for (let i = 0; i < count; i++) vi.advanceTimersToNextFrame();
}

/** A player's fill on the last table the renderer was handed. */
function fillOf(renderer: FakeMapRenderer, smallID: number): number[] {
  return readSlot(renderer.last!, smallID).fill;
}

const isGrey = (fill: number[]) => fill[0] === Math.fround(GREY);

const clocks = () =>
  [...document.querySelectorAll<HTMLElement>(`.${CLOCK}`)].filter(
    (node) => !node.classList.contains(HIDDEN),
  );

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  vi.useRealTimers();
  delete window.__webglView;
});

describe("switching the alliance view mode on", () => {
  it("leaves the map alone until the key goes down", () => {
    const { renderer } = setup();

    pointAt(SUBJECT_AT.screen);
    frames();

    expect(renderer.palettes).toHaveLength(0);
  });

  /**
   * The first press has no subject. Making the local player the subject there
   * would show your own web, then swap it for a stranger's the moment the
   * cursor crossed one. See issue #13.
   */
  it("greys every player on a press with the cursor over nobody", () => {
    const { renderer } = setup();

    pointAt(OCEAN_AT.screen);
    keyDown(HOLD);

    expect(isGrey(fillOf(renderer, 1))).toBe(true);
    expect(isGrey(fillOf(renderer, 2))).toBe(true);
    expect(isGrey(fillOf(renderer, 3))).toBe(true);
  });

  it("keeps the subject and their allies in their own colours", () => {
    const { renderer } = setup();

    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    expect(fillOf(renderer, 1)).toEqual([1, 0, 0, expect.any(Number)]);
    expect(fillOf(renderer, 2)).toEqual([0, 1, 0, expect.any(Number)]);
    expect(isGrey(fillOf(renderer, 3))).toBe(true);
  });

  /** A subject with no alliances is the only coloured player on the map. */
  it("colours a subject who has no allies", () => {
    const { renderer } = setup();

    pointAt(STRANGER_AT.screen);
    keyDown(HOLD);

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
    expect(isGrey(fillOf(renderer, 1))).toBe(true);
  });

  it("ignores the key held down rather than pressed again", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    const written = renderer.palettes.length;

    window.dispatchEvent(
      new KeyboardEvent("keydown", { code: HOLD, repeat: true }),
    );

    expect(renderer.palettes).toHaveLength(written);
  });
});

describe("the subject the map is drawn around", () => {
  /** Sweeping across ocean does not throw the subject away. */
  it("sticks when the cursor leaves the subject for open water", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    pointAt(OCEAN_AT.screen);
    frames();

    expect(fillOf(renderer, 1)).toEqual([1, 0, 0, expect.any(Number)]);
  });

  it("changes when the cursor reaches another player", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    pointAt(STRANGER_AT.screen);
    frames();

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
    expect(isGrey(fillOf(renderer, 1))).toBe(true);
  });

  /**
   * A drag and a wheel zoom move the map under a cursor that has not moved,
   * and neither sends a mouse event, so the tile is read on every frame.
   */
  it("follows the map moving under a cursor that has not moved", () => {
    const { renderer, camera } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    // The camera pans so the stranger's tile lands under the still cursor.
    camera.offsetX = STRANGER_AT.tile.x - SUBJECT_AT.tile.x;
    camera.offsetY = STRANGER_AT.tile.y - SUBJECT_AT.tile.y;
    frames();

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  /** Each press is a fresh look. A remembered subject is wrong information. */
  it("is forgotten between two presses", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    keyUp(HOLD);

    pointAt(OCEAN_AT.screen);
    keyDown(HOLD);

    expect(isGrey(fillOf(renderer, 1))).toBe(true);
  });
});

describe("switching the alliance view mode off", () => {
  it("puts every real colour back when the key comes up", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    keyUp(HOLD);

    expect(fillOf(renderer, 1)).toEqual([1, 0, 0, expect.any(Number)]);
    expect(fillOf(renderer, 2)).toEqual([0, 1, 0, expect.any(Number)]);
    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  it("puts a colour back for a player who spawned while the mode was up", () => {
    const { game, renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    game.add(new FakePlayerView(4, "p4", fakeColour(255, 255, 0)));

    keyUp(HOLD);

    expect(fillOf(renderer, 4)).toEqual([1, 1, 0, expect.any(Number)]);
  });

  // A key held while the window loses focus never reports its release.
  it("puts the real colours back when the window loses focus", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    window.dispatchEvent(new Event("blur"));

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  it("stops drawing on every frame once the key is up", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    keyUp(HOLD);
    const written = renderer.palettes.length;

    frames(5);

    expect(renderer.palettes).toHaveLength(written);
  });
});

describe("standing down while something else owns the map", () => {
  /**
   * Under the game's own alternate view the territory shader draws no owned
   * tile at all, so nothing written to the colour table reaches the screen.
   */
  it("puts the real colours back while the game's alternate view is held", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    keyDown("Space");

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  it("comes back when the game's alternate view is let go", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    keyDown("Space");

    keyUp("Space");

    expect(isGrey(fillOf(renderer, 3))).toBe(true);
  });

  it("follows the player's own key for the game's alternate view", () => {
    const { renderer } = setup({ keybinds: { toggleView: "KeyV" } });
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    keyDown("KeyV");

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  /** The game dims itself behind a modal, and a layer of ours over the top
   * reads as a bug. */
  it("puts the real colours back while one of the game's modals is open", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    document.body.style.overflow = "hidden";
    frames();

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
    expect(clocks()).toHaveLength(0);
  });

  it("comes back when the modal closes and the key is still down", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    document.body.style.overflow = "hidden";
    frames();

    document.body.style.overflow = "";
    frames();

    expect(isGrey(fillOf(renderer, 3))).toBe(true);
  });
});

describe("the key the mode is held on", () => {
  it("is the key the player chose", () => {
    const { renderer } = setup({ holdKey: "KeyJ" });
    pointAt(SUBJECT_AT.screen);

    keyDown("KeyJ");

    expect(isGrey(fillOf(renderer, 3))).toBe(true);
  });

  it("ignores a key the mode is not held on", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);

    keyDown("KeyJ");

    expect(renderer.palettes).toHaveLength(0);
  });

  /**
   * The mode must not steal a key the player set. The game's keybinds are read
   * on every press, because a player can rebind them in the middle of a match.
   */
  it("stays off when the game has taken the key", () => {
    const { renderer } = setup({ keybinds: { buildCity: HOLD } });
    pointAt(SUBJECT_AT.screen);

    keyDown(HOLD);

    expect(renderer.palettes).toHaveLength(0);
  });

  it("stays off once the player binds the key in the game mid-match", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    keyUp(HOLD);
    const written = renderer.palettes.length;

    localStorage.setItem(
      "settings.keybinds",
      JSON.stringify({ buildCity: HOLD }),
    );
    keyDown(HOLD);

    expect(renderer.palettes).toHaveLength(written);
  });

  // Without this the mode fires while the player types in the game's chat.
  it("does nothing while the player types", () => {
    const { renderer } = setup();
    const chat = document.createElement("input");
    document.body.append(chat);
    chat.focus();
    pointAt(SUBJECT_AT.screen);

    keyDown(HOLD);

    expect(renderer.palettes).toHaveLength(0);
  });
});

describe("the clocks on the map", () => {
  it("draws one under each ally's own name", () => {
    setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    expect(clocks()).toHaveLength(1);
    expect(clocks()[0]!.textContent).toBe("3:20");
  });

  /**
   * An ally carries a clock and the subject does not, which is what tells the
   * two apart without a mark over a real colour. See docs/adr/0008.
   */
  it("draws none for the subject", () => {
    const { subject } = setup();
    subject.nameData = { x: 20, y: 20, size: 40 };
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    expect(clocks()).toHaveLength(1);
  });

  it("counts down as the match runs", () => {
    const { game } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    game.tickCount = 1000;
    frames();

    expect(clocks()[0]!.textContent).toBe("1:40");
  });

  it("marks a clock the game offers to renew", () => {
    const { game } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    game.tickCount = 1800;
    frames();

    expect(clocks()[0]!.classList.contains(URGENT)).toBe(true);
  });

  it("draws none for an ally the renderer has not placed yet", () => {
    const { ally } = setup();
    ally.nameData = undefined;
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    expect(clocks()).toHaveLength(0);
  });

  it("takes every clock off the screen when the key comes up", () => {
    setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    keyUp(HOLD);

    expect(clocks()).toHaveLength(0);
  });
});

describe("what the mode costs while it is held", () => {
  it("writes the colour table once for one subject, however long it is held", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    const written = renderer.palettes.length;

    frames(30);

    expect(renderer.palettes).toHaveLength(written);
  });

  it("writes it again when an alliance ends under the cursor", () => {
    const { renderer, subject } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    subject.allyList = [];
    subject.allianceList = [];
    frames();

    expect(isGrey(fillOf(renderer, 2))).toBe(true);
  });

  /**
   * A theme change and a late spawn both put the game's own colours back under
   * us, so the mode writes its own again on a slow beat.
   */
  it("writes it again on a slow beat, to repair what the game overwrote", () => {
    const { renderer } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    const written = renderer.palettes.length;

    frames(240);

    expect(renderer.palettes).toHaveLength(written + 1);
  });
});

describe("what the mode leaves behind", () => {
  it("puts the real colours back when the match ends", () => {
    const { renderer, detach } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    detach();

    expect(fillOf(renderer, 3)).toEqual([0, 0, 1, expect.any(Number)]);
  });

  it("takes its layer out of the page", () => {
    const { detach } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    detach();

    expect(document.querySelectorAll(`.${CLOCK}`)).toHaveLength(0);
  });

  it("leaves no key listener behind", () => {
    const { renderer, detach } = setup();
    detach();
    const written = renderer.palettes.length;

    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);

    expect(renderer.palettes).toHaveLength(written);
  });

  it("leaves no frame loop behind", () => {
    const { renderer, detach } = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    detach();
    const written = renderer.palettes.length;

    frames(300);

    expect(renderer.palettes).toHaveLength(written);
  });

  /**
   * Every `smallID` means somebody else in the next match, so a subject
   * carried over would colour a stranger.
   */
  it("starts the next match with no subject", () => {
    const first = setup();
    pointAt(SUBJECT_AT.screen);
    keyDown(HOLD);
    first.detach();
    document.body.replaceChildren();

    const second = setup();
    pointAt(OCEAN_AT.screen);
    keyDown(HOLD);

    expect(isGrey(fillOf(second.renderer, 1))).toBe(true);
  });
});

describe("what the mode does when the page is not ready", () => {
  it("does nothing before the game has built its renderer", () => {
    const { detach } = setup();
    delete window.__webglView;

    expect(() => {
      pointAt(SUBJECT_AT.screen);
      keyDown(HOLD);
      frames();
      keyUp(HOLD);
      detach();
    }).not.toThrow();
  });
});
