# The optimal troop level is drawn as a band, not a point

Regeneration is the troops the game gives you each tick for free, and its rate depends on how full your army already is. That rate peaks when the troop bar is about 42.2% full. The package marks the levels where the rate is near its best as a band on the bar, and does not mark 42.2% at all.

Two drawings that marked the point instead were built and turned down. The first was a graph of the regeneration curve in a node above the troop bar, at four heights. The second coloured the bar itself, with every point along it coloured by that level's share of your best rate. Both were faithful, and both failed the same way.

The reason they failed is that the top of the curve is flat, so distance from the peak is nearly free until it suddenly is not:

| Off the peak by | Below the peak | Above the peak |
| --- | --- | --- |
| 5 points | 1% slower | 1% slower |
| 10 points | 4% slower | 4% slower |
| 20 points | 19% slower | 15% slower |
| 30 points | 62% slower | 41% slower |
| 40 points | 5 times slower | twice as slow |

Any drawing of distance from the peak therefore has almost nothing to say in the region where the decision actually gets made. The curve made this concrete: a node 40 px tall moved its dot by less than a third of a pixel across the ten points either side of the line, and a shorter node moved it less.

## Decision

The band covers every troop level whose regeneration reaches 95% of your best rate. That is 30.6% to 54.3% full, a quarter of the bar's width. It is drawn as a 3 px solid violet strip along the bar's bottom edge, below the troop numbers the game writes across the middle. Your share of your best rate is printed as a percentage at the bar's far right, counting up, so 100% is as fast as you can go.

95% is the threshold because it is the first one where leaving the band is worth acting on. The other two thresholds compared were 99%, which covers only 10.6 points and implies a precision that does not matter, and 90%, which covers 33.5 points and barely constrains anything.

## Consequences

Nothing marks 42.2%. The band's midpoint sits at 42.45%, which is within 0.55 of a percentage point of the true peak at every threshold compared, and thinner than any mark that could show it. This also disposes of the problem [ADR-0002](0002-the-42-2-level-is-drawn-as-a-fixed-point.md) was written to manage: the true peak moves as an army grows, and a band a quarter of the bar wide does not care.

The readout changes no property of any of the game's own elements. It appends its two nodes inside the troop bar, between the bar's fills and its troop numbers, so it draws over the fills and under the text with no `z-index` of its own. See [ADR-0003](0003-inject-into-the-hud-not-a-layer-over-the-page.md), whose consequence about setting `position: relative` does not apply to this readout.

The strip is opaque rather than translucent, and that is what the move below the troop numbers buys. A veil across the whole bar height has to stay translucent, or it hides the troop fill's own edge, which is the reader's position. Staying translucent is what makes it too faint to see against the bar's blue. Below the text there is no such trade, because the fill is a flat colour and covering its bottom pixels hides nothing.

The band adds no height. It fits inside the bar the game already draws, so the question of how tall a node above the bar should be never has to be answered.

Supersedes [ADR-0002](0002-the-42-2-level-is-drawn-as-a-fixed-point.md).

Settled on [issue #21](https://github.com/DeLoWaN/openfront-extended-ui/issues/21). All three drawings, and the sheets used to compare them, are on branch `prototype/issue-21-curve-height`.
