# The package changes your view, never the game

An **intent** is the message the client sends when a player acts. An attack, an alliance request and an alliance renewal are each one intent. The game runs its whole simulation on every client, so an intent is the only thing a player sends that the other players ever see.

The **alliance panel** is the first feature that could send one. It lists your alliances with the time each one has left. The game lets the two partners renew an alliance during its last 30 seconds, which is the **renewal window**. A renew button in the panel would have turned two clicks into one.

## The rule

The package may change what you see. It never sends an intent.

A camera move is allowed. It changes your own screen, it reaches no other player, and the game offers the same move itself from its own panels.

## What it decided

The alliance panel carries **no renew button**. A click on a name moves the camera to that player, and the renewal itself stays in the game's own menu.

Three ways to build the button were looked at. The order matters, because the one that works best is the one the rule forbids.

**Drive the game's own prompt.** The game puts a renewal prompt in its events display, with a renew button inside it. A script can click that button. The prompt appears once per renewal window and disappears as soon as the player answers it, so our button would be dead most of the time. It also repeats, during the one half minute when it works, something the game already offers in three places.

**Capture the event class at run time.** The game's event bus stores its listeners in a map whose keys are the event classes, so the class can be read back from a live match. The name is gone on the live site. The game is bundled by Vite and minified by esbuild, which renames classes, so `SendAllianceExtensionIntentEvent` ships as a one-letter name. The lookup works on the development server and fails on openfront.io, which is the worst shape a bug can take: every local test passes.

**Send the intent ourselves.** This is the one that works, and it is the one that breaks the rule. The server never checks the renewal window. It accepts a renewal from any living player in any living alliance, and the half-agreement it stores never expires. A player with our script could therefore agree to renew at a moment no other player can reach.

## Consequences

Every feature may read the game and may move the camera. Nothing else is open. A feature that wants to act has to send the player to the game's own control instead.

The package stays a thing a player can run beside the game without a conversation about fairness. That is worth more than a saved click.

The rule is wider than the one case that produced it. The attack cost estimate, which the map at [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1) keeps out of scope, is advice rather than an action and is refused for a different reason. This rule refuses the actions.

Settled on [issue #10](https://github.com/DeLoWaN/openfront-extended-ui/issues/10). The mechanisms were read in the game's source at commit `332e5410e`.
