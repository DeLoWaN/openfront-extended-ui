import { afterEach, describe, expect, it, vi } from "vitest";
import { onSpotlight, setSpotlight, spotlightedPlayer } from "./spotlight";

afterEach(() => setSpotlight(null));

describe("the player shown on their own", () => {
  it("is nobody until a feature asks", () => {
    expect(spotlightedPlayer()).toBeNull();
  });

  it("holds the player a feature set, and forgets them when it clears", () => {
    setSpotlight(4);
    expect(spotlightedPlayer()).toBe(4);

    setSpotlight(null);
    expect(spotlightedPlayer()).toBeNull();
  });

  it("tells a listener about each change and not about a repeat", () => {
    const listener = vi.fn();
    const stop = onSpotlight(listener);

    setSpotlight(4);
    setSpotlight(4);
    setSpotlight(7);
    setSpotlight(null);

    expect(listener).toHaveBeenCalledTimes(3);
    stop();
  });

  it("stops telling a listener once it asked to stop", () => {
    const listener = vi.fn();
    const stop = onSpotlight(listener);
    stop();

    setSpotlight(4);

    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps telling the others when one listener throws", () => {
    const after = vi.fn();
    const stopFirst = onSpotlight(() => {
      throw new Error("broken listener");
    });
    const stopSecond = onSpotlight(after);

    expect(() => setSpotlight(4)).not.toThrow();

    expect(after).toHaveBeenCalledTimes(1);
    stopFirst();
    stopSecond();
  });
});
