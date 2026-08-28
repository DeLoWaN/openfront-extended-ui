import { describe, expect, it } from "vitest";
import { createStyleSheet } from "./styles";

const CSS = ".ofx-test{color:red}";

function shadowRoot(): ShadowRoot {
  const host = document.createElement("div");
  document.body.append(host);
  return host.attachShadow({ mode: "open" });
}

describe("the package stylesheet", () => {
  it("puts the package's CSS into the page", () => {
    const sheet = createStyleSheet(CSS);

    sheet.injectInto(document);

    const style = document.head.querySelector("style[data-openfront-extended-ui]");
    expect(style?.textContent).toBe(CSS);
  });

  it("adds nothing the second time it is put into the same root", () => {
    const sheet = createStyleSheet(CSS);

    sheet.injectInto(document);
    sheet.injectInto(document);

    expect(
      document.head.querySelectorAll("style[data-openfront-extended-ui]"),
    ).toHaveLength(1);
  });

  it("goes into a shadow root, where the game's own classes never reach", () => {
    const root = shadowRoot();
    const sheet = createStyleSheet(CSS);

    sheet.injectInto(root);

    expect(root.querySelector("style")?.textContent).toBe(CSS);
  });

  it("comes out of every root it went into", () => {
    const root = shadowRoot();
    const sheet = createStyleSheet(CSS);
    sheet.injectInto(document);
    sheet.injectInto(root);

    sheet.remove();

    expect(
      document.head.querySelectorAll("style[data-openfront-extended-ui]"),
    ).toHaveLength(0);
    expect(root.querySelectorAll("style")).toHaveLength(0);
  });

  it("can be put back after being removed", () => {
    const sheet = createStyleSheet(CSS);
    sheet.injectInto(document);
    sheet.remove();

    sheet.injectInto(document);

    expect(
      document.head.querySelectorAll("style[data-openfront-extended-ui]"),
    ).toHaveLength(1);
  });
});
