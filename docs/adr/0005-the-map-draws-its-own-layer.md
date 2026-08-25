# The map surface draws its own layer, although the HUD does not

[ADR-0003](0003-inject-into-the-hud-not-a-layer-over-the-page.md) settled that the package puts its nodes inside the game's HUD rather than in a layer over the page. That decision is about the HUD, and it stands. It does not carry to the map, and the map cannot follow it.

The HUD is built from ordinary elements written into the page. ADR-0003 gives a readout two places to go: inside the game's element when it carries no label, and one level above that element when it does. Either way the browser handles placement, resizing and layout changes on its own.

The map is a third case, and neither of those places exists in it. The map is one WebGL canvas. It has no element per territory, so there is nothing to draw inside and nothing to sit above. The game draws its player names inside the renderer, where a userscript cannot reach. Anything the package draws on the map therefore has to be a layer of its own, placed by measurement.

The alliance view mode needs this. It draws a clock on each ally's territory, showing how long that alliance has left.

## Where a map label is anchored

`PlayerView.nameLocation()` returns the world point the game's own name pass uses, so a label placed there sits with the player's name rather than merely near it.

Size follows the game's own steps, in `shaders/name/text.vert.glsl`. A name grows with the square of its owner's room until a cap, not in step with it. A label scaled straight from the camera drifts away from the name as an empire grows, which defeats the point of anchoring to the name.

## Consequences

The map surface needs a loop on every drawn frame, because the camera moves without telling us. No readout in the HUD needs a loop at all.

The layer keeps drawing while the game dims itself behind a modal, which reads as a bug. A readout in the HUD avoids this by belonging to the HUD, and dims with it. The map cannot.

A label can land under one of the game's own panels. Raising the layer above them would cover the HUD instead, which is worse. Neither choice is clean.

Switching the view mode off has to take the layer with it.

These costs belong to the map alone. Do not read this as permission to draw a layer over the HUD, where an element to inject into does exist.

Settled on [issue #14](https://github.com/DeLoWaN/openfront-extended-ui/issues/14). The throwaway is on branch `prototype/issue-14-alliance-view`, and its README records what was checked against the game.
