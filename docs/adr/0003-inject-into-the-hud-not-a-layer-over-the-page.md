# The package injects its nodes into the game's HUD, not a layer over the page

Both approaches were built and run side by side in a live match. The layer turned out not to escape the game's markup, because it still has to find the troop bar before it can measure it, and it fails in the worse of the two ways: it keeps drawing, in the wrong place, instead of not drawing at all. The package puts its own nodes inside the HUD instead, one level above the troop bar.

## Considered options

Drawing inside the troop bar itself was accurate, and useless for anything carrying a label. The bar sets `overflow: hidden`, so a label placed in it never appears.

Drawing an independent layer on the body could carry a label, but it needed a measuring loop on every drawn frame, it marked only one of the game's two troop bars at a time, and it stayed sharp and bright while the game dimmed its own HUD behind a modal, which reads as a bug. Hiding it correctly would mean knowing about every modal the game has.

Every element above the troop bar sets `overflow: visible`, so a node one level up draws above the bar without being clipped. That took away the layer's only real advantage and decided the question.

## Consequences

The package sets `position: relative` on the cell holding the troop bar. That is the one change it makes to the game's own elements, and switching a readout off has to undo it.

Placement needs no measurement and no loop. The browser handles a window resize, and the switch between the game's wide and narrow layouts, on its own.

Injected nodes dim and blur along with the HUD when the game opens a modal, because they belong to the HUD.

Settled on [issue #5](https://github.com/DeLoWaN/openfront-extended-ui/issues/5). The measurements are recorded there, and the throwaway is on branch `prototype/issue-5-render-surface`.
