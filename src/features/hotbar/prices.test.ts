import { describe, expect, it } from "vitest";
import { PRICE_CAP, STEP_COUNT, priceStep } from "./prices";

describe("the price step of a city, a port or a factory", () => {
  it("reads one for the first price", () => {
    expect(priceStep(125_000n)).toBe(1);
  });

  it("reads two for the second price", () => {
    expect(priceStep(250_000n)).toBe(2);
  });

  it("reads three for the third price", () => {
    expect(priceStep(500_000n)).toBe(3);
  });

  // The game caps the price at one million, so the fourth price never moves
  // again. There is no step to draw, and nothing to tell a player.
  it("reads nothing once the price reaches the cap", () => {
    expect(priceStep(PRICE_CAP)).toBeNull();
  });

  it("reads nothing above the cap", () => {
    expect(priceStep(5_000_000n)).toBeNull();
  });

  // A lobby can give a player infinite gold, and the game then prices every
  // unit at nothing. There is no cheap window to mark in such a match.
  it("reads nothing for a free unit", () => {
    expect(priceStep(0n)).toBeNull();
  });

  it("reads nothing for a price that is not one of the three", () => {
    expect(priceStep(180_000n)).toBeNull();
    expect(priceStep(124_999n)).toBeNull();
  });

  it("counts three steps, which is what the marks draw", () => {
    expect(STEP_COUNT).toBe(3);
    expect(priceStep(PRICE_CAP / 2n)).toBe(STEP_COUNT);
  });
});
