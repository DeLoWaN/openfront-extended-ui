# openfront-extended-ui

A **userscript**, meaning a browser script run by an extension such as Tampermonkey, that adds readouts to the [OpenFront.io](https://openfront.io) game view. It changes nothing in the game. It runs beside it and reformats numbers the game already shows somewhere.

The **HUD** is the always-visible panel at the bottom of the game showing troops, gold and the attack slider. That is where most of what this package draws ends up.

The vocabulary this project uses is in [CONTEXT.md](CONTEXT.md). The decisions behind the code are in [docs/adr/](docs/adr/).

## What works today

One readout, drawn on the game's own troop bar.

**Regeneration** is the troops the game gives you each tick for free. How fast they arrive depends on how full your army already is. The rate rises, peaks near 42% full, and falls to zero once your army is full. So a full army grows at nothing, and an army held near 42% grows fastest.

The readout adds two things inside the bar.

- A violet strip along the bar's bottom edge. It covers **the plateau**, meaning every troop level where regeneration stays within 5% of the best rate you could reach at any level. That runs from 30.6% to 54.3% full, about a quarter of the bar.
- Your **share of best rate** at the bar's far right, as a percentage. It reads 100% at the peak and 0% at a full army. The game shows this figure nowhere else.

Nothing marks the 42.2% level itself, and nothing changes colour when you cross it. The top of the curve is flat, so there is no cliff to draw. [ADR-0004](docs/adr/0004-the-optimal-troop-level-is-drawn-as-a-band.md) holds the reasoning and the numbers, and two drawings that were built and turned down first.

The other five features are still to come. They are listed on [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1).

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
openfrontExtendedUi.list()                 // every feature, its options, and what is on
openfrontExtendedUi.disable('troop-bar')   // off now, and in later matches
openfrontExtendedUi.enable('troop-bar')
openfrontExtendedUi.stop()                 // undo everything on this page
```

A feature can also offer choices of its own. The troop bar readout offers one, which drops the percentage and keeps the strip:

```js
openfrontExtendedUi.setOption('troop-bar', 'percentage', false)
```

`list()` shows the key of every option a feature offers. Choices are kept in the browser's `localStorage` and survive a reload. Switching a feature or an option off takes it off the screen at once, without waiting for the next match.

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
  readonly options?: readonly FeatureOption[];
  attach(context: FeatureContext): FeatureSession | void;
}
```

A feature is handed a `FeatureContext` when a match starts. It returns what to do for the rest of that match, or nothing when it has no per-tick work.

A feature declares any choice it offers beyond on and off, along with what that choice means before a player has picked. It reads the choice back through the context, where the choice is used rather than once at the start, so switching one takes effect on the next tick.

Two rules shape everything else.

**A feature takes nothing from the page directly.** It listens on the game's event bus through the context, and it registers its cleanup through the context. The runtime undoes all of it when the match ends or the feature is switched off. The reason is that the game's event bus is shared by the whole page, it never forgets a listener, and it removes one only when handed the same function object it was given. A feature that cleaned up by hand would eventually forget, and the leak would last as long as the browser tab.

**Nothing a feature does runs outside a `try`/`catch`.** The runtime wraps `attach`, the session's `tick`, every cleanup, and every game event handler the context registers. Two of those need it badly. Per-tick work runs inside the game's own controller loop, which has no `try`/`catch` of its own, and an error escaping from there skips every controller after `control-panel` and breaks the game's own HUD. The game's event bus has none either, so an error escaping a listener reaches the game code that sent the event and the listeners queued behind it never run.

### Following the game from match to match

The `<control-panel>` element is written into the game's static HTML. It lives for the whole page and is never rebuilt. Each new match assigns a fresh object to its `.game` property, so that object's identity is the only thing that tells two matches apart. Its `.eventBus` property is the same object for every match and can never be used for this.

So the runtime watches `.game` for a change of identity, every 500 ms. Two of the game's exits never change it: a departure from the page, and a return to the lobby with no reload. Each of those gets its own signal, `pagehide` and `leave-lobby`.

The game offers no signal that means "this match is over". A win does not end anything, because the game keeps running so the player can spectate. So a feature that should stop when the player stops playing asks `isMatchLive`, which is false during the spawn phase, before the first update, throughout a replay, and after the player dies. A player who wins and then spectates is still live by that test, and features keep drawing for them, exactly as the game's own HUD does.

The reasoning behind all of that, and the failure modes it has to survive, is on [issue #4](https://github.com/DeLoWaN/openfront-extended-ui/issues/4).
