import { afterEach, describe, expect, it, vi } from "vitest";
import { setSpotlight, spotlightedPlayer } from "../alliance-view/spotlight";
import { createFeatureContext } from "../../runtime/context";
import { HIDDEN } from "../../runtime/styles";
import {
  FakeGameView,
  FakePlayerView,
  FakeTransformHandler,
  createFakeBuildMenu,
  createFakeControlPanel,
  createFakeSidebar,
} from "../../test/fakes";
import { alliancePanel } from "./index";

const PANEL = ".ofx-alliance-panel";
const ROW = ".ofx-alliance-row";
const SECOND = 10;

const attached: Array<() => void> = [];

afterEach(() => {
  while (attached.length > 0) attached.pop()!();
  setSpotlight(null);
  vi.useRealTimers();
});

function setup() {
  const host = createFakeSidebar();
  const camera = new FakeTransformHandler();
  createFakeBuildMenu(camera);
  const control = createFakeControlPanel();
  const game = new FakeGameView();
  control.game = game;
  game.tickCount = 1000;
  const me = game.add(game.player!);
  const ana = game.add(new FakePlayerView(2));
  ana.name = "Ana";
  const ben = game.add(new FakePlayerView(3));
  ben.name = "Ben";

  const context = createFeatureContext({
    panel: control.asControlPanel(),
    game,
    optionValue: () => false,
  });
  attached.push(context.detach);
  const session = alliancePanel.attach(context.context);

  return {
    host,
    camera,
    game,
    me,
    ana,
    ben,
    detach: context.detach,
    /** Runs one game tick, reporting the given news. */
    tick(news: Record<number, unknown[]> = {}) {
      game.updates = news;
      session!.tick!();
    },
  };
}

const rowsOf = () => [...document.querySelectorAll<HTMLElement>(ROW)];
const textOf = (row: HTMLElement) => row.textContent;

describe("where the alliance panel draws", () => {
  it("is the third child of the game's top right box, below its two panels", () => {
    const { host, me, ana, tick } = setup();
    me.allyWith(ana, 5000);

    tick();

    expect(host.children).toHaveLength(3);
    expect(host.children[0]?.tagName).toBe("GAME-RIGHT-SIDEBAR");
    expect(host.children[1]?.tagName).toBe("REPLAY-PANEL");
    expect(host.children[2]?.matches(PANEL)).toBe(true);
  });

  it("draws once, however many ticks pass", () => {
    const { me, ana, tick } = setup();
    me.allyWith(ana, 5000);

    tick();
    tick();
    tick();

    expect(document.querySelectorAll(PANEL)).toHaveLength(1);
    expect(rowsOf()).toHaveLength(1);
  });

  it("is hidden while there is no row to show", () => {
    const { me, ana, tick } = setup();

    tick();
    expect(document.querySelector(PANEL)?.classList.contains(HIDDEN)).toBe(true);

    me.allyWith(ana, 5000);
    tick();
    expect(document.querySelector(PANEL)?.classList.contains(HIDDEN)).toBe(false);
  });

  it("draws nothing during the spawn phase, in a replay and after death", () => {
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 5000);

    game.spawnPhase = true;
    tick();
    expect(document.querySelectorAll(PANEL)).toHaveLength(0);

    game.spawnPhase = false;
    game.player = null;
    tick();
    expect(document.querySelectorAll(PANEL)).toHaveLength(0);

    game.player = me;
    me.alive = false;
    tick();
    expect(document.querySelectorAll(PANEL)).toHaveLength(0);
  });

  it("comes back when the match is live again", () => {
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    game.spawnPhase = true;
    tick();

    game.spawnPhase = false;
    tick();

    expect(rowsOf()).toHaveLength(1);
  });

  it("waits quietly for the game to draw its top right box", () => {
    const { host, me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    host.remove();

    expect(() => tick()).not.toThrow();
    expect(document.querySelectorAll(PANEL)).toHaveLength(0);

    document.body.append(host);
    tick();
    expect(rowsOf()).toHaveLength(1);
  });
});

describe("what a row says", () => {
  it("writes the name and the clock of an alliance", () => {
    const { me, ana, tick } = setup();
    me.allyWith(ana, 1000 + 127 * SECOND);

    tick();

    const row = rowsOf()[0]!;
    expect(row.querySelector(".ofx-alliance-name")?.textContent).toBe("Ana");
    expect(row.querySelector(".ofx-alliance-time")?.textContent).toBe("2:07");
    expect(
      row.querySelector(".ofx-alliance-tag")?.classList.contains(HIDDEN),
    ).toBe(true);
  });

  it("turns the bar red on the renewal window", () => {
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 1500);

    tick();
    const row = () => document.querySelector(ROW)!;
    expect(row().classList.contains("ofx-alliance-row-urgent")).toBe(false);

    game.tickCount = 1250;
    tick();
    expect(row().classList.contains("ofx-alliance-row-urgent")).toBe(true);
  });

  it("tells a request and an ended alliance apart by their words", () => {
    const { me, ana, tick } = setup();
    tick({
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
      8: [{ player1ID: 1, player2ID: 2 }],
    });

    expect(rowsOf().map(textOf)).toEqual(["Benasks you0:20", "Anaended0:00"]);
    expect(me).toBeDefined();
    expect(ana).toBeDefined();
  });

  it("lists the rows with the most time left on top", () => {
    const { me, ana, ben, tick } = setup();
    me.allyWith(ana, 1000 + 60 * SECOND);
    me.allyWith(ben, 1000 + 200 * SECOND);

    tick();

    expect(rowsOf().map(textOf)).toEqual(["Ben3:20", "Ana1:00"]);
  });
});

describe("keeping the rows steady", () => {
  it("updates a row in place, so a click under way is not lost", () => {
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    tick();
    const before = rowsOf()[0]!;

    game.tickCount = 1100;
    tick();

    const after = rowsOf()[0]!;
    expect(after).toBe(before);
    expect(textOf(after)).toBe("Ana6:30");
  });

  it("leaves the rows alone when their order did not change", () => {
    const { game, me, ana, ben, tick } = setup();
    me.allyWith(ana, 5000);
    me.allyWith(ben, 9000);
    tick();
    const move = vi.spyOn(HTMLElement.prototype, "append");

    game.tickCount = 1010;
    tick();

    expect(move).not.toHaveBeenCalled();
  });

  it("moves the rows when one passes another", () => {
    const { game, me, ana, ben, tick } = setup();
    const id = me.allyWith(ana, 5000);
    me.allyWith(ben, 9000);
    tick();
    expect(rowsOf().map(textOf)[0]).toContain("Ben");

    me.renew(id, 20000);
    game.tickCount = 1010;
    tick();

    expect(rowsOf().map(textOf)[0]).toContain("Ana");
  });

  it("removes a row when its alliance is gone", () => {
    const { game, me, ana, tick } = setup();
    const id = me.allyWith(ana, 5000);
    tick();

    me.endAlliance(id);
    game.tickCount = 1010;
    tick();

    expect(rowsOf()).toHaveLength(0);
  });
});

describe("a click on a row", () => {
  it("moves the camera to that player and does nothing else", () => {
    const { camera, me, ana, ben, tick } = setup();
    me.allyWith(ana, 5000);
    me.allyWith(ben, 9000);
    tick();

    rowsOf()[1]!.querySelector<HTMLElement>(".ofx-alliance-name")!.click();

    expect(camera.visited).toEqual([ana]);
  });

  it("moves the camera for a request and for an ended alliance too", () => {
    const { camera, ana, ben, tick } = setup();
    tick({
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
      8: [{ player1ID: 1, player2ID: 2 }],
    });

    for (const row of rowsOf()) row.click();

    expect(camera.visited).toEqual([ben, ana]);
  });

  it("survives a camera the game has not built yet", () => {
    const { me, ana, tick } = setup();
    document.querySelector("build-menu")!.remove();
    me.allyWith(ana, 5000);
    tick();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => rowsOf()[0]!.click()).not.toThrow();
    expect(error).toHaveBeenCalled();
  });

  it("sends no intent: it never touches the game's event bus", () => {
    const { me, ana, tick } = setup();
    const control = document.querySelector("control-panel") as unknown as {
      eventBus: { listenerCount(): number };
    };
    me.allyWith(ana, 5000);
    tick();

    rowsOf()[0]!.click();

    expect(control.eventBus.listenerCount()).toBe(0);
  });
});

describe("switching the panel off", () => {
  it("takes the panel out of the page and leaves the game's own boxes", () => {
    const { host, me, ana, tick, detach } = setup();
    me.allyWith(ana, 5000);
    tick();

    detach();

    expect(document.querySelectorAll(PANEL)).toHaveLength(0);
    expect(host.children).toHaveLength(2);
  });

  it("starts from nothing in the next match", () => {
    const first = setup();
    first.tick({ 5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }] });
    expect(rowsOf()).toHaveLength(1);
    first.detach();

    const second = setup();
    second.tick();

    expect(rowsOf()).toHaveLength(0);
  });
});

describe("the bar behind a row", () => {
  const frac = (row: HTMLElement) => row.style.getPropertyValue("--ofx-frac");

  it("shows the share of the alliance's whole run that is left", () => {
    const { me, ana, ben, tick } = setup();
    me.allyWith(ana, 1000 + 3000);
    me.allyWith(ben, 1000 + 750);

    tick();

    expect(rowsOf().map(frac)).toEqual(["100%", "25%"]);
  });

  it("drains as the match runs", () => {
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 1000 + 3000);
    tick();

    game.tickCount = 1000 + 1500;
    tick();

    expect(frac(rowsOf()[0]!)).toBe("50%");
  });

  it("is empty for an alliance that ended", () => {
    const { tick } = setup();

    tick({ 8: [{ player1ID: 1, player2ID: 2 }] });

    expect(frac(rowsOf()[0]!)).toBe("0%");
  });
});

describe("a cursor resting on a row", () => {
  const over = (row: HTMLElement) =>
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  const leave = () =>
    document
      .querySelector(PANEL)!
      .dispatchEvent(new MouseEvent("mouseleave"));

  it("shows that player on their own once the cursor has rested", () => {
    vi.useFakeTimers();
    const { me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    tick();

    over(rowsOf()[0]!);
    expect(spotlightedPlayer()).toBeNull();
    vi.advanceTimersByTime(120);

    expect(spotlightedPlayer()).toBe(2);
  });

  it("shows nothing for a cursor that only crosses the row", () => {
    vi.useFakeTimers();
    const { me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    tick();

    over(rowsOf()[0]!);
    vi.advanceTimersByTime(30);
    leave();
    vi.advanceTimersByTime(500);

    expect(spotlightedPlayer()).toBeNull();
  });

  it("puts the map back as the cursor leaves the panel", () => {
    vi.useFakeTimers();
    const { me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    tick();
    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    leave();

    expect(spotlightedPlayer()).toBeNull();
  });

  it("moves to the next row when the cursor does", () => {
    vi.useFakeTimers();
    const { me, ana, ben, tick } = setup();
    me.allyWith(ana, 5000);
    me.allyWith(ben, 9000);
    tick();
    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    over(rowsOf()[1]!);
    vi.advanceTimersByTime(120);

    expect(spotlightedPlayer()).toBe(2);
  });

  it("works for a request and an ended alliance too", () => {
    vi.useFakeTimers();
    const { tick } = setup();
    tick({
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
      8: [{ player1ID: 1, player2ID: 2 }],
    });

    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    expect(spotlightedPlayer()).toBe(3);
  });

  it("ends when the row under the cursor goes away", () => {
    vi.useFakeTimers();
    const { game, me, ana, tick } = setup();
    const id = me.allyWith(ana, 5000);
    tick();
    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    me.endAlliance(id);
    game.tickCount = 1010;
    tick();

    expect(spotlightedPlayer()).toBeNull();
  });

  it("ends when the match stops being live, since no leave event comes", () => {
    vi.useFakeTimers();
    const { game, me, ana, tick } = setup();
    me.allyWith(ana, 5000);
    tick();
    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    game.player = null;
    tick();

    expect(spotlightedPlayer()).toBeNull();
  });

  it("leaves the map alone when the panel is switched off under the cursor", () => {
    vi.useFakeTimers();
    const { me, ana, tick, detach } = setup();
    me.allyWith(ana, 5000);
    tick();
    over(rowsOf()[0]!);
    vi.advanceTimersByTime(120);

    detach();

    expect(spotlightedPlayer()).toBeNull();
  });

  it("never fires after the panel is switched off mid-rest", () => {
    vi.useFakeTimers();
    const { me, ana, tick, detach } = setup();
    me.allyWith(ana, 5000);
    tick();
    over(rowsOf()[0]!);

    detach();
    vi.advanceTimersByTime(500);

    expect(spotlightedPlayer()).toBeNull();
  });
});
