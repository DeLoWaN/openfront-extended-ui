import { describe, expect, it } from "vitest";
import { CUED_ICONS, findIconItem, findHotbars, readCost } from "./hotbar";
import { createFakeHotbar, setHotbarPrices } from "../../test/fakes";

describe("where the game draws its hotbar", () => {
  it("finds the hotbar in the page", () => {
    const hotbar = createFakeHotbar();

    expect(findHotbars()).toEqual([hotbar]);
  });

  it("finds nothing before the game has drawn one", () => {
    expect(findHotbars()).toEqual([]);
  });

  // The hotbar draws nothing during the spawn phase, after you die, and in a
  // replay. The element stays in the page with nothing inside it.
  it("finds the element the game has emptied, so the next tick can try again", () => {
    const hotbar = createFakeHotbar();
    hotbar.replaceChildren();

    expect(findHotbars()).toEqual([hotbar]);
  });
});

describe("one icon of the hotbar", () => {
  it("finds the item each of the three icons sits in", () => {
    const hotbar = createFakeHotbar();

    for (const cued of CUED_ICONS) {
      const item = findIconItem(hotbar, cued.icon);
      expect(item?.querySelector("img")?.alt).toBe(cued.icon);
    }
  });

  /**
   * The cue draws its light over the box and its marks under it, both placed
   * against the item. An item the game stops positioning would scatter them
   * across the page, so an unpositioned one is read as no item at all.
   */
  it("reads an item the game no longer positions as no item", () => {
    const hotbar = createFakeHotbar();
    const item = findIconItem(hotbar, "city")!;
    item.classList.remove("relative");

    expect(findIconItem(hotbar, "city")).toBeNull();
  });

  it("finds nothing for an icon the game does not draw", () => {
    const hotbar = createFakeHotbar();

    expect(findIconItem(hotbar, "railroad")).toBeNull();
  });

  it("names the city, the factory and the port, and nothing else", () => {
    expect(CUED_ICONS.map((cued) => cued.type)).toEqual([
      "City",
      "Factory",
      "Port",
    ]);
  });
});

describe("the price of one hotbar item", () => {
  it("reads the price the game worked out", () => {
    const hotbar = createFakeHotbar();
    setHotbarPrices(hotbar, { City: 250_000n, Port: 125_000n });

    expect(readCost(hotbar.asUnitDisplay(), "City")).toBe(250_000n);
    expect(readCost(hotbar.asUnitDisplay(), "Port")).toBe(125_000n);
  });

  // The game asks its simulation worker for the prices and writes them when
  // the answer arrives, so the first ticks of a match carry none.
  it("reads nothing before the first prices arrive", () => {
    const hotbar = createFakeHotbar();

    expect(readCost(hotbar.asUnitDisplay(), "City")).toBeNull();
  });

  it("reads nothing for an item the game did not price", () => {
    const hotbar = createFakeHotbar();
    setHotbarPrices(hotbar, { Port: 125_000n });

    expect(readCost(hotbar.asUnitDisplay(), "City")).toBeNull();
  });

  it("reads nothing for a price that is not gold", () => {
    const hotbar = createFakeHotbar();
    hotbar.playerBuildables = [
      { type: "City", cost: 125_000 as unknown as bigint },
    ];

    expect(readCost(hotbar.asUnitDisplay(), "City")).toBeNull();
  });
});
