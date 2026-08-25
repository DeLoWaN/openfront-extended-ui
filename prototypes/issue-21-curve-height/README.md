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

Three directions were tried, in this order. The first two were turned down after
being looked at.

| | | |
| --- | --- | --- |
| `curve-height.user.js` | a curve above the bar, at four heights | turned down |
| `gradient.user.js` | the rate as colour across the bar | turned down |
| `zone.user.js` | the band where the rate is near its best | live |

`zone.user.js` is the one to look at. `proposals.html` is the sheet of options that
led to it, and it can be opened straight in a browser. The two earlier scripts stay
as the record of what was tried. Record the answer on
[issue #21](https://github.com/DeLoWaN/openfront-extended-ui/issues/21).

## Why the first two failed, in one paragraph

Both were faithful drawings of the share of best rate, and that is the problem. The
share hardly changes anywhere near the 42.2% level: five points either side costs
about 1%, and ten points costs 4%. So both drawings had nothing to say exactly where
the decision gets made. The fault was never the encoding. It was that **the optimum is
not a point, it is a wide band** &mdash; every level from 30.6% to 54.3% full sits
within 5% of your best rate. Draw the band and the flatness stops being a problem and
becomes the message.

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

# The gradient

`gradient.user.js`. A second direction, after the curve was turned down. It costs no
vertical space at all, which was the curve's real problem, and it needs no node above
the bar.

The colour is not a plain ramp between the two ends. Every stop is the same share of
best rate the curve plotted, so the colour at any point along the bar is that troop
level's share. Green lands on the 42.2% level because that is where the share reads 1.
The colour is the curve, drawn as colour.

## The three variants

| | What it does |
| --- | --- |
| `G` | The gradient replaces the game's blue troop fill, clipped to your level. |
| `T` | The gradient sits behind the game's fills, which stay blue. |
| `V` | `T` again in violet, which carries no meaning of the game's own. |

`G` is the ask. `T` and `V` each test one of the objections below, so you can see
whether the objection matters to you or not.

One toggle: the 42.2% line, on or off. The colour peak may already place it.

`G` and `T` differ in more than layering, and the difference is the interesting part.
`G` shows the ramp you have climbed and clips away everything past your level, so the
cost of growing further is not on screen. `T` covers what you have passed with the
blue fill and leaves the colour ahead of you visible, so it shows what you are growing
into. The overshoot cost that `G` hides is the only thing `T` shows.

## Three conflicts with decisions already written down

Recorded here rather than settled, because they are yours to settle. The first is a
fact you can check in five seconds. The other two are judgements.

**The gradient and the game's own pill say opposite things.** The pill to the left of
the bar reads `+380/s`, and the game colours it green while your rate rises and orange
while it falls (`ControlPanel.ts:300-307`). So on the pill, green means below the
42.2% level and orange means above it. In the gradient, green means a high share of
your best rate and orange means a low one. Those are different meanings for the same
two colours, about 100 px apart.

| Troop level | Share of best | Pill | Bar | |
| --- | --- | --- | --- | --- |
| 5% full | 35.0% | green | orange | clash |
| 20% full | 80.4% | green | green | agree |
| 42.2% full | 100.0% | orange | green | clash |
| 55% full | 94.4% | orange | green | clash |
| 80% full | 55.1% | orange | green | clash |
| 90% full | 30.0% | orange | orange | agree |

They disagree from 42.2% to 82.2% full, a band 40 points wide, and again from 0% to
8.6% full. The upper band covers the whole range where the decision to spend troops
gets made. The switcher reports which colour the pill currently shows, so you can
watch the two disagree during a match.

**It repurposes the game's colours.** [#6](https://github.com/DeLoWaN/openfront-extended-ui/issues/6)
settled that the game's colours keep the game's meanings, and that violet marks a
figure the package worked out itself. Green and orange here are ours, carrying our
meaning, in the game's own palette. `V` is the same drawing under the settled rule, so
it costs nothing to compare them.

One correction while checking this. #6 says the game's palette "has no purple
anywhere". It does. `PlayerPanel.ts:365-371` marks a Nation with indigo and a Bot with
purple, and `WinModal.ts:231` and `SendResourceModal.ts:276` use `bg-indigo-600` for
their primary button. None of it sits on the HUD's bottom row, so violet is still
foreign next to the troop bar, but the blanket claim does not hold. Pink, fuchsia and
rose have no uses at all, so there is unused hue space if violet ever turns out to be
too close to something.

**[#6](https://github.com/DeLoWaN/openfront-extended-ui/issues/6) turned a gradient
down once already**, on the grounds that a gradient reads as "aim here" while a break
reads as a switch. The settled decision is that crossing the line means spend, not
sit. A green centre says park here, which is the opposite. Worth deciding whether that
reading still holds now that the gradient carries the real curve instead of a made-up
ramp.

`G` also changes how the game's own troop fill looks, which no readout has done so
far. `T` and `V` leave the blue fill alone and draw behind it.

## What to do about the colour clash

The clash does not come from the two colours picked. It comes from the pill and the
gradient using the same channel, hue, for two different quantities. The pill's hue
tells you which way the rate is moving. The gradient's hue tells you how big the rate
is. Two quantities, one channel, so they contradict wherever the two happen to
disagree. Any warm-to-cool ramp does this, whatever the exact hex values.

That leaves three ways out, and only one of them is any good.

**Match the pill's quantity instead.** Colour the bar green below the 42.2% level and
orange above it. The hue can then never contradict the pill. Reject this. It says
nothing the pill does not already say, and it puts a hue break in the middle of the
plateau: 40% full and 45% full would read green and orange while their rates differ by
0.2 of a percentage point. #6 turned that cliff down for good reasons and they still
hold.

**Keep the quantity, change the channel.** Draw the ramp in a hue the game does not
use for anything, so nobody can read it against the pill. This is `V`, and it is the
recommendation.

**Accept the clash.** This is `G` as it stands. Live with the pill and the bar
disagreeing across a 40-point band.

`V` was tuned after the first look, and both changes were needed to make it judgeable:

- Hue 300 rather than the 285 of `#7f77dd`. The gradient has to sit directly against
  the bar's own blue fill, and 285 is only 40 degrees off that blue, which reads as one
  muddy band at the join. 300 leans far enough towards magenta to separate cleanly.
- The dim end floors at 38% lightness. The bar's track is already dark, so a dim end
  near black reads as an empty bar rather than as a low rate.

The cost is real and worth saying plainly: violet gives up the traffic-light instinct.
Nobody has to be told what orange means. A violet ramp has to be learned once. That is
the whole of what the recommendation trades away, and it buys a readout that never
argues with the game underneath it.

Pair it with `T`'s layering, behind the fills rather than over them, for two reasons
beyond the colour. Blue keeps meaning troops, and the bright part of the ramp stays
visible ahead of your fill, which is the half of the curve `G` clips away.

That layering also produced the one thing in this prototype nobody designed. The
brightest violet sits at the 42.2% level, so while you are below it the glow is ahead
of your fill and you grow towards it. Once you are past it the fill has covered the
glow and only the fading side is left. The crossing therefore reads as the glow going
from in front of you to behind you, with no state change and no line. Whether that is
enough is the thing to look at.

## Two things the measurements already flagged

The 42.2% line is dim violet, chosen in #6 to sit on the bar's dark background and on
its blues. Over the bright yellow and green of `G` it nearly disappears. If the line
is worth keeping here, it wants to be dark rather than violet.

`T` and `V` are drawn once at mount and never touched again, because a static gradient
needs no updates. Only `G` follows your troop level, and it animates its clip on the
same 200 ms ease-out the game uses for its own fill, so the two edges stay together.

## Running the gradient

Same as above, with `gradient.user.js` in place of `curve-height.user.js`.
`window.__ofxProto21g.destroy()` removes it. The two scripts keep separate settings
and can run at the same time, though a curve drawn over a coloured bar is not a
combination anyone chose.

# The zone

`zone.user.js`. The live direction, and the third attempt.

Two things are drawn, both inside the existing bar. Nothing is added above or below
it.

- A **band** covering every troop level whose regeneration is near your best.
- A **number** at the bar's far right: your share of that best. 100% is as fast as you
  can go, and 50% means troops arrive at half speed.

## What was decided on the way here

**No mark at 42.2%.** The middle of the band reads as the peak on its own. The two
agree closely at every band width: the widest band's midpoint sits at 42.75%, which is
0.55 of a percentage point off the real peak and far under the width of any mark that
could show it.

**The number counts up, not down.** An earlier draft showed how much *slower* you are,
where 1.00 was the best case and 2.00 meant half speed. This shows the share instead,
so the good end is the big number. Same quantity, read the other way round.

**No hatched segment.** A draft marked the stretch between your fill edge and the
band, to say how many troops to spend. It was dropped because it is already there to
be read: the gap between your fill edge and the band's edge is that same distance, so
the hatching only restated it.

**The band draws over the game's fills and under its troop numbers.** The bar lists
its fills first and its numbers second, and every one of them is positioned with no
`z-index`, so a node inserted between the two lands in exactly that order. The white
troop figures stay fully legible on top of the band. This was checked by measuring the
stacking order, not by eye alone.

## The two things still open

The band's width is the real question, so it cycles with `◀` and `▶`. Each is a
defensible reading of the word "optimal".

| | Troop levels | Width | What it claims |
| --- | --- | --- | --- |
| `99` | 36.9% to 47.5% full | 10.6 points | within 1% of your best |
| `95` | 30.6% to 54.3% full | 23.7 points | within 5% of your best |
| `90` | 26.0% to 59.5% full | 33.5 points | within 10% of your best |

The band's two ends are always drawn, full height. Between them a solid strip runs
along the bar's bottom edge. Its height cycles on its own button, and `strips.html`
compares the four settings at four troop levels without starting a match.

| | |
| --- | --- |
| `5px` | the default |
| `8px` | more present, and it starts to crowd the digits above it |
| `3px` | quieter, still legible |
| `off` | the two ends alone, which reads as a bracket |

The number switches off separately.

## Why the strip is solid, and why that took three tries

The band crosses up to three backgrounds at once: the troop fill's `#0084d1`, the
committed fill's lighter `#3fa9f5`, and the bar's dark track. Any one translucent
colour therefore lands at a different contrast on each, and every violet close enough
to the signature colour disappears against the blue.

A veil across the whole bar height had to stay translucent, because going opaque would
have hidden the fill's own edge, and that edge is your position. Staying translucent is
what kept it too faint to read. Two problems, one cause.

Moving the strip below the game's troop numbers removes both at once. The fill is a
flat colour, so covering its bottom few pixels hides nothing, which means the strip can
be fully opaque. Solid `#9d93f5` reads clearly on the blue and on the dark track, and
the fill edge stays visible in the 17 px above it.

The two end lines still cross the text, because they need the height to be found at a
glance. They are 2 px wide and they draw under the numbers, so the digits stay whole.

## A bug worth recording

The band's right end was missing for the first run of this script, and the cause is
worth writing down because it looks like working code:

```js
edges[1].style.cssText = edges[0].style.cssText.replace("left:0", "right:0");
```

Reading `cssText` back gives the browser's own serialisation, not the string that was
written. `left:0` comes back as `left: 0px`, so the search found nothing, both ends got
`left: 0`, and the two lines drew on top of each other at the band's start. Each line
is now built from its own list.

## Running the zone

Same as above, with `zone.user.js` in place of `curve-height.user.js`.
`window.__ofxProto21z.destroy()` removes it.
