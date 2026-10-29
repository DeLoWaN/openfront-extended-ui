# Alliances

This file covers how a script reads the alliances of any player, how long an alliance lasts, and how its renewal works. The terms alliance, alliance request, renewal window, expired alliance and broken alliance are those of `CONTEXT.md`. Read this file before you write a feature that shows or tracks alliances.

## Alliance data on the page

### Every player's alliances reach the page

`PlayerView.alliances()` returns a list of `AllianceView` objects for every player, as `{ id, other, createdAt, expiresAt, hasExtensionRequest }`. A `PlayerView` is the game's object for one player.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:261`, `src/client/view/PlayerView.ts:462`, `src/client/view/PlayerView.ts:547`
- Used in: `src/game/types.ts:29-46`, `src/game/types.ts:86-87`, `src/game/types.ts:96-97`
- Found in: #10, #14

### `allies()` leaves teammates out

`allies()` returns the alliance partners only, and team membership is the separate `isFriendly()` relation. In a team game, teammates share shades of one team colour.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:496`, `src/client/theme/ThemeProvider.ts:143-147`
- Used in: `src/game/types.ts:92-93`
- Found in: #1, #13, #37

### Every player's alliance requests reach the page

`toFullUpdate()` sends the alliance requests of each player to the page, with no test for the local player. So a script can see a request between two other players. The game draws a request only for the two players in it.

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:228-234`
- Found in: #1, #13

### An expired alliance and a broken alliance send different updates

An alliance that ends leaves `alliances()` at once. For an expired alliance, the page gets an `AllianceExpiredUpdate` that names both players. For a broken alliance, it gets a `BrokeAllianceUpdate` that names the traitor and the betrayed player (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:282`, `src/core/game/GameUpdates.ts:289`, `src/client/hud/layers/ActionableEvents.ts:281`
- Found in: #1, #10

## Durations and the renewal window

### An alliance runs 3000 ticks by default, with a renewal window of 300 ticks

`allianceDuration()` returns 3000 ticks by default, which is 5 minutes at the default tick rate (see [access.md](access.md)). `allianceExtensionPromptOffset()` returns 300 ticks, the length of the renewal window.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:608`, `src/core/configuration/Config.ts:1076`
- Used in: `src/game/types.ts:134-135`, `src/game/types.ts:138-139`
- Found in: #10, #13, #14

### An alliance request waits 200 ticks

`allianceRequestDuration()` returns 200 ticks, which is 20 seconds at the default tick rate.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:602`
- Used in: `src/game/types.ts:136-137`
- Found in: #1, #10

### The game's alliance countdown assumes 10 ticks per second

The game turns alliance ticks into seconds with a fixed division by 10. So its countdown is wrong at any singleplayer speed setting other than normal (see [access.md](access.md)).

- Checked at: unknown
- Game source: `src/client/hud/layers/PlayerPanel.ts:150`
- Used in: `src/features/alliance-view/alliance.ts:15-23`

### `hasExtensionRequest` means "inside the renewal window"

The name `hasExtensionRequest` suggests that a player asked to renew, but it does not mean that. The game computes it as `expiresAt <= now + allianceExtensionPromptOffset()`. So it is true for every alliance in its renewal window, and it says nothing about a request.

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:258`, `src/core/game/GameUpdates.ts:266`
- Found in: #1, #10, #17

### Nations form alliances late

A Nation is a country that the computer plays. Nations need hundreds of ticks before they form alliances. So a test early in a match sees no alliance between Nations.

- Checked at: live game, 2026-08-25
- Game source: none, seen in a match
- Found in: #13, #14

## Renewal

### A renewal agreement reaches the page once

No player field holds the state "one side agreed to renew". Each agreement reaches the page once, as an `AllianceExtension` update that names the player and the alliance. So a script that starts in the middle of a renewal window misses the earlier agreements.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:295`
- Found in: #1, #10, #17

### The second agreement completes the renewal

When the second player agrees, `AllianceImpl.extend()` clears both agreements in the same tick that it moves the end tick. So an agreement that arrives with a new end tick completes the renewal. It does not start a new one.

- Checked at: `332e5410e`
- Game source: `src/core/game/AllianceImpl.ts:82`, `src/core/game/GameUpdates.ts:295`
- Found in: #1, #10, #17

### The server does not check the renewal window

`AllianceExtensionExecution` accepts a renewal from any player who is alive, in any alliance that still runs, at any time. The agreement of one side that it stores never expires. On the page, the client sends a renewal with `SendAllianceExtensionIntentEvent`. A script cannot get that event class by name on openfront.io, because the production build renames classes (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/execution/alliance/AllianceExtensionExecution.ts`, `src/client/Transport.ts:68`, `src/client/Transport.ts:225-226`
- Found in: #1, #10

### The renewal prompt shows once per alliance

In the renewal window, the events display shows a renewal prompt once per alliance, with a button to renew. The game removes the prompt as soon as the player clicks any of its three buttons, "ignore" too. After the player agrees to a renewal, the game stops the offer to that player.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/EventsDisplay.ts`
- Found in: #1, #10, #14

## Where the game shows alliances

### The game shows alliance time only for the local player's alliances

The game builds the alliance data for every player, but it shows the time left only for alliances that the local player is in.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:394`
- Used in: `src/features/alliance-view/alliance.ts:152-154`
- Found in: #1, #10, #14

### Three more places show alliance time

The game shows the time left of the local player's alliances in these places:

- The alliance icon beside each partner's name on the map. Its brightness drops as the alliance runs out, and it flashes in the renewal window (see [rendering.md](rendering.md)).
- The renewal prompt in the events display.
- The hover overlay, which reads `myPlayer.alliances().find(...)`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:394`, `src/client/hud/layers/EventsDisplay.ts`
- Found in: #1, #10, #14

### The player panel shows alliance time as text

The player panel shows the time left as text such as "2min 7s". The text is green above one minute and yellow below. The panel shows it only for the alliance between the local player and the clicked player.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:147-150`, `src/client/hud/layers/PlayerPanel.ts:420`
- Found in: #1, #10, #14

### The player panel lists any player's partners

`<player-panel>` lists the alliance partners of any player by name, with a count, sorted by name.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:653`
- Found in: #1, #10, #14
