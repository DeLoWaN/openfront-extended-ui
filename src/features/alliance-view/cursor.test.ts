import { describe, expect, it } from "vitest";
import { FakeGameView, FakeTransformHandler } from "../../test/fakes";
import { NOBODY, ownerUnderCursor } from "./cursor";

/** The camera doubles world tiles, so tile 3,4 sits at screen 6,8. */
function setup() {
  const game = new FakeGameView();
  const camera = new FakeTransformHandler();
  return { game, camera };
}

describe("who the cursor sits over", () => {
  it("reads the player owning the tile under the point", () => {
    const { game, camera } = setup();
    game.own(3, 4, 7);

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(7);
  });

  it("reads nobody over an unclaimed tile", () => {
    const { game, camera } = setup();

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(NOBODY);
  });

  it("reads nobody over water", () => {
    const { game, camera } = setup();
    game.own(3, 4, 7);
    game.makeWater(3, 4);

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(NOBODY);
  });

  it("reads nobody off the map", () => {
    const { game, camera } = setup();

    expect(ownerUnderCursor(game, camera, -20, -20)).toBe(NOBODY);
  });

  /**
   * A tile packs more than its owner into one number, so the rest has to be
   * masked off or every tile reads as a player nobody has heard of.
   */
  it("reads the owner out of the rest of the tile's state", () => {
    const { game, camera } = setup();
    game.own(3, 4, (5 << 12) | 7);

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(7);
  });

  it("reads nobody when the camera throws", () => {
    const { game, camera } = setup();
    camera.screenToWorldCoordinates = () => {
      throw new Error("the camera is between matches");
    };

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(NOBODY);
  });

  it("reads nobody when the match throws", () => {
    const { game, camera } = setup();
    game.tileState = () => {
      throw new Error("no tiles in this match yet");
    };

    expect(ownerUnderCursor(game, camera, 6, 8)).toBe(NOBODY);
  });
});
