/**
 * The userscript metadata block, which decides where the script runs.
 *
 * This lives apart from the Vite config so its rules can be tested. Nothing
 * here reaches the browser as code: the build turns it into the comment block
 * at the top of the built file.
 */

const REPO = "https://github.com/DeLoWaN/openfront-extended-ui";
const RAW = "https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist";

/**
 * Where the script runs on the public game.
 *
 * `@match` follows Chrome's match patterns, and a Chrome match pattern cannot
 * carry a port. A pattern with one never matches anything.
 */
export const MATCH = ["https://openfront.io/*", "https://*.openfront.io/*"];

/**
 * Where the script runs on a local copy of the game.
 *
 * A local copy answers on a port, so this cannot be a `@match`. `@include` is
 * the older Greasemonkey form, and it does allow a port.
 */
export const INCLUDE = ["http://localhost:9000/*"];

export const USERSCRIPT = {
  name: "OpenFront Extended UI",
  namespace: REPO,
  description:
    "Adds readouts and an alliance view mode to the OpenFront.io game view. Changes nothing in the game.",
  author: "DeLoWaN",
  license: "MIT",
  match: MATCH,
  include: INCLUDE,
  // No grant, so the script runs in the page's own context and reaches the
  // page's globals. See docs/adr/0007.
  grant: "none",
  "run-at": "document-idle",
  downloadURL: `${RAW}/openfront-extended-ui.user.js`,
  updateURL: `${RAW}/openfront-extended-ui.meta.js`,
} as const;
