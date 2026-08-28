import { describe, expect, it } from "vitest";
import { isMatchLive } from "./match";
import { FakeGameView, FakePlayerView } from "../test/fakes";

describe("whether a match is live enough to read", () => {
  it("says yes once the player is playing", () => {
    expect(isMatchLive(new FakeGameView())).toBe(true);
  });

  it("says no during the spawn phase, before the player picks a tile", () => {
    const game = new FakeGameView();
    game.spawnPhase = true;

    expect(isMatchLive(game)).toBe(false);
  });

  it("says no before the first game update, when there is no player yet", () => {
    const game = new FakeGameView();
    game.player = null;

    expect(isMatchLive(game)).toBe(false);
  });

  it("says no in a replay, where there is never a local player", () => {
    const game = new FakeGameView();
    game.player = null;
    game.tickCount = 500;

    expect(isMatchLive(game)).toBe(false);
  });

  it("says no after the player dies", () => {
    const game = new FakeGameView();
    const dead = new FakePlayerView();
    dead.alive = false;
    game.player = dead;

    expect(isMatchLive(game)).toBe(false);
  });
});
