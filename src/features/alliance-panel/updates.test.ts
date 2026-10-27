import { describe, expect, it } from "vitest";
import { FakeGameView } from "../../test/fakes";
import { readAllianceUpdates } from "./updates";

/**
 * The game's own updates, as one list per kind, keyed by a number.
 *
 * `numbers` says which number each kind sits at. The real enum puts
 * AllianceRequest at 5 at the commit this was written against, and these tests
 * move it to prove nothing reads the position.
 */
function report(
  game: FakeGameView,
  numbers: { request: number; reply: number; expired: number; extension: number },
) {
  const request = { requestorID: 4, recipientID: 1, createdAt: 12 };
  game.updates = {
    // Updates the panel does not read sit in lists of their own.
    0: [{ type: 0, tile: 99 }],
    2: [{ type: 2, id: "p1", smallID: 1 }],
    [numbers.request]: [request, { ...request, requestorID: 5 }],
    [numbers.reply]: [{ request, accepted: false }],
    [numbers.expired]: [{ player1ID: 1, player2ID: 2 }],
    [numbers.extension]: [{ playerID: 1, allianceID: 7 }],
    // A break names a traitor, which no field here matches.
    30: [{ traitorID: 3, betrayedID: 1, allianceID: 7 }],
  };
}

describe("reading the alliance news", () => {
  it("reads nothing before the game reports a tick", () => {
    const game = new FakeGameView();
    game.updates = null;

    expect(readAllianceUpdates(game)).toEqual({
      requests: [],
      replies: [],
      expired: [],
      extensions: [],
    });
  });

  it("reads the four kinds it needs, whatever number each one sits at", () => {
    const game = new FakeGameView();
    const layouts = [
      { request: 5, reply: 6, expired: 8, extension: 9 },
      // A member added ahead of them in the game's enum moves every number.
      { request: 21, reply: 22, expired: 24, extension: 25 },
    ];

    for (const numbers of layouts) {
      report(game, numbers);
      const news = readAllianceUpdates(game);

      expect(news.requests.map((request) => request.requestorID)).toEqual([4, 5]);
      expect(news.replies).toEqual([
        { requestorID: 4, recipientID: 1, createdAt: 12 },
      ]);
      expect(news.expired).toEqual([{ player1ID: 1, player2ID: 2 }]);
      expect(news.extensions).toEqual([{ playerID: 1, allianceID: 7 }]);
    }
  });

  it("does not read a broken alliance as news", () => {
    const game = new FakeGameView();
    game.updates = { 7: [{ traitorID: 3, betrayedID: 1, allianceID: 7 }] };

    const news = readAllianceUpdates(game);

    expect(news.expired).toEqual([]);
    expect(news.extensions).toEqual([]);
  });

  it("skips an empty list and a list of something that is not an object", () => {
    const game = new FakeGameView();
    game.updates = { 1: [], 2: undefined, 3: [42], 4: [null] };

    expect(readAllianceUpdates(game).requests).toEqual([]);
  });
});
