# The script takes no userscript grants, so settings live in localStorage

A userscript declares which extra powers it wants in a line of its metadata block called `@grant`. Tampermonkey offers a storage pair, `GM_setValue` and `GM_getValue`, that keeps a script's settings apart from the page. That looked like the natural place to remember which readouts a player has switched off.

The package asks for no grants at all, and keeps its settings in the page's own `localStorage` instead.

The reason is what `@grant` does besides granting. With no grant, Tampermonkey runs the script directly in the page, so `window` is the page's own `window`. With any grant, it runs the script in a sandbox where `window` is a stand-in object, and page globals are reachable only through a separate `unsafeWindow`.

The whole package is built on reaching into the page. It reads `document.querySelector('control-panel').game`, and it replaces that element's `tick` method with one of its own. The alliance view mode needs the page global `window.__webglView`. Taking a grant would put a boundary between the package and every one of those, for the sake of one settings file.

## Consequences

Settings are kept per address. A player who tries the package on a local copy of the game and then on the live site gets two separate sets of choices. That is closer to right than wrong, because one is a test and the other is real play.

Clearing site data for the game clears the package's settings too.

The stored value is one JSON object of feature id to `true` or `false`, under the key `openfront-extended-ui:features`. Anything else found there is read as "nothing stored", so a value left by an older version can never switch a feature off by accident.

Everything that touches storage is behind `SettingsStore` in `src/runtime/settings.ts`, which is two methods. Moving to `GM_setValue` later means writing one more implementation of it, and adding the matching `@grant` lines.

Settled on [issue #7](https://github.com/DeLoWaN/openfront-extended-ui/issues/7).
