# Throwaway prototype — issue #21

Answers two questions that cannot be settled in writing:

- How tall is the node that holds the regeneration curve?
- Does the crossing read without anything changing state?

Some terms first, because the rest of this leans on them.

The **HUD** is the panel at the bottom of the game showing troops, gold and the
attack slider. The **troop bar** is the bar inside it that fills as your army grows.
**Regeneration** is the troops the game gives you each tick for free, and its rate
depends on how full your army already is. The **regeneration curve** is the shape of
that rate across every troop level: it rises, peaks near 42% full, and falls to zero
at your maximum. The **crossing** is the moment you pass that peak from below, which
is the signal to spend troops.

The readout draws three things above the bar. The **curve** itself. A **drop line**
falling from the curve's peak, through the bar, marking the 42.2% level. And a **dot**
on the curve at your current level.

Everything else about this readout was settled on
[issue #6](https://github.com/DeLoWaN/openfront-extended-ui/issues/6) and is not a
variable here. Nothing in this folder is meant to survive into the package. It lives
on this branch as the record of how the answer was reached.

## The answer

Not settled yet. This prototype exists to be looked at. Record the answer on
[issue #21](https://github.com/DeLoWaN/openfront-extended-ui/issues/21).

## Running it

Start the game from the clone at `/Users/damien/git_perso/OpenFrontIO/`:

```bash
npm run dev
```

Open `http://localhost:9000`, start a solo match, and pick a spawn. Then either:

- paste `curve-height.user.js` into the browser console, or
- install it in Tampermonkey, which the metadata block at the top supports.

A magenta bar appears at the top of the screen. It sits at the top on purpose,
because the readout being judged sits at the bottom. It is magenta because violet is
the thing under judgement, so nothing that is not under judgement may be violet.

- `◀` and `▶` cycle the height.
- The three pills switch the options described below.
- The grey text on the right reports the live fill fraction and your share of your
  best rate, so you can tell how close you are to the line without guessing.

Every choice is saved, so it survives a reload. `window.__ofxProto21.destroy()`
removes everything and puts the HUD back as it was.

Play long enough to cross 42.2% in both directions. Launching an attack drops you
back below it, which is the motion this readout exists to show.

The readout draws in the wide layout only, which the game switches on at 1024 px. A
narrow browser window on a desktop machine shows nothing.

## The four heights

| | What it does |
| --- | --- |
| `A` | 24 px, in our own node above the bar |
| `B` | inside the bar itself, adding no height |
| `C` | 16 px, above the bar |
| `D` | 40 px, above the bar |

`B` is the one to look at first, because it costs no vertical space at all. It is
also the cramped case. The bar is 24 px tall, it hides its overflow, and it already
writes troop numbers across its middle in white bold with a drop shadow.

Two things about `B` are choices this prototype made, not settled decisions. The
drawing is placed after the bar's own contents, so the curve draws over those troop
numbers rather than under them. And the percentage has to sit inside the bar, because
there is no node above it to hold it.

## The three options

| | Default | What it does |
| --- | --- | --- |
| `state change` | off | The dot becomes a hollow ring once you are past the peak. |
| `drop line` | on | Draws the drop line at the 42.2% level. |
| `percentage` | on | Draws your share of your best rate in the top-right corner. |

The ticket asks for the first one. The other two are here because the ticket also
asks whether the drop line and the percentage add clutter, and you answer that by
switching them off and looking.

## What is already checked, so your eyes can skip it

These come from measuring the drawing in a test page that reproduces the game's own
troop bar markup. Do not spend time re-checking them on screen.

- The curve sits directly on top of the bar and shares its x-axis exactly.
- The drop line runs from the curve's peak down to the bar's bottom edge, and lands
  on 42.2% of the bar.
- The dot sits on the curve to within 0.01 px at every troop level.
- The dot lands on the boundary between the bar's two fills, not on the bar's far
  edge. Launching an attack therefore makes it jump left.
- The percentage always agrees with the dot's height, because both read the same
  fixed curve.
- All four heights mount and unmount cleanly, and switching between them leaves the
  game's own elements as they were.

One approximation is left. The bar draws a 1 px border, so its fills are 2 px
narrower than the node above them. The dot is therefore off by 1 px at an empty bar,
1 px the other way at a full one, and 0.16 px at the 42.2% line. Nothing to fix, but
worth knowing before you judge the alignment by eye.

## Numbers that shape the judgement

The dot costs 6 px of the height. It is 6 px across and has to fit inside the height
being judged, so it takes half a dot at the top and half at the bottom. A 24 px node
therefore holds 18 px of curve, and a 16 px node holds 10 px.

Near the line, the dot barely moves up or down. The curve's top is flat, so the
vertical signal is smallest exactly where the decision is made.

Curve travel below is the height the dot has to work with. The other three columns
are how far the dot actually moves up or down between two troop levels.

| | Curve travel | Across the whole plateau | Within 5 points of the line | Peak to 80% full |
| --- | --- | --- | --- | --- |
| `C` 16 px | 10 px | 0.50 px | 0.09 px | 4.5 px |
| `B` inside, 22 px | 16 px | 0.80 px | 0.14 px | 7.2 px |
| `A` 24 px | 18 px | 0.90 px | 0.16 px | 8.1 px |
| `D` 40 px | 34 px | 1.70 px | 0.30 px | 15.3 px |

The plateau is the flat top of the curve, and it is wide: any level from 30.6% to
54.3% full stays within 5% of your best rate.

Two consequences, and they pull in opposite directions.

The crossing is almost entirely horizontal. Within five points either side of the
line the dot rises and falls by less than a third of a pixel, even at 40 px. So what
you see when you cross is the dot passing the drop line, not the dot changing height.
That is the argument for switching the state change on. Settle it by looking.

Height earns its keep on the right-hand side instead. That is where regeneration
really falls away, and where a taller node shows more: 4.5 px of drop at `C` against
15.3 px at `D` for the same loss of rate.

The percentage cannot settle the crossing either. It is rounded to a whole percent,
so it reads `100%` from 38.4% to 45.9% full. That is a band 7.5 points wide with the
42.2% line in the middle of it, so the number says `100%` on both sides of the line.
Rounding is still the right choice, because the number exists to be quoted to another
player. It just means the crossing has nothing to do with the number.

## What to come back with

- Which height reads. Can you find your position on the curve without stopping to
  look for it?
- Does `B` work, or do the bar's own troop numbers make it unreadable?
- Does the crossing read with the state change off?
- Is the drop line doing its job, or does it just add clutter?
- Does violet hold up on both of the bar's blues and on its dark background?
- Does the percentage in the corner get in the way?
