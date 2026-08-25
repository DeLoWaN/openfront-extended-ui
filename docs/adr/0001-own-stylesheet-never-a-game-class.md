# The package ships its own stylesheet and never uses a game class

The game's HUD elements switch off their shadow DOM on purpose so that Tailwind classes reach them, so nodes we inject there could use the game's utility classes for free. One element does not: `<build-menu>` keeps its shadow DOM and ships its own scoped CSS, and the build menu progress bars live inside it. A visual language built from the game's classes would therefore work for four readouts and fail for the fifth. The package ships one small stylesheet of its own instead, with its own class names over the game's measurements, and injects it into the page and into any shadow root it enters.

## Consequences

The package skeleton has to be able to inject the stylesheet into a shadow root, not only into the page.

Nothing breaks when the game renames a utility class, which is the part of the game's markup most likely to change under us.

The cost is writing perhaps thirty lines of CSS that could have been borrowed.

Settled on [issue #6](https://github.com/DeLoWaN/openfront-extended-ui/issues/6).
