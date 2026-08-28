# The package is written in TypeScript and bundled into one userscript file

A **userscript** is a browser script run by an extension such as Tampermonkey. It installs as a single file, so the package has to ship as a single file whichever way it is written.

The choice was between writing that file by hand in plain JavaScript, and writing TypeScript that a bundler turns into it. The package takes the second: TypeScript, built by Vite with `vite-plugin-monkey`, which writes the userscript metadata block and emits `dist/openfront-extended-ui.user.js`.

Six features have to live in this file, and a plain one-file script gives nowhere to put the seams between them.

The game's own objects are untyped from outside. The package reads them through one small set of type declarations in `src/game/types.ts`, and that is the single place where a trap such as "internal troop counts are ten times the numbers on screen" can be written down once instead of being remembered six times.

The package cannot be judged without running it in a real match, so it gets re-installed often. `npm run dev` serves the script from a local address, which makes that loop short.

## Consequences

There is a build step. Nobody can read the installed file and change it.

`dist/` is committed, because the install address is a raw file link on GitHub and that link has to point at something. Every change to the source therefore also shows a rebuilt bundle in the diff.

`vite-plugin-monkey` also emits `dist/openfront-extended-ui.meta.js`, which holds the metadata block alone. The update address points at that small file, so a check for a new version does not download the whole script.

Settled on [issue #7](https://github.com/DeLoWaN/openfront-extended-ui/issues/7).
