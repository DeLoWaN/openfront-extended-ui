# Events and intents

This file explains how a script learns what happens in a match. It covers the updates that the game produces on each tick, the game's event bus, key and cursor input, the updates about gold and alliances, and the intents that a player sends. Read it before you write a feature that reacts to game events. [access.md](access.md) explains how to reach the game state and how to run code on each tick.

## Tick updates

### Read a tick's updates with `updatesSinceLastTick()`

A tick is one step of the game simulation, 10 per second by default ([access.md](access.md)). An update is a record of one change in the simulation, such as a unit that moved or a gold gain. `game.updatesSinceLastTick()` on the `GameView`, the page's read-only copy of the game state, returns the updates of the last tick, grouped by kind. Every kind is present as an array, possibly empty, and each list keeps execution order; the value is null before the first tick.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:225`, `src/core/game/GameImpl.ts:254`, `src/core/game/GameImpl.ts:488`, `src/core/game/GameImpl.ts:1353`
- Used in: `src/game/types.ts:174`
- Found in: #2

### The same updates come back until the next tick

`updatesSinceLastTick()` returns the same object until the next tick replaces it. Read it only inside the tick hook, or skip a value for a `game.ticks()` that you already saw. Otherwise the script handles one update many times.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:225-226`, `src/client/view/GameView.ts:288`
- Found in: #4

### Identify update lists by their fields

The update object is keyed by `GameUpdateType`, a numeric enum that the page does not expose. Its numbers follow source order, so a new upstream entry shifts them with no error. At `332e5410e`, `Unit` is 1, `Player` 2, `DisplayEvent` 3, `Win` 12, `BonusEvent` 15, `ConquestEvent` 19 and `DonateEvent` 23. The project code saw `AllianceRequest` at 5, at a commit that it does not name.

Identify a list by the fields of its entries instead:

- `player`, `tile` and `gold`: a bonus event
- `conquerorId`: a conquest event
- `donationType`: a donation event
- `unitType` and `ownerID`: a unit update

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:80-106`
- Used in: `src/features/alliance-panel/updates.ts:33-39`, `src/features/alliance-panel/updates.test.ts:8-10`
- Found in: #1, #2, #4, #15, #17

### Gold, troops and tiles travel in a packed array

`PlayerUpdate.gold` is present only in the first update of a player. Later values travel in a separate number array, with four numbers per player: smallID, tiles owned, gold and troops. The smallID is the small numeric id of a player. `GameView` writes these numbers straight into the player state ([economy.md](economy.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:36`, `src/core/game/GameUpdates.ts:239`, `src/core/game/PlayerImpl.ts:202`, `src/client/view/GameView.ts:429-438`
- Found in: #2

### Unit updates and unit deletion

A unit update carries `unitType`, `ownerID` (the owner's smallID), `pos` and `targetUnitId`. A trade ship's update also carries `lastOwnerID`, and a new owner means a capture. When the game deletes a unit, it always sends a unit update with `isActive` false.

- Checked at: `332e5410e`
- Game source: `src/core/game/UnitImpl.ts:126-157`, `src/core/game/UnitImpl.ts:307`, `src/core/game/Game.ts:187`, `src/core/game/GameUpdates.ts:176` (path unconfirmed)
- Found in: #2, #11, #15, #19

## The event bus

### One bus for the whole page

The event bus is the game's message channel inside the page. One part of the game emits an event object, and the listeners for its class receive it. `<control-panel>.eventBus` is one object for the whole page, shared by every match. `emit` finds listeners by `event.constructor`, `on` stores callbacks per event class, and `off` removes a callback only when it gets the same function object.

There is no call that removes all listeners. The bus catches no errors, so wrap every listener in `try`/`catch` ([access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/core/EventBus.ts:21-43`
- Used in: `src/game/types.ts:274-277`
- Found in: #1, #2, #4, #10, #12

### Event classes are out of reach

To listen for an event or to emit one, a script needs the event class, and the page does not expose it. So a script cannot emit `AlternateViewEvent` or `SendAllianceExtensionIntentEvent`. A wrapper on `EventBus.emit` sees every event, for example `TickMetricsEvent`, which arrives once per tick right after the renderer ticks. On the dev server, a script can read the classes by name from the listener map of the bus; production renames them, for example to `class s`.

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/client/ClientGameRunner.ts:880`, `src/client/InputHandler.ts:192`, `src/client/Transport.ts:68`
- Found in: #2, #4, #10, #12

### Remove your listeners when the script detaches

The game itself leaves its listeners on the bus across matches. `Transport` adds about thirty listeners in its constructor, and each match makes a new `Transport`. `ControlPanel.init()` adds one more, and the game removes none of these; only `SoundManager.dispose()` and `PerformanceOverlay` remove theirs. A script must keep each callback and call `off` with it when the script detaches.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:219-288`, `src/client/hud/layers/ControlPanel.ts:80`, `src/client/sound/SoundManager.ts:64-71`, `src/client/hud/layers/PerformanceOverlay.ts:494-498`
- Found in: #4

## Key and cursor input

### Listen for keys and the cursor on `window`

The event bus does not give raw key or cursor events to a script. Listen on `window` for `keydown`, `keyup` and `mousemove`. The game ignores its key binds while a text input has focus. A script key should do the same, or it fires while the player types in the chat.

- Checked at: unknown
- Found in: #13, #18

### The map moves under a still cursor

A wheel zoom, a drag and the smooth motion of the camera all move the map with no `mousemove` event. Read the tile under the last cursor position again on every frame, not only on mouse events.

- Checked at: `332e5410e`
- Found in: #14, #18

## Gold updates

### Every gold gain has an event

`addGold` is the only method that raises the gold of a player. The game calls it in these places:

- flat income on each tick: no event, and the config gives the amount ([economy.md](economy.md))
- a captured trade ship: a `BonusEvent` and a display message
- a trade arrival: one `BonusEvent` for the owner of the source port, and one for the owner of the destination port
- a train stop: one `BonusEvent` for the station owner, and one for the train owner
- the elimination of a player: a `ConquestEvent`
- a received donation: a `DonateEvent`

So every gain except the flat income has an event that names the receiver and the exact amount.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PlayerExecution.ts:89`, `src/core/execution/TradeShipExecution.ts:181`, `src/core/execution/TradeShipExecution.ts:197-198`, `src/core/game/TrainStation.ts:32`, `src/core/game/TrainStation.ts:35`, `src/core/game/GameImpl.ts:1319`, `src/core/game/PlayerImpl.ts:1050`
- Found in: #2, #8

### `BonusEvent`: a gold gain at a tile

`addGold(amount, tile)` sends a `BonusEvent` only when it gets a tile. The event has the fields `player` (a string id), `tile`, `gold` (an exact `number`) and `troops` (always 0). The control panel reads it for the green "+" label above the gold box.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:133`, `src/core/game/PlayerImpl.ts:1182-1193`, `src/client/hud/layers/ControlPanel.ts:141`
- Found in: #2

### `ConquestEvent`: gold from an elimination

A `ConquestEvent` has the fields `conquerorId`, `conqueredId` and `gold`, a `bigint`. `gold` is `goldCaptured`, the amount that the conqueror really receives.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:161`, `src/core/game/GameImpl.ts:1343`, `src/core/game/GameImpl.ts:1347`
- Found in: #2

### `DonateEvent`: a troop or gold donation

A `DonateEvent` has the fields `donationType` (`"troops"` or `"gold"`), `senderId`, `recipientId` and `amount`, a `bigint`.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:168`, `src/core/game/PlayerImpl.ts:1053`
- Found in: #2

### Do not use `DisplayEvent.goldAmount` for a conquest

`DisplayEvent` is an entry of the game's text feed, and it has an optional `goldAmount`. Only the message for a captured ship and the conquest message set it. The conquest message gives the amount that the victim loses, not the amount that the conqueror gets, so for a human victim it is twice the real gain. Use `ConquestEvent` instead.

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:316`, `src/core/execution/TradeShipExecution.ts:186`, `src/core/game/GameImpl.ts:1313`
- Found in: #2

### No update reports spent gold

No update reports gold that leaves a player. Gold leaves in these cases:

- a unit build
- a structure upgrade
- a donation
- the loss of the treasury to a conqueror
- death

A script must rebuild what a player spent from unit updates and the config prices. A difference of two `gold()` values gives only the net change.

- Checked at: `332e5410e`
- Game source: `src/core/game/PlayerImpl.ts:1048`, `src/core/game/PlayerImpl.ts:1253`, `src/core/game/PlayerImpl.ts:1336`, `src/core/game/GameImpl.ts:1320`, `src/core/execution/PlayerExecution.ts:433`, `src/core/configuration/Config.ts:356`
- Found in: #2, #8

### Tell a trade arrival, a captured ship and a train stop apart

A trade arrival gives three updates in one tick, in this order:

1. A "Trade Ship" unit update with `isActive` false. Its `pos` is the tile of the destination port.
2. A `BonusEvent` for the source side. Its `player` is the owner of the ship.
3. A `BonusEvent` for the destination side. Its `tile` equals the `pos` of the ship.

Two bonus events mean a normal trade, and one means a captured ship. A train stop has no unit update. At a station of another player, the game pays the station owner first and then the train owner, with the same amount and the same tile.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:173-198`, `src/core/execution/TrainExecution.ts:167`, `src/core/execution/TrainExecution.ts:264`, `src/core/game/TrainStation.ts:31-35`
- Found in: #2, #11, #15, #19

### What a script cannot recover about gold

The updates leave these gaps:

- The payout of a trade ship at sea needs `tilesTraveled`, a counter inside the worker. A script can only estimate it from the motion plans.
- A train payout does not name the train.
- When two trains stop at one tile in one tick, the split between station and train is not clear. The total is still exact.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:158`, `src/client/view/GameView.ts:229`
- Found in: #2

### Per-player stats arrive only at the end

The simulation keeps a stats record for each player, with six gold buckets:

- `GOLD_INDEX_WORK`
- `GOLD_INDEX_WAR`
- `GOLD_INDEX_TRADE`
- `GOLD_INDEX_STEAL`
- `GOLD_INDEX_TRAIN_SELF`
- `GOLD_INDEX_TRAIN_OTHER`

`PlayerUpdate` copies only `killedBy` and `deathPosition` from this record, and `GameView` has no `stats()` method. Only players with a client id have stats, so Bots and Nations have none. At game end, `WinUpdate.allPlayersStats` carries the full `PlayerStats` of each human, keyed by client id ([testing.md](testing.md)).

- Checked at: `332e5410e`
- Game source: `src/core/StatsSchemas.ts:82-87`, `src/core/StatsSchemas.ts:125`, `src/core/game/StatsImpl.ts:73`, `src/core/game/StatsImpl.ts:127`, `src/core/game/PlayerImpl.ts:319-334`, `src/core/game/GameUpdates.ts:335`, `src/core/Schemas.ts:430`
- Found in: #2, #8

## Alliance updates

### Expiry and break are separate update kinds

`AllianceExpiredUpdate` and `BrokeAllianceUpdate` are two different update kinds. So an alliance that ends on time never looks like a betrayal ([alliances.md](alliances.md)).

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ActionableEvents.ts:281`
- Found in: #1

### Track alliance renewals tick by tick

A renewal extends an alliance when both partners agree. An agreement from one side shows only in the `AllianceExtension` updates of the tick where it arrives, so a script that starts late misses earlier agreements. The agreement of the second partner completes the renewal in the same tick in which the end tick moves. So an agreement that arrives with a new end tick is a completed renewal.

- Checked at: `332e5410e`
- Found in: #1

## Intents

### Intents and the alliance renewal event

An intent is an action message that the client sends to the game server. `src/core/Schemas.ts` defines `EmbargoIntent` and `EmbargoAllIntent`, among others. To renew an alliance, the game emits the bus event `SendAllianceExtensionIntentEvent(other)` from `ActionableEvents.ts`. A script cannot emit it, because the event class is out of reach.

- Checked at: unknown
- Game source: `src/core/Schemas.ts`, `src/client/hud/layers/ActionableEvents.ts:185` (path unconfirmed)
- Found in: #10, #11
