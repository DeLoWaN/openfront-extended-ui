import { describe, expect, it } from "vitest";
import {
  PLATEAU,
  PLATEAU_SHARE,
  shareOfBestRate,
  troopLevelOfPeakRate,
} from "./regeneration";

/**
 * The figures asserted here come from ADR-0004 and issue #21. A change that
 * moves one of them changes what the readout draws, so each is pinned.
 */

describe("share of best rate", () => {
  it("reads 1 at the troop level where regeneration peaks", () => {
    expect(shareOfBestRate(troopLevelOfPeakRate())).toBeCloseTo(1, 6);
  });

  it("reads 0 at a full army, where regeneration stops", () => {
    expect(shareOfBestRate(1)).toBe(0);
  });

  it("reads the shares ADR-0004 records past the plateau", () => {
    expect(shareOfBestRate(0.8) * 100).toBeCloseTo(55.1, 1);
    expect(shareOfBestRate(0.9) * 100).toBeCloseTo(30.0, 1);
  });

  it("rises to the peak and falls away from it", () => {
    const peak = troopLevelOfPeakRate();
    expect(shareOfBestRate(peak - 0.2)).toBeLessThan(shareOfBestRate(peak - 0.1));
    expect(shareOfBestRate(peak - 0.1)).toBeLessThan(shareOfBestRate(peak));
    expect(shareOfBestRate(peak)).toBeGreaterThan(shareOfBestRate(peak + 0.1));
    expect(shareOfBestRate(peak + 0.1)).toBeGreaterThan(shareOfBestRate(peak + 0.2));
  });

  it("costs more to sit below the plateau than above it, which is why the drawing is not symmetric", () => {
    const peak = troopLevelOfPeakRate();
    expect(shareOfBestRate(peak - 0.3)).toBeLessThan(shareOfBestRate(peak + 0.3));
  });

  // A troop level outside 0 to 1 means the game drew a fill the package cannot
  // read. Reporting a share above the best possible rate would be a lie.
  it("clamps a troop level from outside the bar", () => {
    expect(shareOfBestRate(-0.5)).toBe(shareOfBestRate(0));
    expect(shareOfBestRate(1.5)).toBe(shareOfBestRate(1));
  });
});

describe("the plateau", () => {
  it("covers 30.6% to 54.3% full", () => {
    expect(PLATEAU.lo * 100).toBeCloseTo(30.56, 1);
    expect(PLATEAU.hi * 100).toBeCloseTo(54.29, 1);
  });

  it("is the levels reaching 95% of the best rate, which is what its edges mean", () => {
    expect(PLATEAU_SHARE).toBe(0.95);
    expect(shareOfBestRate(PLATEAU.lo)).toBeCloseTo(PLATEAU_SHARE, 4);
    expect(shareOfBestRate(PLATEAU.hi)).toBeCloseTo(PLATEAU_SHARE, 4);
  });

  it("holds every level inside it above that share, and none outside it", () => {
    expect(shareOfBestRate(PLATEAU.lo + 0.01)).toBeGreaterThan(PLATEAU_SHARE);
    expect(shareOfBestRate(PLATEAU.hi - 0.01)).toBeGreaterThan(PLATEAU_SHARE);
    expect(shareOfBestRate(PLATEAU.lo - 0.01)).toBeLessThan(PLATEAU_SHARE);
    expect(shareOfBestRate(PLATEAU.hi + 0.01)).toBeLessThan(PLATEAU_SHARE);
  });

  /**
   * ADR-0004 draws no mark at 42.2% because the plateau's own midpoint reads as
   * the peak. That argument holds only while the two agree.
   */
  it("has a midpoint within 0.55 of a point of the peak, so no mark is needed", () => {
    const midpoint = (PLATEAU.lo + PLATEAU.hi) / 2;
    expect(Math.abs(midpoint - troopLevelOfPeakRate()) * 100).toBeLessThan(0.55);
  });

  it("covers about a quarter of the bar", () => {
    expect((PLATEAU.hi - PLATEAU.lo) * 100).toBeCloseTo(23.7, 1);
  });
});
