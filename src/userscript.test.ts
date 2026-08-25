import { describe, expect, it } from "vitest";
import { INCLUDE, MATCH, USERSCRIPT } from "./userscript";

/** Splits a match pattern into its scheme, host and path. */
function hostOf(pattern: string): string {
  return pattern.replace(/^[a-z*]+:\/\//, "").split("/")[0]!;
}

describe("where the script says it runs", () => {
  it("never puts a port in a match pattern", () => {
    // A Chrome match pattern cannot carry a port. One that does never matches,
    // and the userscript manager gives no warning: the script simply never
    // runs. Ports belong in `include`.
    const withPort = MATCH.filter((pattern) => /:\d+$/.test(hostOf(pattern)));

    expect(withPort).toEqual([]);
  });

  it("reaches the public game", () => {
    expect(MATCH).toContain("https://openfront.io/*");
  });

  it("reaches a local copy of the game, port and all", () => {
    expect(INCLUDE.some((pattern) => pattern.includes(":9000"))).toBe(true);
  });

  it("asks for no grants, so the script keeps the page's own window", () => {
    expect(USERSCRIPT.grant).toBe("none");
  });

  it("checks for updates against the small metadata file, not the whole script", () => {
    expect(USERSCRIPT.updateURL).toMatch(/\.meta\.js$/);
    expect(USERSCRIPT.downloadURL).toMatch(/\.user\.js$/);
  });
});
