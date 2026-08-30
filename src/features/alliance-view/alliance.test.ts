import { describe, expect, it, vi } from "vitest";
import { FakeGameView, FakePlayerView } from "../../test/fakes";
import { formatClock, readWeb } from "./alliance";

function match(): {
  game: FakeGameView;
  add: (smallID: number) => FakePlayerView;
} {
  const game = new FakeGameView();
  return {
    game,
    add: (smallID) => game.add(new FakePlayerView(smallID)),
  };
}

describe("the web the map is drawn around", () => {
  it("reads nothing when the cursor has found nobody", () => {
    const { game } = match();

    expect(readWeb(game, 0)).toBeNull();
  });

  it("reads nothing for an id the match does not know", () => {
    const { game, add } = match();
    add(1);

    expect(readWeb(game, 42)).toBeNull();
  });

  /** Every unclaimed tile belongs to TerraNullius, which is not a player. */
  it("reads nothing for a subject that is not a player", () => {
    const { game, add } = match();
    const terra = add(1);
    terra.player = false;

    expect(readWeb(game, 1)).toBeNull();
  });

  it("colours a subject with no alliances, and nobody else", () => {
    const { game, add } = match();
    add(1);
    add(2);

    const web = readWeb(game, 1);

    expect(web?.allies).toEqual([]);
    expect([...web!.coloured]).toEqual([1]);
  });

  it("colours the subject and every player allied with them", () => {
    const { game, add } = match();
    const subject = add(1);
    const ally = add(2);
    add(3);
    subject.allyWith(ally, 2000);

    const web = readWeb(game, 1);

    expect([...web!.coloured].sort()).toEqual([1, 2]);
  });

  /**
   * An alliance joins two players, and the question at the cursor is who comes
   * to this player's aid. A second ring does not answer that. See issue #13.
   */
  it("stops at one ring, so an ally's own allies get nothing", () => {
    const { game, add } = match();
    const subject = add(1);
    const ally = add(2);
    const far = add(3);
    subject.allyWith(ally, 2000);
    ally.allyWith(far, 2000);

    const web = readWeb(game, 1);

    expect([...web!.coloured].sort()).toEqual([1, 2]);
  });
});

describe("how long each alliance has left", () => {
  it("counts the ticks from now to the end of the alliance", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 2000);
    game.tickCount = 500;

    expect(readWeb(game, 1)?.allies[0]?.remainingTicks).toBe(1500);
  });

  it("reads an alliance the tick has already passed as over", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 100);
    game.tickCount = 500;

    expect(readWeb(game, 1)?.allies[0]?.remainingTicks).toBe(0);
  });

  /**
   * Inside this window the game offers to renew an alliance, so a red clock
   * means the game offers to renew that one now.
   */
  it("marks an alliance urgent once the game offers to renew it", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 300);
    subject.allyWith(add(3), 302);
    game.tickCount = 1;

    const allies = readWeb(game, 1)!.allies;

    expect(allies.find((a) => a.smallID === 2)?.urgent).toBe(true);
    expect(allies.find((a) => a.smallID === 3)?.urgent).toBe(false);
  });

  it("takes the renewal window from the match rather than a number of its own", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 600);
    game.settings.extensionOffset = 900;
    game.tickCount = 1;

    expect(readWeb(game, 1)?.allies[0]?.urgent).toBe(true);
  });

  /** An ally the game reports no alliance row for is still an ally. */
  it("colours an ally with no alliance row, and gives them no clock", () => {
    const { game, add } = match();
    const subject = add(1);
    const ally = add(2);
    subject.allyList.push(ally);

    const web = readWeb(game, 1);

    expect([...web!.coloured].sort()).toEqual([1, 2]);
    expect(web?.allies[0]?.remainingTicks).toBeNull();
  });
});

describe("what the web does when the game answers badly", () => {
  it("colours the subject alone when the ally list throws", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allies = () => {
      throw new Error("an ally the view cannot resolve");
    };

    const web = readWeb(game, 1);

    expect([...web!.coloured]).toEqual([1]);
    expect(web?.allies).toEqual([]);
  });

  it("keeps every ally coloured when the alliance list throws", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 2000);
    subject.alliances = () => {
      throw new Error("no alliances on this view");
    };

    const web = readWeb(game, 1);

    expect([...web!.coloured].sort()).toEqual([1, 2]);
    expect(web?.allies[0]?.remainingTicks).toBeNull();
  });

  it("keeps every clock when the renewal window cannot be read", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 2000);
    game.settings.allianceExtensionPromptOffset = () => {
      throw new Error("no such rule in this match");
    };
    game.tickCount = 1;

    expect(readWeb(game, 1)?.allies[0]?.remainingTicks).toBe(1999);
  });

  /** A player allied with themselves would be greyed and coloured at once. */
  it("never counts the subject as their own ally", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyList.push(subject);

    expect(readWeb(game, 1)?.allies).toEqual([]);
  });

  it("counts an ally listed twice only once", () => {
    const { game, add } = match();
    const subject = add(1);
    const ally = add(2);
    subject.allyList.push(ally, ally);

    expect(readWeb(game, 1)?.allies).toHaveLength(1);
  });

  it("skips an ally whose own view throws", () => {
    const { game, add } = match();
    const subject = add(1);
    const broken = add(2);
    const ally = add(3);
    broken.smallID = () => {
      throw new Error("this view is half built");
    };
    subject.allyList.push(broken, ally);

    expect(readWeb(game, 1)?.allies.map((a) => a.smallID)).toEqual([3]);
  });
});

describe("the clock a player reads", () => {
  it("prints minutes and seconds, the way the game prints them", () => {
    expect(formatClock(1500)).toBe("2:30");
  });

  it("pads the seconds so the clock does not jump about", () => {
    expect(formatClock(650)).toBe("1:05");
  });

  it("prints an alliance that is over as zero", () => {
    expect(formatClock(0)).toBe("0:00");
  });

  /**
   * The game divides ticks by a fixed ten, and a singleplayer speed setting
   * moves the real tick rate. Two clocks that disagree read as a bug, so this
   * copies the game and does not correct it. See issue #13.
   */
  it("divides by the same fixed ten the game divides by", () => {
    expect(formatClock(3000)).toBe("5:00");
  });
});

describe("what the web costs to read", () => {
  it("asks the game for a player once per player in the web", () => {
    const { game, add } = match();
    const subject = add(1);
    subject.allyWith(add(2), 2000);
    const lookup = vi.spyOn(game, "playerBySmallID");

    readWeb(game, 1);

    expect(lookup).toHaveBeenCalledTimes(1);
  });
});
