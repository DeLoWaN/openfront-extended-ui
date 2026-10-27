# openfront-extended-ui

A **userscript**, meaning a browser script run by an extension such as Tampermonkey, that adds to the [OpenFront.io](https://openfront.io) game view. It changes nothing in the game. It runs beside the game, and everything it draws comes from something the game already shows somewhere.

Most of it lands on the **HUD**, the always-visible panel at the bottom of the game showing troops, gold and the attack slider. Two parts land on the map.

The vocabulary this project uses is in [CONTEXT.md](CONTEXT.md). The decisions behind the code are in [docs/adr/](docs/adr/).

## What works today

Five things: a readout on the game's own troop bar, a readout on the hotbar, a view mode on the map, a panel of your alliances in the top right corner, and marks on the map during the spawn phase.

### The troop bar readout

**Regeneration** is the troops the game gives you each tick for free. How fast they arrive depends on how full your army already is. The rate rises, peaks near 42% full, and falls to zero once your army is full. So a full army grows at nothing, and an army held near 42% grows fastest.

The readout adds two things inside the bar.

- A violet strip along the bar's bottom edge. It covers **the plateau**, meaning every troop level where regeneration stays within 5% of the best rate you could reach at any level. That runs from 30.6% to 54.3% full, about a quarter of the bar.
- Your **share of best rate** at the bar's far right, as a percentage. It reads 100% at the peak and 0% at a full army. The game shows this figure nowhere else.

Nothing marks the 42.2% level itself, and nothing changes colour when you cross it. The top of the curve is flat, so there is no cliff to draw. [ADR-0004](docs/adr/0004-the-optimal-troop-level-is-drawn-as-a-band.md) holds the reasoning and the numbers, and two drawings that were built and turned down first.

### The hotbar readout

The **hotbar** is the row of ten build icons at the bottom of the HUD. A city, a port and a factory each pass through three prices before the price stops rising: 125,000, then 250,000, then 500,000. The fourth price is one million, and it never changes again. The part of a match where the next one still costs less than a million is **the cheap window**. It is short, it falls at the start, and missing it is what this readout prevents.

The readout adds two things to three of the ten icons. The other seven are left alone.

- Three **step marks** under the icon. The number of lit marks is the price of the next one: one mark for 125,000, two for 250,000, three for 500,000. They are amber while you can afford it and light grey while you cannot, so you can read the price with or without the gold. They disappear once the price reaches one million, and that absence is what tells you the cheap window is over.
- A **light**, meaning an amber ring around the icon's box. It appears the moment you can afford the thing. It pulses three times quickly, then twice more slowly, and settles into a slow steady pulse, which is called **the breathing pulse**. It goes out when you build the thing, or spend the gold elsewhere.

The light appears again at each of the three prices. With 900,000 in hand you can build three cities in a row, and it lights for each one. A port and a factory are counted together, so building either one raises the price of both, and the marks move on their own. Losing a structure lowers the price, and both the marks and the light come back.

The readout is amber rather than the violet the rest of the package uses. The hotbar boxes are small, and amber reads brighter at that size.

The breathing pulse can be switched off on its own, in the settings panel. The three quick pulses and the marks stay.

The light sits about 600 pixels from where your eyes are in the opening minutes, so it also comes to the cursor. The moment a city, a factory or a port becomes affordable, a **badge** appears. The badge is a small amber panel with the icon of that building. An arrow under it points down to the building's own icon in the hotbar.

- The badge is centred under the cursor, 50 pixels below it. It is never beside the cursor or above it, because that is where you are about to click.
- It stays where it appeared, pulses about once a second, and fades after 3.5 seconds. It takes no clicks.
- The arrow never leans more than 55 degrees from straight down.
- A port and a factory share one price, so they often become affordable together. They get one badge with two icons and one arrow between them.
- The badge stays away while the game draws its own red crosshair, which is while a warship is selected and while Shift is held. It also stays away when the cursor is too close to the bottom of the screen to leave room below it.

The badge belongs to the hotbar readout, so switching the readout off removes it. The settings panel sets how long it stays, from 0.5 to 30 seconds.

The game removes the hotbar below 64rem, and the readout and the badge go with it.

### The alliance view mode

Hold the backquote key, which is the key it comes with. The whole map turns grey, except one player, everyone they are allied with, and their teammates in a team match. Those keep their own colours.

That player is the **subject**. The cursor picks it, and it sticks: it changes only when the cursor reaches another player. So sweeping across ocean does not throw it away. The first press has no subject, so the map greys and nothing is coloured until the cursor finds someone. Let go and the subject is forgotten, so the next press is a fresh look.

Only the subject's own alliance partners and teammates are coloured. An ally's own allies get nothing.

Every other player turns a dark grey of their own. Each grey keeps a faint trace of that player's colour, so the border between two greyed neighbours stays visible. The land and the sea turn grey as well. Late in a match you may be allied to everyone, and nobody is left to grey. The grey terrain still tells you the mode is on.

Each ally carries a clock under their name, saying how long that alliance has left. It turns red once the game starts offering to renew that alliance. The subject carries no clock, and that is the only thing that tells the two apart. A teammate has no alliance, so it carries no clock either. The mode never marks a player's colour to say something, because a player is known on the map by that colour. [ADR-0008](docs/adr/0008-information-by-position-and-text-never-by-changing-a-real-colour.md) holds the reasoning.

The mode stands down while one of the game's own pop-up panels is open, such as the chat or the leaderboard, because the game dims the map behind those. It stands down again while you hold the game's own view key, normally space. Under that view the game draws no territory at all, so there is nothing left to colour.

The hold key is yours to change in the settings panel. Click the key, then press the new one. The panel refuses a key the game already uses, and names the game action that holds it.

If you later give the game that key in the game's own settings, the mode refuses to run on it and says so in the console, and the settings panel shows the clash in red. Stealing a key you configured yourself is worse than not running at all.

The player names on the map lose their coloured outline while the key is down, because the game draws that outline from the same colours the mode rewrites. The letters keep their own colour, and the outline comes back when you let go.

### The alliance panel

The panel lists your own alliances in the top right corner of the HUD, under the game's own buttons. Each row holds the partner's name and the time that alliance has left, written `2:07`. The game already shows an alliance's time in other places, but only one alliance at a time. This is the one place that shows all of them together.

The list runs downward in time. The alliance with the most time left is at the top, and the one nearest its end is at the bottom. That looks upside down at first. It is right because the list also holds the past: an alliance that just ended stays at the bottom for 15 seconds, and the clock beside it counts up. Finished rows on top would push the one alliance you can still save down the list.

There are three kinds of row. Two of them carry a word, so you can tell them apart.

- An alliance you are in. It has no word.
- An **alliance request** aimed at you, marked `asks you`. Its clock is the time you have left to answer. The game refuses a request by itself after 20 seconds.
- An alliance that **ended** because the two partners did not renew it, marked `ended`. It is grey.

A broken alliance is not in the list. A betrayal is not a renewal you forgot, and the game already announces it.

Each row is also a **bar** that empties as the time runs out. A full bar is a whole alliance, and an empty one is the end. For a request, the whole is the 20 seconds you have to answer. An ended alliance has an empty bar.

The bar turns red once the game offers to renew that alliance, which is the last 30 seconds by default. It goes back to blue when you agree, because the game stops offering after that. It stays red if only your partner agreed.

Rest the cursor on a row and the map shows that player on their own. It is the alliance view mode's grey map with one player left in their own colours. It shows no ally and no clock, only that player. Allies are usually far away, so when that player is off screen a **pointer** appears: an arrow in that player's own colour, turned toward them, with their name under it. The pointer keeps clear of the bottom of the screen, where the game's own bars sit. It goes when the player is on screen, because their colour already shows. Move the cursor off the panel and the map goes back. A short rest is needed first, so a cursor that only crosses the panel does nothing. The hold key of the alliance view mode wins while you hold it. This needs the alliance view mode to be switched on, and the panel works without it.

A click on a row moves the camera to that player. That is all a click does. There is no renew button, because the package never sends a message to the game on your behalf. [ADR-0009](docs/adr/0009-the-package-changes-your-view-never-the-game.md) holds the reasoning. Renew from the game's own menu.

The panel is not on the screen when it has no row. It never scrolls, because a scrolling list would hide the row closest to its end. It draws nothing before you spawn, after you die, or in a replay. It reads what the game sends each tick, so a request that arrived before you switched the panel on is not shown.

### The spawn marks

The **spawn phase** is the opening of a match, while every player picks where to start. The marks help you find your own spawn and, in a team game, each of your teammates on the map.

Your own **spawn** and each human teammate's spawn carry a ring with the player's name above it. The ring is in that player's own territory colour. The name is in the same colour, except your own name, which is white. Your mark is drawn over the others. A dark outline keeps the ring readable on land of the same colour. The ring grows and shrinks with the zoom, and it breathes a little. The name stays still above it. The marks sit over the game's own pulse, and they never change a colour of the game's.

A mark that is off screen gets a chevron on the edge of the screen, pointing at it. A teammate's chevron is in the teammate's colour, and yours is white. Teammates' chevrons that land close together become one chevron with a count, such as `×3`. Your chevron never joins them. The chevrons stay clear of the bottom row of the HUD.

When a player picks another spawn, the mark glides to it. When the spawn phase ends, the marks fade over about a second and go. A game without teams draws your mark alone. A replay draws nothing. The marks only read the game. They send nothing.

The game draws its own pulse for you and for human teammates only, and so do the marks. A solo game has one human, so it has no human teammate to mark, and it shows your mark alone. To see teammates' marks in a solo team game, switch on the option that adds the Nation teammates. The Nations stand in for teammates. This option is a test aid, so the settings panel does not show it. Set it from the browser console.

```js
openfrontExtendedUi.setOption('spawn-marks', 'nation-teammates', true)
```

To try it, start a solo game on the map World, with the mode Teams, the team size Quads and no Tribes, and do not click the map. A solo game has no spawn timer, so the spawn phase lasts until your first click.

The marks were checked in a solo game with Nation teammates. They have not yet been checked in a game with several real humans.

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

Click **Extended UI** to open the **settings panel**. The row is in two places:

- Outside a match, at the top of the game's settings page, which **SETTINGS** in the top bar opens.
- In a match, in the game's settings menu, which the gear in the top right corner opens.

- Each feature has a row with a switch. Its options sit under it, and they grey out while the feature is off.
- A change applies at once. There is no Save button.
- **Reset to defaults** puts every feature and every option back, including the options the panel does not show. It asks for a second click within 3 seconds.
- Escape, the × button, or a click outside the panel closes it.

The browser console does the same, and it also reaches the options the panel leaves out.

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

A **feature** is any one of the four things the package adds. `src/runtime/feature.ts` holds the whole contract:

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
