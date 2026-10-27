import { beforeEach, describe, expect, it } from "vitest";
import { FakeGameView, FakePlayerView } from "../../test/fakes";
import { EXPIRED_STAYS_TICKS, createAlliancePanelRows } from "./rows";

/** Ticks at the default speed: one second is ten. */
const SECOND = 10;

interface Match {
  game: FakeGameView;
  me: FakePlayerView;
  ana: FakePlayerView;
  ben: FakePlayerView;
  cleo: FakePlayerView;
  panel: ReturnType<typeof createAlliancePanelRows>;
  /** Moves the clock, reports news for that one tick and reads the rows. */
  step: (tick: number, news?: Record<number, unknown[]>) => ReturnType<Match["panel"]["rows"]>;
}

function setup(): Match {
  const game = new FakeGameView();
  const me = game.player!;
  me.name = "Me";
  const ana = game.add(new FakePlayerView(2));
  ana.name = "Ana";
  const ben = game.add(new FakePlayerView(3));
  ben.name = "Ben";
  const cleo = game.add(new FakePlayerView(4));
  cleo.name = "Cleo";
  game.add(me);
  game.tickCount = 1000;

  const panel = createAlliancePanelRows(game);
  return {
    game,
    me,
    ana,
    ben,
    cleo,
    panel,
    step(tick, news = {}) {
      game.tickCount = tick;
      game.updates = news;
      panel.observe(me);
      return panel.rows(me);
    },
  };
}

const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe("the alliances the panel lists", () => {
  let match: Match;
  beforeEach(() => {
    match = setup();
  });

  it("is empty when you have no alliance", () => {
    expect(match.step(1000)).toEqual([]);
  });

  it("lists each alliance with its clock, the most time left on top", () => {
    match.me.allyWith(match.ana, 1000 + 127 * SECOND);
    match.me.allyWith(match.ben, 1000 + 301 * SECOND);

    const rows = match.step(1000);

    expect(rows.map((row) => [row.name, row.clock, row.kind])).toEqual([
      ["Ben", "5:01", "alliance"],
      ["Ana", "2:07", "alliance"],
    ]);
  });

  it("moves a row down as time passes, past a row that now has more", () => {
    const ana = match.me.allyWith(match.ana, 1000 + 100 * SECOND);
    match.me.allyWith(match.ben, 1000 + 200 * SECOND);
    expect(names(match.step(1000))).toEqual(["Ben", "Ana"]);

    match.me.renew(ana, 1000 + 400 * SECOND);

    expect(names(match.step(1010))).toEqual(["Ana", "Ben"]);
  });

  it("ends the list with the alliance nearest its end", () => {
    match.me.allyWith(match.ana, 1000 + 20 * SECOND);
    match.me.allyWith(match.ben, 1000 + 250 * SECOND);
    match.me.allyWith(match.cleo, 1000 + 90 * SECOND);

    expect(names(match.step(1000))).toEqual(["Ben", "Cleo", "Ana"]);
  });

  it("never lists a teammate, who has no alliance with you", () => {
    match.me.teamName = "red";
    match.ana.teamName = "red";

    expect(match.step(1000)).toEqual([]);
  });

  it("drops an alliance whose partner is dead or unknown to the game", () => {
    match.me.allyWith(match.ana, 2000);
    match.me.allyWith(match.ben, 2000);
    match.ana.alive = false;
    match.me.allianceList.push({ id: 99, other: "nobody", expiresAt: 2000 });

    expect(names(match.step(1000))).toEqual(["Ben"]);
  });

  it("holds the clock at zero for an alliance that is past its end", () => {
    match.me.allyWith(match.ana, 990);

    expect(match.step(1000)[0]!).toMatchObject({ clock: "0:00", urgent: true });
  });
});

describe("how much of its time an alliance has left", () => {
  it("is the share of the alliance's whole run that is left", () => {
    const match = setup();
    match.me.allyWith(match.ana, 1000 + 3000);
    match.me.allyWith(match.ben, 1000 + 750);
    match.me.allyWith(match.cleo, 1000 + 0);

    const rows = match.step(1000);

    expect(rows.map((row) => [row.name, row.fraction])).toEqual([
      ["Ana", 1],
      ["Ben", 0.25],
      ["Cleo", 0],
    ]);
  });

  it("follows the alliance length the match reports", () => {
    const match = setup();
    match.game.settings.allianceTicks = 600;
    match.me.allyWith(match.ana, 1000 + 150);

    expect(match.step(1000)[0]!.fraction).toBe(0.25);
  });

  it("is the share of the twenty seconds left for a request", () => {
    const match = setup();

    const rows = match.step(1050, {
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
    });

    expect(rows[0]!.fraction).toBe(0.75);
  });

  it("never leaves the range of a bar", () => {
    const match = setup();
    match.me.allyWith(match.ana, 1000 + 9000);

    expect(match.step(1000)[0]!.fraction).toBe(1);
  });

  it("reads as full when the match cannot report the length", () => {
    const match = setup();
    match.game.settings.allianceTicks = 0;
    match.me.allyWith(match.ana, 1100);

    expect(match.step(1000)[0]!.fraction).toBe(1);
  });
});

describe("the red clock", () => {
  it("turns red on the game's own renewal window and not before", () => {
    const match = setup();
    match.me.allyWith(match.ana, 2000);

    // The window is 300 ticks: thirty seconds.
    expect(match.step(1699)[0]!.urgent).toBe(false);
    expect(match.step(1700)[0]!.urgent).toBe(true);
  });

  it("follows the window the match reports rather than a fixed 30 seconds", () => {
    const match = setup();
    match.game.settings.extensionOffset = 100;
    match.me.allyWith(match.ana, 2000);

    expect(match.step(1800)[0]!.urgent).toBe(false);
    expect(match.step(1900)[0]!.urgent).toBe(true);
  });

  it("goes white once you agreed, because the game stops offering it", () => {
    const match = setup();
    const id = match.me.allyWith(match.ana, 2000);
    expect(match.step(1750)[0]!.urgent).toBe(true);

    const rows = match.step(1760, { 9: [{ playerID: 1, allianceID: id }] });

    expect(rows[0]!.urgent).toBe(false);
    expect(match.step(1900)[0]!.urgent).toBe(false);
  });

  it("stays red when the partner agreed and you did not", () => {
    const match = setup();
    const id = match.me.allyWith(match.ana, 2000);

    const rows = match.step(1760, { 9: [{ playerID: 2, allianceID: id }] });

    expect(rows[0]!.urgent).toBe(true);
  });

  it("starts the next window clean after a renewal", () => {
    const match = setup();
    const id = match.me.allyWith(match.ana, 2000);
    match.step(1760, { 9: [{ playerID: 1, allianceID: id }] });

    // The partner agrees too. The alliance runs on, and the game reports the
    // second agreement in the same tick the end tick moves.
    match.me.renew(id, 1770 + 3000);
    match.step(1770, { 9: [{ playerID: 2, allianceID: id }] });

    expect(match.step(1771)[0]!.urgent).toBe(false);
    expect(match.step(4500)[0]!.urgent).toBe(true);
  });

  it("does not take a renewal that completed in your own agreement tick as muted", () => {
    const match = setup();
    const id = match.me.allyWith(match.ana, 2000);

    // Your agreement is the last one, so the alliance already reads as new.
    match.me.renew(id, 1760 + 3000);
    match.step(1760, { 9: [{ playerID: 1, allianceID: id }] });

    expect(match.step(4700)[0]!.urgent).toBe(true);
  });
});

describe("the alliance requests aimed at you", () => {
  it("lists a request with the time left to answer it", () => {
    const match = setup();

    const rows = match.step(1000, {
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
    });

    expect(rows).toEqual([
      {
        key: "request:3",
        kind: "request",
        smallID: 3,
        name: "Ben",
        clock: "0:20",
        urgent: false,
        fraction: 1,
      },
    ]);
    expect(match.step(1100)[0]!.clock).toBe("0:10");
  });

  it("ignores a request aimed at somebody else", () => {
    const match = setup();

    const rows = match.step(1000, {
      5: [{ requestorID: 3, recipientID: 2, createdAt: 1000 }],
    });

    expect(rows).toEqual([]);
  });

  it("drops the request when its twenty seconds are up", () => {
    const match = setup();
    match.step(1000, { 5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }] });

    expect(match.step(1199)).toHaveLength(1);
    expect(match.step(1200)).toEqual([]);
  });

  it("drops the request when it is answered", () => {
    const match = setup();
    const request = { requestorID: 3, recipientID: 1, createdAt: 1000 };
    match.step(1000, { 5: [request] });

    const rows = match.step(1010, { 6: [{ request, accepted: true }] });

    expect(rows).toEqual([]);
  });

  it("drops the request when the requestor dies", () => {
    const match = setup();
    match.step(1000, { 5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }] });
    match.ben.alive = false;

    expect(match.step(1010)).toEqual([]);
  });

  it("drops the request once that player is your partner", () => {
    const match = setup();
    match.step(1000, { 5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }] });
    match.me.allyWith(match.ben, 4000);

    expect(match.step(1010).map((row) => row.kind)).toEqual(["alliance"]);
  });

  it("sorts a request among the alliances by its own time left", () => {
    const match = setup();
    match.me.allyWith(match.ana, 1000 + 900);
    match.me.allyWith(match.cleo, 1000 + 120);

    const rows = match.step(1000, {
      5: [{ requestorID: 3, recipientID: 1, createdAt: 1000 }],
    });

    // 90 s, then the request at 20 s, then the alliance at 12 s.
    expect(rows.map((row) => `${row.kind}:${row.name}`)).toEqual([
      "alliance:Ana",
      "request:Ben",
      "alliance:Cleo",
    ]);
  });
});

describe("the alliances that just ran out", () => {
  const expiry = { 8: [{ player1ID: 1, player2ID: 2 }] };

  it("keeps an expired alliance, counting up from its end", () => {
    const match = setup();
    match.me.allyWith(match.ana, 1000);
    match.step(999);
    match.me.allianceList = [];

    const rows = match.step(1000, expiry);

    expect(rows).toEqual([
      {
        key: "expired:2",
        kind: "expired",
        smallID: 2,
        name: "Ana",
        clock: "0:00",
        urgent: false,
        fraction: 0,
      },
    ]);
    expect(match.step(1070)[0]!.clock).toBe("0:07");
  });

  it("reads the expiry whichever side of it you are on", () => {
    const match = setup();

    const rows = match.step(1000, { 8: [{ player1ID: 3, player2ID: 1 }] });

    expect(names(rows)).toEqual(["Ben"]);
  });

  it("drops it after fifteen seconds", () => {
    const match = setup();
    match.step(1000, expiry);

    expect(match.step(1000 + EXPIRED_STAYS_TICKS - 1)).toHaveLength(1);
    expect(match.step(1000 + EXPIRED_STAYS_TICKS)).toEqual([]);
  });

  it("puts it below every live alliance, so the row you can save stays on top", () => {
    const match = setup();
    match.me.allyWith(match.ben, 1000 + 50);
    match.step(1000, expiry);

    const rows = match.step(1010);

    expect(rows.map((row) => `${row.kind}:${row.name}`)).toEqual([
      "alliance:Ben",
      "expired:Ana",
    ]);
  });

  it("puts the most recently ended on top among the finished rows", () => {
    const match = setup();
    match.step(1000, { 8: [{ player1ID: 1, player2ID: 2 }] });
    match.step(1050, { 8: [{ player1ID: 1, player2ID: 3 }] });

    expect(names(match.step(1060))).toEqual(["Ben", "Ana"]);
  });

  it("is not a row for an alliance somebody broke", () => {
    const match = setup();
    const id = match.me.allyWith(match.ana, 5000);
    match.step(1000);
    match.me.endAlliance(id);

    // The game sends a break as its own update, which the panel does not read.
    const rows = match.step(1010, {
      7: [{ traitorID: 2, betrayedID: 1, allianceID: id }],
    });

    expect(rows).toEqual([]);
  });

  it("ignores an expiry between two other players", () => {
    const match = setup();

    expect(match.step(1000, { 8: [{ player1ID: 2, player2ID: 3 }] })).toEqual([]);
  });

  it("ignores an expiry when the former partner is already dead", () => {
    const match = setup();
    match.ana.alive = false;

    expect(match.step(1000, expiry)).toEqual([]);
  });

  it("gives way to the live alliance when the two partners ally again", () => {
    const match = setup();
    match.step(1000, expiry);
    match.me.allyWith(match.ana, 4000);

    expect(match.step(1020).map((row) => row.kind)).toEqual(["alliance"]);
  });
});

describe("a half-built game", () => {
  it("skips the one player the game cannot answer for", () => {
    const match = setup();
    match.me.allyWith(match.ana, 3000);
    match.me.allyWith(match.ben, 3000);
    match.ana.displayName = () => {
      throw new Error("player view not built yet");
    };

    expect(names(match.step(1000))).toEqual(["Ben"]);
  });

  it("lists nothing when the alliances cannot be read at all", () => {
    const match = setup();
    match.me.alliances = () => {
      throw new Error("not ready");
    };

    expect(match.step(1000)).toEqual([]);
  });
});
