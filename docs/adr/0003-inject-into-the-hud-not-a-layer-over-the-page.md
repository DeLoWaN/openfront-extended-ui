# The package injects its nodes into the game's HUD, not a layer over the page

Both approaches were built and run side by side in a live match. The layer turned out not to escape the game's markup, because it still has to find the troop bar before it can measure it, and it fails in the worse of the two ways: it keeps drawing, in the wrong place, instead of not drawing at all. The package puts its own nodes inside the HUD instead. Where a readout carries a label, they go one level above the game's element; where it carries none, they can go inside that element.

## Considered options

Drawing inside the troop bar itself was accurate, and useless for anything carrying a label. The bar sets `overflow: hidden`, so a label placed in it never appears.

Drawing an independent layer on the body could carry a label, but it needed a measuring loop on every drawn frame, it marked only one of the game's two troop bars at a time, and it stayed sharp and bright while the game dimmed its own HUD behind a modal, which reads as a bug. Hiding it correctly would mean knowing about every modal the game has.

Every element above the troop bar sets `overflow: visible`, so a node one level up draws above the bar without being clipped. That took away the layer's only real advantage and decided the question.

## Consequences

A readout that needs a node above the game's element sets `position: relative` on that element's cell, and switching it off has to undo it. That is the only property the package writes on anything of the game's own.

A readout that carries no label above its element does not need even that. The troop bar readout is one: it appends its nodes inside the bar itself, between the bar's fills and its troop numbers, and writes no property on any game element. See [ADR-0004](0004-the-optimal-troop-level-is-drawn-as-a-band.md). The option rejected above was rejected only for carrying a label, so it comes back the moment a readout has no label to carry.

Placement needs no measurement and no loop. The browser handles a window resize, and the switch between the game's wide and narrow layouts, on its own.

Injected nodes dim and blur along with the HUD when the game opens a modal, because they belong to the HUD.

Settled on [issue #5](https://github.com/DeLoWaN/openfront-extended-ui/issues/5). The measurements are recorded there, and the throwaway is on branch `prototype/issue-5-render-surface`.
