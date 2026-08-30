# openfront-extended-ui

A **userscript**, meaning a browser script run by an extension such as Tampermonkey, that adds to the [OpenFront.io](https://openfront.io) game view. It changes nothing in the game. It runs beside the game, and everything it draws comes from something the game already shows somewhere.

Most of it lands on the **HUD**, the always-visible panel at the bottom of the game showing troops, gold and the attack slider. One part lands on the map.

The vocabulary this project uses is in [CONTEXT.md](CONTEXT.md). The decisions behind the code are in [docs/adr/](docs/adr/).

## What works today

Two things: a readout on the game's own troop bar, and a view mode on the map.

### The troop bar readout

**Regeneration** is the troops the game gives you each tick for free. How fast they arrive depends on how full your army already is. The rate rises, peaks near 42% full, and falls to zero once your army is full. So a full army grows at nothing, and an army held near 42% grows fastest.

The readout adds two things inside the bar.

- A violet strip along the bar's bottom edge. It covers **the plateau**, meaning every troop level where regeneration stays within 5% of the best rate you could reach at any level. That runs from 30.6% to 54.3% full, about a quarter of the bar.
- Your **share of best rate** at the bar's far right, as a percentage. It reads 100% at the peak and 0% at a full army. The game shows this figure nowhere else.

Nothing marks the 42.2% level itself, and nothing changes colour when you cross it. The top of the curve is flat, so there is no cliff to draw. [ADR-0004](docs/adr/0004-the-optimal-troop-level-is-drawn-as-a-band.md) holds the reasoning and the numbers, and two drawings that were built and turned down first.

### The alliance view mode

Hold the backquote key, which is the key it comes with. The whole map turns grey, except one player and everyone they are allied with. Those two keep their own colours.

That player is the **subject**. The cursor picks it, and it sticks: it changes only when the cursor reaches another player. So sweeping across ocean does not throw it away. The first press has no subject, so the map greys and nothing is coloured until the cursor finds someone. Let go and the subject is forgotten, so the next press is a fresh look.

Only the subject's own alliance partners are coloured. An ally's own allies get nothing.

Each ally carries a clock under their name, saying how long that alliance has left. It turns red once the game starts offering to renew that alliance. The subject carries no clock, and that is the only thing that tells the two apart. The mode never marks a player's colour to say something, because a player is known on the map by that colour. [ADR-0008](docs/adr/0008-information-by-position-and-text-never-by-changing-a-real-colour.md) holds the reasoning.

The mode stands down while one of the game's own pop-up panels is open, such as the chat or the leaderboard, because the game dims the map behind those. It stands down again while you hold the game's own view key, normally space. Under that view the game draws no territory at all, so there is nothing left to colour.

The hold key is yours to change. Write it the way the browser names a key.

```js
openfrontExtendedUi.setOption('alliance-view', 'hold-key', 'KeyJ')
```

If the game already uses the key you pick, the mode refuses to run on it and says so in the console. Stealing a key you configured yourself is worse than not running at all.

The player names on the map lose their coloured outline while the key is down, because the game draws that outline from the same colours the mode rewrites. The letters keep their own colour, and the outline comes back when you let go.

The other four features are still to come. They are listed on [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1).

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

An option is not always a switch. The alliance view mode's option holds the key it is held on, written the way the browser names a key:

```js
openfrontExtendedUi.setOption('alliance-view', 'hold-key', 'KeyJ')
```

`list()` shows the key of every option a feature offers and what each one is set to. Choices are kept in the browser's `localStorage` and survive a reload. Switching a feature or an option off takes it off the screen at once, without waiting for the next match.

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

**A feature takes nothing from the page directly.** It listens on the game's event bus through the context, it listens on the page's own window through the context, and it registers its cleanup through the context. The runtime undoes all of it when the match ends or the feature is switched off. The reason is that the game's event bus is shared by the whole page, it never forgets a listener, and it removes one only when handed the same function object it was given. A feature that cleaned up by hand would eventually forget, and the leak would last as long as the browser tab.

The alliance view mode is the one feature that also puts a node of its own on the page, because the map is a single canvas with nothing to draw inside. It goes and comes back with the mode. [ADR-0005](docs/adr/0005-the-map-draws-its-own-layer.md) says why the map is the only place this is allowed, and what it costs.

**Nothing a feature does runs outside a `try`/`catch`.** The runtime wraps `attach`, the session's `tick`, every cleanup, and every game event handler the context registers. Two of those need it badly. Per-tick work runs inside the game's own controller loop, which has no `try`/`catch` of its own, and an error escaping from there skips every controller after `control-panel` and breaks the game's own HUD. The game's event bus has none either, so an error escaping a listener reaches the game code that sent the event and the listeners queued behind it never run.

### Following the game from match to match

The `<control-panel>` element is written into the game's static HTML. It lives for the whole page and is never rebuilt. Each new match assigns a fresh object to its `.game` property, so that object's identity is the only thing that tells two matches apart. Its `.eventBus` property is the same object for every match and can never be used for this.

So the runtime watches `.game` for a change of identity, every 500 ms. Two of the game's exits never change it: a departure from the page, and a return to the lobby with no reload. Each of those gets its own signal, `pagehide` and `leave-lobby`.

The game offers no signal that means "this match is over". A win does not end anything, because the game keeps running so the player can spectate. So a feature that should stop when the player stops playing asks `isMatchLive`, which is false during the spawn phase, before the first update, throughout a replay, and after the player dies. A player who wins and then spectates is still live by that test, and features keep drawing for them, exactly as the game's own HUD does.

The reasoning behind all of that, and the failure modes it has to survive, is on [issue #4](https://github.com/DeLoWaN/openfront-extended-ui/issues/4).
