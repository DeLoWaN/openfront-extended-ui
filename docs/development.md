# Development

This page is for people who change the userscript. Players need only the [README](../README.md).

The vocabulary this project uses is in [CONTEXT.md](../CONTEXT.md). The decisions behind the code are in [docs/adr/](adr/).

## Commands

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

`dist/` is committed on purpose. The install link in the README points at a raw file on GitHub, so that file has to exist in the repository.

## Trying it in a real match

Clone [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) and run `npm ci && npm run dev` in it. That serves the game on `localhost:9000`, which this script already matches.

Nothing here is finished until someone has seen it in a live match. The package reads the game's own markup and the game's own objects, and the game promises neither.

### Spawn markers in a solo game

The game marks the spawn of human teammates only. A solo game has one human, so it has no teammate to mark. To see teammates' markers in a solo team game, switch on the option that adds the Nation teammates. This option is a test aid, so the settings panel does not show it.

```js
openfrontExtendedUi.setOption('spawn-marks', 'nation-teammates', true)
```

Then start a solo game on the map World, with the mode Teams, the team size Quads and no Tribes, and do not click the map. A solo game has no spawn timer, so the spawn phase lasts until your first click.

## The browser console

The global `openfrontExtendedUi` object does what the settings panel does. It also reaches the options the panel does not show.

```js
openfrontExtendedUi.list()                 // every feature, its options, and what is on
openfrontExtendedUi.disable('troop-bar')   // off now, and in later matches
openfrontExtendedUi.enable('troop-bar')
openfrontExtendedUi.setOption('troop-bar', 'percentage', false)
openfrontExtendedUi.setOption('alliance-view', 'hold-key', 'KeyJ')
openfrontExtendedUi.stop()                 // undo everything on this page
```

A key option is written the way the browser names a key, for example `KeyJ` or `Backquote`. Choices are kept in the browser's `localStorage` and survive a reload.

## How it is put together

```
src/
  main.ts              the userscript entry point
  game/                the parts of the game the package reads
  runtime/             everything a feature needs to live inside
  features/            the features themselves, one folder each
  styles/package.css   the package's own stylesheet
```

A **feature** is any one of the things the package adds. `src/runtime/feature.ts` holds the whole contract:

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

**A feature takes nothing from the page directly.** It listens on the game's event bus through the context, it listens on the page's own window through the context, and it registers its cleanup through the context. The runtime undoes all of it when the match ends or the feature is switched off. The reason is that the game's event bus is shared by the whole page, it never forgets a listener, and it removes one only when handed the same function object it was given. A feature that cleaned up by hand would eventually forget, and the leak would last as long as the browser tab.

The features that draw on the map put a node of their own on the page, because the map is a single canvas with nothing to draw inside. [ADR-0005](adr/0005-the-map-draws-its-own-layer.md) says why the map is the only place this is allowed, and what it costs.

**Nothing a feature does runs outside a `try`/`catch`.** The runtime wraps `attach`, the session's `tick`, every cleanup, and every game event handler the context registers. Two of those need it badly. Per-tick work runs inside the game's own controller loop, which has no `try`/`catch` of its own, and an error escaping from there skips every controller after `control-panel` and breaks the game's own HUD. The game's event bus has none either, so an error escaping a listener reaches the game code that sent the event and the listeners queued behind it never run.

### Following the game from match to match

The `<control-panel>` element is written into the game's static HTML. It lives for the whole page and is never rebuilt. Each new match assigns a fresh object to its `.game` property, so that object's identity is the only thing that tells two matches apart. Its `.eventBus` property is the same object for every match and can never be used for this.

So the runtime watches `.game` for a change of identity, every 500 ms. Two of the game's exits never change it: a departure from the page, and a return to the lobby with no reload. Each of those gets its own signal, `pagehide` and `leave-lobby`.

The game offers no signal that means "this match is over". A win does not end anything, because the game keeps running so the player can spectate. So a feature that should stop when the player stops playing asks `isMatchLive`, which is false during the spawn phase, before the first update, throughout a replay, and after the player dies. A player who wins and then spectates is still live by that test, and features keep drawing for them, exactly as the game's own HUD does.

The reasoning behind all of that, and the failure modes it has to survive, is on [issue #4](https://github.com/DeLoWaN/openfront-extended-ui/issues/4).

## Screenshots

The images in `docs/images/` come from a local solo game on the map Europe, with the starting gold at 1 million and the alliance duration at 1 minute. Take them again when a feature changes how it looks.
