# openfront-extended-ui

A **userscript**, meaning a browser script run by an extension such as Tampermonkey, that adds readouts to the [OpenFront.io](https://openfront.io) game view. It changes nothing in the game. It runs beside it and reformats numbers the game already shows somewhere.

The **HUD** is the always-visible panel at the bottom of the game showing troops, gold and the attack slider. That is where most of what this package draws ends up.

The vocabulary this project uses is in [CONTEXT.md](CONTEXT.md). The decisions behind the code are in [docs/adr/](docs/adr/).

## What works today

The package skeleton, and one throwaway marker that proves it. The marker is a small badge above the troop bar showing the game's tick count. It is deleted when the troop bar readout is built.

The six real features are still to come. They are listed on [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1).

## Install

Install a userscript manager, then open the built file. Tampermonkey offers to install it.

```
https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist/openfront-extended-ui.user.js
```

The script runs on `openfront.io` and on a local copy of the game at `localhost:9000`.

### Chrome needs one setting turned on

Open `chrome://extensions`, find Tampermonkey, and turn on **Allow user scripts**. Older versions of Chrome have a **Developer mode** switch at the top of that page instead.

Chrome does not let an extension run a script in the page's own world until this is on. The package needs the page's world, because it reads the game's own objects. Without the setting the script still installs, still reports itself as enabled, and does nothing at all, with no error anywhere. So if nothing appears in a match, check this first.

Firefox needs nothing of the sort.

## Switch a feature off

There is no settings screen yet. Its shape depends on how many options the readouts turn out to have, so it cannot be designed until they exist. Until then, the browser console is the way in.

```js
openfrontExtendedUi.list()                  // every feature, and whether it is on
openfrontExtendedUi.disable('tick-marker')  // off now, and in later matches
openfrontExtendedUi.enable('tick-marker')
openfrontExtendedUi.stop()                  // undo everything on this page
```

Choices are kept in the browser's `localStorage` and survive a reload. Switching a feature off takes it off the screen at once, without waiting for the next match.

## Develop

```bash
npm install
```

| Command | What it does |
| --- | --- |
| `npm test` | Runs the test suite once |
| `npm run test:watch` | Re-runs tests as files change |
| `npm run typecheck` | Checks types without emitting anything |
| `npm run build` | Writes `dist/openfront-extended-ui.user.js` |
| `npm run dev` | Serves the script so a userscript manager can load it live |

`dist/` is committed on purpose. The install address above is a link to a raw file on GitHub, so that file has to exist in the repository.

### Trying it in a real match

Clone [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) and run `npm ci && npm run dev` in it. That serves the game on `localhost:9000`, which this script already matches.

Nothing here is finished until someone has seen it in a live match. The package reads the game's own markup and the game's own objects, and the game promises neither.

## How it is put together

```
src/
  main.ts              the userscript entry point
  game/                the parts of the game the package reads
  runtime/             everything a feature needs to live inside
  features/            the features themselves, one folder each
  styles/package.css   the package's own stylesheet
```

A **feature** is any one of the six things the package adds. `src/runtime/feature.ts` holds the whole contract:

```ts
export interface Feature {
  readonly id: FeatureId;
  readonly name: string;
  attach(context: FeatureContext): FeatureSession | void;
}
```

A feature is handed a `FeatureContext` when a match starts. It returns what to do for the rest of that match, or nothing when it has no per-tick work.

Two rules shape everything else.

**A feature takes nothing from the page directly.** It listens on the game's event bus through the context, and it registers its cleanup through the context. The runtime undoes all of it when the match ends or the feature is switched off. The reason is that the game's event bus is shared by the whole page, it never forgets a listener, and it removes one only when handed the same function object it was given. A feature that cleaned up by hand would eventually forget, and the leak would last as long as the browser tab.

**Nothing a feature does runs outside a `try`/`catch`.** The runtime wraps `attach`, the session's `tick`, every cleanup, and every game event handler the context registers. Two of those need it badly. Per-tick work runs inside the game's own controller loop, which has no `try`/`catch` of its own, and an error escaping from there skips every controller after `control-panel` and breaks the game's own HUD. The game's event bus has none either, so an error escaping a listener reaches the game code that sent the event and the listeners queued behind it never run.

### Following the game from match to match

The `<control-panel>` element is written into the game's static HTML. It lives for the whole page and is never rebuilt. Each new match assigns a fresh object to its `.game` property, so that object's identity is the only thing that tells two matches apart. Its `.eventBus` property is the same object for every match and can never be used for this.

So the runtime watches `.game` for a change of identity, every 500 ms. Two of the game's exits never change it: a departure from the page, and a return to the lobby with no reload. Each of those gets its own signal, `pagehide` and `leave-lobby`.

The game offers no signal that means "this match is over". A win does not end anything, because the game keeps running so the player can spectate. So a feature that should stop when the player stops playing asks `isMatchLive`, which is false during the spawn phase, before the first update, throughout a replay, and after the player dies. A player who wins and then spectates is still live by that test, and features keep drawing for them, exactly as the game's own HUD does.

The reasoning behind all of that, and the failure modes it has to survive, is on [issue #4](https://github.com/DeLoWaN/openfront-extended-ui/issues/4).
