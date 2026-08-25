import { describe, expect, it } from "vitest";
import { tickMarker } from "./index";
import { createFeatureContext } from "../../runtime/context";
import {
  addTroopBars,
  createFakeControlPanel,
  FakeGameView,
} from "../../test/fakes";

function setup() {
  const panel = createFakeControlPanel();
  const [cell] = addTroopBars(panel, 1);
  const game = new FakeGameView();
  panel.game = game;
  const attached = createFeatureContext({
    panel: panel.asControlPanel(),
    game,
  });
  const session = tickMarker.attach(attached.context);
  return {
    panel,
    cell: cell!,
    game,
    detach: attached.detach,
    tick: () => session!.tick!(),
  };
}

function badges(): NodeListOf<Element> {
  return document.querySelectorAll(".ofx-tick-marker");
}

describe("the throwaway tick marker", () => {
  it("draws nothing before the match is live", () => {
    const { game, tick } = setup();
    game.spawnPhase = true;

    tick();

    expect(badges()).toHaveLength(0);
  });

  it("draws a badge above the troop bar once the match is live", () => {
    const { tick } = setup();

    tick();

    expect(badges()).toHaveLength(1);
  });

  it("shows the game's tick count", () => {
    const { game, tick } = setup();
    game.tickCount = 417;

    tick();

    expect(badges()[0]!.textContent).toContain("417");
  });

  it("follows the tick count as the match runs", () => {
    const { game, tick } = setup();
    game.tickCount = 1;
    tick();

    game.tickCount = 2;
    tick();

    expect(badges()).toHaveLength(1);
    expect(badges()[0]!.textContent).toContain("2");
  });

  it("takes the badge away when the player dies", () => {
    const { game, tick } = setup();
    tick();

    game.player!.alive = false;
    tick();

    expect(badges()).toHaveLength(0);
  });

  it("leaves no trace when the match ends", () => {
    const { tick, detach, cell } = setup();
    tick();

    detach();

    expect(badges()).toHaveLength(0);
    expect(cell.getAttribute("style")).toBeNull();
  });
});
