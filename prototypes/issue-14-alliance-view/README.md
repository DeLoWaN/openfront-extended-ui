# Throwaway prototype — issue #14

Answers one question: is the alliance view mode worth building, and what does it
actually feel like?

The **alliance view mode** greys the whole map and colours one player and everyone
they are allied with. It is the only feature in the package that draws on the map
rather than in the HUD.

Nothing here is meant to survive into the package. It lives on this branch as the
record of how the answer was reached.

## The answer

Not settled yet. This is the script the answer gets judged from. Every question the
ticket asks is a judgement made while playing, so the verdict waits for a real match
and then goes on
[issue #14](https://github.com/DeLoWaN/openfront-extended-ui/issues/14).

The plumbing underneath is settled. It was run against a live singleplayer match on
the Europe map and does what issue #12 said it would:

- Both hooks resolve, and `updatePalette` greys every player in one call.
- The cursor reaches a player through `screenToWorldCoordinates` and `tileState`.
- All four schemes write the colours they promise, checked by reading the array back.
- `territoryAlpha` and `passEnabled.name` both take effect on the next frame.
- `destroy()` puts every real colour, both settings and the map back.
- `config().allianceDuration()` reads 3000 ticks, the documented five minutes.
- Allies match their alliance rows by `PlayerID`, and the fractions come out exact.
- The fade darkens in step with the fraction, and goes flat when it is switched off.
- The countdown formats, re-sorts as clocks wind down, and survives an expiry of 0.

Two limits on that list, both from the environment rather than the script.

**No real alliance was observed.** Nations need hundreds of ticks to ally, and the
match ran at roughly one tick per second here, so the ally rings and every clock were
driven by stubbing `allies()` and `alliances()`. That proves the script, not the game.
What was checked directly is that the `alliances` field arrives for **every** player
and not only the local one: it is present and an array on each of them, and
`PlayerImpl.toUpdate()` builds it with no local-player test.

**The one-second clock was not seen to fire.** A hidden browser pane throttles a
long-lived timer to about once a minute, and it also froze the game's own clock, so
there was nothing for the countdown to move to. The recompute and the redraw it
performs were both driven directly instead, and they are correct.

## Running it

Start the game from the clone at `/Users/damien/git_perso/OpenFrontIO/`:

```bash
npm run dev
```

Open `http://localhost:9000`, start a singleplayer match with enough bots that
alliances form, and pick a spawn. Alliances take a few minutes of play to appear, so
give the match time before judging anything. Then either:

- paste `alliance-view.user.js` into the browser console, or
- install it in Tampermonkey, which the metadata block at the top supports.

A bar appears at the top of the screen. It sits at the top on purpose, because the
game's own HUD sits at the bottom.

Every choice is saved, so it survives a reload.

`window.__ofxProto14.destroy()` puts the map back and removes everything.

## The knobs

Each one answers a question the ticket asks.

| Button | Question it answers |
| --- | --- |
| `trigger` | Is hovering the right trigger, or does it want a click, or a held key? |
| `scheme` | Is one colour for every ally enough? |
| `fade` | Should the map carry how long each alliance has left? |
| `grey` | Does the grey read flat, or does it blend into the terrain? |
| `alpha` | The same question, from the other side. `territoryAlpha`, default 0.588. |
| `names` | The names lose their colour. Does that help or hurt? |

### Triggers

| | What it does |
| --- | --- |
| `hover` | The subject follows the cursor. What the ticket describes. |
| `click` | Middle click, or a tap of `` ` ``, locks the player under the cursor. Click again to release. |
| `hold` | The mode is on only while `` ` `` is held down. |

Left click attacks and right click opens the game's own player panel, so `click`
uses the middle button. A tap of `` ` `` does the same thing, for a trackpad. The
key is ignored while you type in the game's chat.

A wheel zoom moves the map under a cursor that has not moved, so a different player
is under it and no mouse event says so. The script re-reads the tile after every
zoom. Without that the map keeps the old subject and a click locks the wrong player.

### Schemes

| | What it does |
| --- | --- |
| `one` | The subject and every ally in the same violet. |
| `two` | The subject white, every ally violet. |
| `own` | The subject and every ally keep their real colours; everybody else greys. |
| `web` | The subject white, allies violet, allies-of-allies a dim violet. |

`own` is the one that tests whether the point is the web or the players in it.
`web` tests whether one ring is enough.

### The expiry timer

Every alliance ends, and a web of alliances that all lapse in twenty seconds is a
different picture from one that holds for five minutes. The ticket did not ask for
this. It turned out to be the first thing the picture was missing.

It shows up in two places at once, so the two can be judged against each other.

**In the readout**, every ally carries the time left as `m:ss`, soonest first. Which
alliance breaks next is the useful order, and alphabetical order buries it.

**On the map**, the `fade` button makes an ally's brightness carry the time left. A
fresh alliance draws in full violet and one about to lapse draws in a dark violet.
The fade stops short of the grey rather than reaching it, because an ally about to
lapse must still read as an ally. The grey has no hue at all, so even the darkest
ally stays apart from it. `no fade` turns this off and leaves every ally flat, which
is the comparison.

The fade is not a new idea. The game already draws a player's own alliance icon at a
brightness set by `remainingTicks / allianceDuration`
(`src/client/render/frame/derive/PlayerStatus.ts:168`). This is that same ratio, for
somebody else's alliances.

Both `own` and the ally schemes fade. The second ring in `web` does not: it is
already dim, and those alliances do not involve the player you are pointing at.

### One clock, deliberately wrong under fast forward

The game turns ticks into seconds by dividing by a fixed ten
(`PlayerPanel.ts:150`, `PlayerInfoOverlay.ts:233`). Singleplayer scales the real tick
rate with its speed setting, so the game's own countdown runs wrong whenever the
speed is not normal. This script copies the game rather than correcting it. Two
clocks that disagree read as a bug, and this one exists to match what the game
shows.

## Two things the ticket gets slightly wrong

Both are worth looking at on screen rather than taking from the description.

**The names do not go grey. Their outlines do.** The name pass reads row 0 of the
palette, the same row as the territory fill, so greying the map does reach the names.
But `name.fillUsePlayerColor` is `false` and `name.outlineUsePlayerColor` is `true`,
so the letters keep their own fill and lose their coloured edge.

**The names can be switched off outright.** `settings.passEnabled.name` is read on
every draw, and the game's own debug panel writes to it the same way. That is a third
answer to "does it help or hurt" that the ticket did not have: not grey names or
coloured names, but no names at all.

## What keeps it applied

The game rewrites the whole palette on a theme change, and again the first time it
sees a player. Both are rare. A bot that spawns halfway through and quietly restores
every colour would waste the match, so the script re-asserts every four seconds.

It rebuilds the palette each time rather than replaying the last upload, because a
replay would draw a player who spawned since then in black.

The readout counts these re-assertions apart from the uploads you cause by hovering,
because only the second figure is the cost of the feature. A readout that said "101
uploads" after a minute of sitting still would make hovering look far more expensive
than it is.

With `fade` on, the beat halves to two seconds, because the fade has to redraw as the
clocks run and repair alone does not. That doubles the keep-alive count, which is a
real cost of the fade and is why the two figures are kept apart.

The countdown text redraws once a second on its own, without a palette upload. It has
to recompute the clocks each time: the numbers were read at paint time and do not
move by themselves.

## The boundary, for the timer

`CONTEXT.md` says the test is never that the data is available, but whether the game
already shows the thing somewhere.

The game shows an alliance's remaining time in three places: the player panel, the
hover overlay, and the brightness of the alliance icon it draws on the map. All three
show it only for an alliance **you** are in. `PlayerInfoOverlay.ts:394` looks the
figure up as `myPlayer.alliances().find(...)`.

So reading it for a hovered stranger is the same move the colouring already makes:
the reference point shifts from you to whoever you point at, and nothing appears that
the game does not already draw for one player. That is the argument
[issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1) already made for
the view mode, applied to the clock.

Worth saying plainly: if that argument is ever rejected, it takes the whole feature
with it, not just the timer.

## Where the mechanism comes from

[Issue #12](https://github.com/DeLoWaN/openfront-extended-ui/issues/12) settled it and
is not in question here. Every line reference in the script was checked against the
clone at commit `332e5410e`.
