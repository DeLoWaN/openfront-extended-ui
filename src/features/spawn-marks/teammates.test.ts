import { describe, expect, it } from "vitest";
import { FakeGameView, FakePlayerView, fakeColour } from "../../test/fakes";
import { readTeammates } from "./teammates";

/** A team game where the local player is on "Red". */
function teamGame() {
  const game = new FakeGameView();
  const me = new FakePlayerView(1, "me", fakeColour(255, 0, 0));
  me.teamName = "Red";
  game.player = me;
  game.add(me);
  return { game, me };
}

function joinRed(
  game: FakeGameView,
  id: number,
  kind: FakePlayerView["kind"] = "HUMAN",
): FakePlayerView {
  const player = game.add(
    new FakePlayerView(id, `p${id}`, fakeColour(200, 10, id)),
  );
  player.teamName = "Red";
  player.kind = kind;
  return player;
}

describe("which players get a mark", () => {
  it("marks a human teammate who has picked a spawn", () => {
    const { game } = teamGame();
    const mate = joinRed(game, 2);
    mate.name = "Ada";
    mate.spawnAt(12, 7, game);

    expect(readTeammates(game, false)).toEqual([
      { id: "p2", name: "Ada", x: 12, y: 7, colour: "rgb(200,10,2)" },
    ]);
  });

  it("marks nobody before the first game update gives the local player", () => {
    const { game } = teamGame();
    joinRed(game, 2).spawnAt(1, 1, game);
    game.player = null;

    expect(readTeammates(game, false)).toEqual([]);
  });

  /** `isOnSameTeam` is always false in a game without teams. */
  it("marks nobody in a free-for-all game", () => {
    const game = new FakeGameView();
    game.add(game.player!);
    const other = game.add(new FakePlayerView(2));
    other.spawnAt(3, 3, game);

    expect(readTeammates(game, false)).toEqual([]);
  });

  it("never marks the local player", () => {
    const { game, me } = teamGame();
    me.spawnAt(5, 5, game);

    expect(readTeammates(game, false)).toEqual([]);
  });

  it("never marks a player on another team", () => {
    const { game } = teamGame();
    const rival = joinRed(game, 2);
    rival.teamName = "Blue";
    rival.spawnAt(4, 4, game);

    expect(readTeammates(game, false)).toEqual([]);
  });

  /** A teammate is not an alliance partner, and the reverse holds too. */
  it("never marks an alliance partner who is not on the team", () => {
    const { game, me } = teamGame();
    const partner = game.add(new FakePlayerView(2));
    partner.teamName = "Blue";
    partner.spawnAt(4, 4, game);
    me.allyWith(partner, 100);

    expect(readTeammates(game, false)).toEqual([]);
  });

  it("leaves out a teammate who has not picked a spawn yet", () => {
    const { game } = teamGame();
    joinRed(game, 2);

    expect(readTeammates(game, false)).toEqual([]);
  });

  it("marks a teammate whose spawn is the very first tile", () => {
    const { game } = teamGame();
    joinRed(game, 2).spawnAt(0, 0, game);

    expect(readTeammates(game, false)).toHaveLength(1);
  });

  it("marks every human teammate", () => {
    const { game } = teamGame();
    joinRed(game, 2).spawnAt(1, 1, game);
    joinRed(game, 3).spawnAt(2, 2, game);

    expect(readTeammates(game, false).map((mate) => mate.id)).toEqual([
      "p2",
      "p3",
    ]);
  });
});

describe("Nation teammates", () => {
  it("are left out, as the game's own spawn pulse leaves them out", () => {
    const { game } = teamGame();
    joinRed(game, 2, "NATION").spawnAt(1, 1, game);

    expect(readTeammates(game, false)).toEqual([]);
  });

  it("are marked when the player asks for them", () => {
    const { game } = teamGame();
    joinRed(game, 2, "NATION").spawnAt(1, 1, game);

    expect(readTeammates(game, true)).toHaveLength(1);
  });

  it("never include a Bot, even when asked for", () => {
    const { game } = teamGame();
    joinRed(game, 2, "BOT").spawnAt(1, 1, game);

    expect(readTeammates(game, true)).toEqual([]);
  });
});

describe("where a mark sits", () => {
  it("follows a spawn that is picked again", () => {
    const { game } = teamGame();
    const mate = joinRed(game, 2);
    mate.spawnAt(10, 10, game);
    readTeammates(game, false);

    mate.spawnAt(20, 30, game);

    expect(readTeammates(game, false)[0]).toMatchObject({ x: 20, y: 30 });
  });
});
