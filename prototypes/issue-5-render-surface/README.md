# Throwaway prototype — issue #5

Answers one question: does the package draw inside the game's own HUD elements, or
does it draw its own layer on top?

The HUD is the panel at the bottom of the game showing troops, gold and the attack
slider. It is built from Lit custom elements written into the page's static HTML.

Nothing here is meant to survive into the package. It lives on this branch as the
record of how the answer was reached.

## The answer

Draw our own nodes inside the game's HUD. Variant `D` in the script.

The reasons, and the numbers behind them, are on
[issue #5](https://github.com/DeLoWaN/openfront-extended-ui/issues/5).

## Running it

Start the game from the clone at `/Users/damien/git_perso/OpenFrontIO/`:

```bash
npm run dev
```

Open `http://localhost:9000`, start a solo match, and pick a spawn. Then either:

- paste `mark-42-2.user.js` into the browser console, or
- install it in Tampermonkey, which the metadata block at the top supports.

A bar appears at the top of the screen. It sits at the top on purpose, because the
HUD being judged sits at the bottom.

- `◀` and `▶` cycle the variant. The choice is saved, so it survives a reload.
- `nudge layout` inserts a fake notification row above the HUD, which reproduces the
  layout shift the game's own notification causes without waiting for one.
- The counters on the right show how many nodes each variant injected, and how many
  frames the measuring variant had to write.

`window.__ofxProto5.destroy()` removes everything.

## The variants

| | What it does |
| --- | --- |
| `A` | The mark is a child of the game's own troop bar element. |
| `B` | The mark is an independent layer on the body, placed by measuring the bar. |
| `C` | `A` in white and `B` in magenta at once, so any drift shows as a gap. |
| `D` | Our own node one level above the bar, still inside the HUD. |

`D` was added after `A` and `B` were compared. It is the one that won.
