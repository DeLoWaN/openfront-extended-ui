# Events and intents

This file explains how a script learns what happens in a match. It covers the updates of each tick and the game's event bus. It also covers key and cursor input, gold updates, and the intents that a player sends. A tick is one step of the game simulation ([access.md](access.md)). `game` is the `GameView`, the page's read-only copy of the game state. Read this file before you write a feature that reacts to game events. [alliances.md](alliances.md) covers the alliance updates.

## Tick updates

### `updatesSinceLastTick()` groups the last tick's updates by kind

An update is a record of one change in the simulation, such as a unit move or a gold gain. `game.updatesSinceLastTick()` returns the updates of the last tick, grouped by kind. Every kind is present as an array, possibly empty, and each list keeps execution order.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:225`, `src/core/game/GameImpl.ts:254`, `src/core/game/GameImpl.ts:488`, `src/core/game/GameImpl.ts:1353`
- Used in: `src/game/types.ts:174-175`
- Found in: #2

### The same updates come back until the next tick

`updatesSinceLastTick()` returns the same object until the next tick replaces it. So two reads in one tick return the same updates.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:225-226`, `src/client/view/GameView.ts:288`
- Found in: #4

### The numbers of the update kinds move between versions

The game keys the update lists by `GameUpdateType`, a numeric enum whose numbers move when the game adds a kind. At `332e5410e`, `Unit` is 1, `Player` 2, `DisplayEvent` 3, `Win` 12, `BonusEvent` 15, `ConquestEvent` 19 and `DonateEvent` 23.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:80-106`
- Used in: `src/game/types.ts:142-149`, `src/features/alliance-panel/updates.test.ts:8-10`
- Found in: #1, #2, #4, #15, #17

### Entry fields tell the update lists apart

These fields of an entry name the kind of its list:

- `player`, `tile` and `gold`: a bonus event
- `conquerorId`: a conquest event
- `donationType`: a donation event

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:133`, `src/core/game/GameUpdates.ts:161`, `src/core/game/GameUpdates.ts:168`
- Used in: `src/features/alliance-panel/updates.ts:34-40`
- Found in: #1, #2, #4, #15, #17

### Gold, troops and tiles travel in a packed array

`PlayerUpdate.gold` is present only in the first update of a player. Later values travel in a separate number array, with four numbers per player: smallID, tiles owned, gold and troops. The smallID is the small numeric id of a player. `GameView` writes these numbers straight into the player state ([economy.md](economy.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:36`, `src/core/game/GameUpdates.ts:239`, `src/core/game/PlayerImpl.ts:202`, `src/client/view/GameView.ts:429-438`
- Found in: #2

### A deleted unit sends a last update with `isActive` false

A unit update carries `unitType`, `ownerID` (the owner's smallID), `pos` and `targetUnitId`. A trade ship's update also carries `lastOwnerID`, and a new owner means a capture. When the game deletes a unit, it always sends a unit update with `isActive` false.

- Checked at: `332e5410e`
- Game source: `src/core/game/UnitImpl.ts:126-157`, `src/core/game/UnitImpl.ts:307`, `src/core/game/Game.ts:187`, `src/core/game/GameUpdates.ts:176-186`
- Found in: #2, #11, #15, #19

## The event bus

### One event bus serves the whole page

The event bus is the game's message channel inside the page. `emit` finds listeners by `event.constructor`, and `on` stores callbacks per event class. The bus catches no errors ([access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/core/EventBus.ts:21-43`
- Used in: `src/game/types.ts:273-282`
- Found in: #1, #2, #4, #10, #12

### A script cannot get the event classes

The page does not expose the event classes, so a script cannot listen for or emit `AlternateViewEvent` or `SendAllianceExtensionIntentEvent`. A wrapper on `EventBus.emit` sees every event, for example `TickMetricsEvent`, which arrives once per tick right after the renderer ticks. On the dev server, the listener map of the bus shows the classes by name. Production renames them ([access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/client/ClientGameRunner.ts:880`, `src/client/InputHandler.ts:192`, `src/client/Transport.ts:68`
- Found in: #2, #4, #10, #12

### The game keeps most of its bus listeners across matches

`Transport` adds about thirty listeners in its constructor, and each match makes a new `Transport`. `ControlPanel.init()` adds one more, and the game never removes these. Only `SoundManager.dispose()` and `PerformanceOverlay` remove their own listeners.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:219-288`, `src/client/hud/layers/ControlPanel.ts:80`, `src/client/sound/SoundManager.ts:64-71`, `src/client/hud/layers/PerformanceOverlay.ts:494-498`
- Found in: #4

## Key and cursor input

### Key and cursor events reach a script only on `window`

The event bus does not pass raw key or cursor events to a script, but `window` receives `keydown`, `keyup` and `mousemove`. The game ignores its key binds while a text field has focus, but a range slider does not count as a text field.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:576-580`, `src/client/InputHandler.ts:1152-1165`
- Used in: `src/features/alliance-view/index.ts:443-452`
- Found in: #13, #18

### The map moves under a still cursor

A wheel zoom, a drag and the camera's own moves to a target all shift the map with no `mousemove` event.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:887`, `src/client/InputHandler.ts:972`, `src/client/TransformHandler.ts:241-276`
- Used in: `src/features/alliance-view/index.ts:113-117`
- Found in: #1, #14, #18

## Gold updates

### Every gold gain except the flat income has an event

`addGold` is the only method that raises the gold of a player. Every gain except the flat income on each tick has an event that names the receiver and the exact amount. The config gives the flat income ([economy.md](economy.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:1182-1193`, `src/core/execution/PlayerExecution.ts:89`
- Found in: #2, #8

### Each kind of gold gain has its own event

- A captured trade ship gives a `BonusEvent` and a display message.
- A trade arrival or a train stop gives two `BonusEvent`s, one for each side.
- The elimination of a player gives a `ConquestEvent`.
- A received donation gives a `DonateEvent`.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:181`, `src/core/execution/TradeShipExecution.ts:197-198`, `src/core/game/TrainStation.ts:32`, `src/core/game/TrainStation.ts:35`, `src/core/game/GameImpl.ts:1319`, `src/core/game/PlayerImpl.ts:1050`
- Found in: #2, #8

### `BonusEvent` comes only when `addGold` gets a tile

`addGold(amount, tile)` sends a `BonusEvent` only when it gets a tile. The event has the fields `player` (a string id), `tile`, `gold` (an exact `number`) and `troops` (always 0). The control panel reads it for the green "+" label above the gold box.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:133`, `src/core/game/PlayerImpl.ts:1182-1193`, `src/client/hud/layers/ControlPanel.ts:141`
- Found in: #2

### `ConquestEvent.gold` is what the conqueror receives

A `ConquestEvent` has the fields `conquerorId`, `conqueredId` and `gold`, a `bigint`. `gold` is `goldCaptured`, the amount that the conqueror really receives.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:161`, `src/core/game/GameImpl.ts:1343`, `src/core/game/GameImpl.ts:1347`
- Found in: #2

### `DonateEvent` carries a troop or gold donation

A `DonateEvent` has the fields `donationType` (`"troops"` or `"gold"`), `senderId`, `recipientId` and `amount`, a `bigint`.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:168`, `src/core/game/PlayerImpl.ts:1053`
- Found in: #2

### `DisplayEvent.goldAmount` for a conquest is the loss of the victim

`DisplayEvent` is an entry of the game's text feed, and it has an optional `goldAmount`. Only the message for a captured ship and the conquest message set it. The conquest message gives the amount that the victim loses, not the amount that the conqueror gets. For a human victim, that amount is twice the real gain.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:316`, `src/core/execution/TradeShipExecution.ts:186`, `src/core/game/GameImpl.ts:1313`
- Found in: #2

### No update reports spent gold

No update reports gold that leaves a player, which happens in these cases:

- a unit build or a structure upgrade
- a donation
- the loss of the treasury to a conqueror, or death

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:1048`, `src/core/game/PlayerImpl.ts:1253`, `src/core/game/PlayerImpl.ts:1336`, `src/core/game/GameImpl.ts:1320`, `src/core/execution/PlayerExecution.ts:433`
- Found in: #2, #8

### A trade arrival gives three updates in one tick

A trade arrival gives these updates, in this order:

1. A "Trade Ship" unit update with `isActive` false, whose `pos` is the tile of the destination port.
2. A `BonusEvent` for the source side, whose `player` is the owner of the ship.
3. A `BonusEvent` for the destination side, whose `tile` equals the `pos` of the ship.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:173-198`
- Found in: #2, #11, #15, #19

### One bonus event means a captured ship

Two bonus events mean a normal trade, and one means a captured ship. A train stop has no unit update. At a station of another player, the game pays the station owner first and then the train owner. Both get the same amount at the same tile.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:173-198`, `src/core/execution/TrainExecution.ts:167`, `src/core/execution/TrainExecution.ts:264`, `src/core/game/TrainStation.ts:31-35`
- Found in: #2, #11, #15, #19

### Some gold payouts cannot be rebuilt exactly

The updates leave these gaps:

- A script can only estimate the payout of a trade ship at sea, because the payout needs `tilesTraveled`, a counter inside the worker.
- A train payout does not name the train.
- When two trains stop at one tile in one tick, the split between station and train is unclear, but the total is exact.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:158`, `src/client/view/GameView.ts:229`
- Found in: #2

### Per-player stats arrive only at the end

The simulation keeps a stats record for each player, with six gold buckets, the `GOLD_INDEX_*` constants of `StatsSchemas.ts`. `PlayerUpdate` copies only `killedBy` and `deathPosition` from this record, and `GameView` has no `stats()` method. Only players with a client id have stats, so Bots and Nations have none. At game end, `WinUpdate.allPlayersStats` carries the full `PlayerStats` of each human, keyed by client id ([testing.md](testing.md)).

- Checked at: `332e5410e`
- Game source: `src/core/StatsSchemas.ts:82-87`, `src/core/StatsSchemas.ts:125`, `src/core/game/StatsImpl.ts:73`, `src/core/game/StatsImpl.ts:127`, `src/core/game/PlayerImpl.ts:319-334`, `src/core/game/GameUpdates.ts:335`, `src/core/Schemas.ts:430`
- Found in: #2, #8

## Intents

### The game renews an alliance through a bus event

An intent is an action message that the client sends to the game server. `src/core/Schemas.ts` defines the intents, such as `EmbargoIntent` and `EmbargoAllIntent`. To renew an alliance, `ActionableEvents.ts` emits the bus event `SendAllianceExtensionIntentEvent(other)`. A script cannot emit it, because the event class is out of reach.

- Checked at: `332e5410e`
- Game source: `src/core/Schemas.ts:46-50`, `src/client/hud/layers/ActionableEvents.ts:185`, `src/client/Transport.ts:225`
- Found in: #10, #11
