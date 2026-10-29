# Alliances

This file covers how a script reads the alliances of any player, how long an alliance lasts, and how its renewal works. An alliance is a pact between two players that ends after a fixed time unless both players renew it. Read this file before you write a feature that shows or tracks alliances.

## Alliance data on the page

### Every player's alliances reach the page

`PlayerView.alliances()` returns a list of `AllianceView` objects for every player, not only for the local player. A `PlayerView` is the game's object for one player. Each `AllianceView` is `{ id, other, createdAt, expiresAt, hasExtensionRequest }`. `other` is the partner's `PlayerID`, which `PlayerView.id()` returns, and not the partner's `smallID`; `id` stays the same across renewals, and `expiresAt` is the end tick, which a renewal moves later.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:261`, `src/client/view/PlayerView.ts:462`, `src/client/view/PlayerView.ts:547`
- Used in: `src/game/types.ts:30`, `src/game/types.ts:86`, `src/game/types.ts:96`
- Found in: #10, #14

### Teammates are not alliance partners

A team and an alliance are two separate relations in the game. `allies()` returns the alliance partners only and leaves teammates out. Team membership is the separate `isFriendly()` relation. In a team game, teammates share shades of one team colour.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:496`, `src/client/theme/ThemeProvider.ts:143-147`
- Used in: `src/game/types.ts:92`
- Found in: #1, #13, #37

### Every player's alliance requests reach the page

An alliance request is the offer of one player to another to form an alliance. `toFullUpdate()` sends the alliance requests that each player sent to the page, with no test for the local player. So a script can see a request between two other players. The game draws a request only for the two players in it.

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:228-234`
- Found in: #1, #13

### Updates when an alliance ends

An alliance that ends leaves `alliances()` at once. For an expiry, the page gets an `AllianceExpiredUpdate` that names both players. For a betrayal, it gets a `BrokeAllianceUpdate` that names the traitor and the betrayed player. These are two separate update kinds, so a script never confuses an expiry with a betrayal (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:282`, `src/core/game/GameUpdates.ts:289`, `src/client/hud/layers/ActionableEvents.ts:281`
- Found in: #1, #10

## Durations and the renewal window

### Alliance duration and renewal window

`allianceDuration()` gives how long a new or renewed alliance runs: 3000 ticks, which is 5 minutes at 10 ticks per second. A tick is one step of the game simulation. `allianceExtensionPromptOffset()` gives 300 ticks, the last 30 seconds of the alliance. This last part is the renewal window, where the game offers the players to renew.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:608`, `src/core/configuration/Config.ts:1076`
- Used in: `src/game/types.ts:134`, `src/game/types.ts:138`
- Found in: #10, #13, #14

### Alliance requests expire after 20 seconds

`allianceRequestDuration()` gives how long an alliance request waits for an answer, in ticks. After 20 seconds with no answer, the request refuses itself.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:602`
- Used in: `src/game/types.ts:136`
- Found in: #1, #10

### The game's countdown assumes 10 ticks per second

The game turns alliance ticks into seconds with a fixed division by 10. A singleplayer game has a speed setting. When that setting is not normal, the game's alliance countdown is wrong.

- Checked at: unknown
- Game source: `src/client/hud/layers/PlayerPanel.ts:150`
- Used in: `src/features/alliance-view/alliance.ts:15-21`

### `hasExtensionRequest` means "inside the renewal window"

The name `hasExtensionRequest` suggests that a player asked to renew, but it does not mean that. The game computes it as `expiresAt <= now + allianceExtensionPromptOffset()`. So it is true for every alliance in its renewal window, and it says nothing about a request.

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:258`, `src/core/game/GameUpdates.ts:266`
- Found in: #1, #10, #17

### Nations form alliances late

A Nation is a country that the computer plays. Nations need hundreds of ticks before they form alliances. So a test early in a match sees no alliance between Nations.

- Checked at: `332e5410e`
- Found in: #13, #14

## Renewal

### A renewal agreement arrives once

No player field holds the state "one side agreed to renew". Each agreement reaches the page once, as an `AllianceExtension` update that names the player and the alliance, so a script that starts in the middle of a renewal window misses the earlier agreements. When the second player agrees, `AllianceImpl.extend()` clears both halves in the same tick that it moves the end tick. So an agreement that arrives with a new end tick completes the renewal, and is not a new half.

- Checked at: `332e5410e`
- Game source: `src/core/game/AllianceImpl.ts:82`, `src/core/game/GameUpdates.ts:295`
- Found in: #1, #10, #17

### The server does not check the renewal window

`AllianceExtensionExecution` accepts a renewal from any player who is alive, in any alliance that still runs, at any time. The half agreement that it stores never expires. On the page, the client sends a renewal with `SendAllianceExtensionIntentEvent`. A script cannot get that event class by name on openfront.io, because the production build renames classes (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/execution/alliance/AllianceExtensionExecution.ts`, `src/client/Transport.ts:68`, `src/client/Transport.ts:225-226`
- Found in: #1, #10

### The renewal prompt

In the renewal window, the events display shows a renewal prompt once per alliance, with a button to renew. The game removes the prompt as soon as the player clicks any of its three buttons, "ignore" too. After the player agrees to a renewal, the game stops the offer to that player.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/EventsDisplay.ts`
- Found in: #1, #10, #14

## Where the game shows alliances

### The game shows alliance time only for the local player's alliances

The game builds the alliance list for every player, but it shows the time left only for alliances that the local player is in. It shows that time in these places:

- The alliance icon beside each ally's name on the map. Its brightness drops as the alliance runs out, and it flashes in the renewal window (see [rendering.md](rendering.md)).
- The renewal prompt in the events display.
- The hover overlay. `PlayerInfoOverlay.ts:394` reads `myPlayer.alliances().find(...)`.
- The player panel, as text such as "2min 7s", green above one minute and yellow below. The panel shows it only for the alliance between the local player and the clicked player.

A script that shows the time of other players' alliances adds something that the game does not draw.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:394`, `src/client/hud/layers/PlayerPanel.ts:653`, `src/client/hud/layers/EventsDisplay.ts`
- Used in: `src/features/alliance-view/alliance.ts:152-154`
- Found in: #1, #10, #14

### The player panel lists any player's partners

`<player-panel>` lists the alliance partners of any player by name, with a count, sorted by name.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:653`
- Found in: #1, #10, #14
