import { describe, expect, it } from "vitest";
import { FakeGameView, FakePlayerView } from "../../test/fakes";
import { readHatchedNations } from "./nations";

function nation(game: FakeGameView, smallID: number): FakePlayerView {
  const player = game.add(new FakePlayerView(smallID));
  player.kind = "NATION";
  return player;
}

describe("readHatchedNations", () => {
  it("hatches every living nation and nobody else", () => {
    const game = new FakeGameView();
    nation(game, 2);
    nation(game, 3);
    game.add(new FakePlayerView(4)).kind = "HUMAN";
    game.add(new FakePlayerView(5)).kind = "BOT";

    expect([...readHatchedNations(game)].sort()).toEqual([2, 3]);
  });

  it("drops a nation once it dies", () => {
    const game = new FakeGameView();
    nation(game, 2);
    nation(game, 3).alive = false;

    expect([...readHatchedNations(game)]).toEqual([2]);
  });

  it("hatches nobody in a Humans vs Nations match, where the team colour already tells", () => {
    const game = new FakeGameView();
    nation(game, 2);
    game.settings.match = { gameMode: "Team", playerTeams: "Humans Vs Nations" };

    expect(readHatchedNations(game).size).toBe(0);
  });

  it("still hatches nations in a team match of another kind", () => {
    const game = new FakeGameView();
    nation(game, 2);
    game.settings.match = { gameMode: "Team", playerTeams: 4 };

    expect([...readHatchedNations(game)]).toEqual([2]);
  });
});
