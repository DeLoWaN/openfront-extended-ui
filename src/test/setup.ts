import { beforeEach } from "vitest";

// jsdom keeps one document for a whole test file, so anything a test puts into
// the page is still there for the next one.
beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});
