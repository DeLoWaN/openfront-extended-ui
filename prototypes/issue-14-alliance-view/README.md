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

Alliances had not formed yet that early in the match, so the ally rings were driven
by stubbing `allies()` on a few players. That proves the colouring, not the game.

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
uses the middle button. A tap of `` ` `` does the same thing, for a trackpad.

### Schemes

| | What it does |
| --- | --- |
| `one` | The subject and every ally in the same violet. |
| `two` | The subject white, every ally violet. |
| `own` | The subject and every ally keep their real colours; everybody else greys. |
| `web` | The subject white, allies violet, allies-of-allies a dim violet. |

`own` is the one that tests whether the point is the web or the players in it.
`web` tests whether one ring is enough.

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
sees a player. Both are rare. A bot spawning halfway through and silently restoring
every colour would waste the match, so the script re-asserts every two seconds.

It rebuilds the palette each time rather than replaying the last upload, because a
replay would leave a player who spawned since then drawn in black.

## Where the mechanism comes from

[Issue #12](https://github.com/DeLoWaN/openfront-extended-ui/issues/12) settled it and
is not in question here. Every line reference in the script was checked against the
clone at commit `332e5410e`.
