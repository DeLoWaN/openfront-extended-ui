# Troops, gold and units

This file covers how the game counts troops and gold, what units cost and how trade pays. It also covers the hotbar and the game's keybinds. Read it before you write a feature that shows or computes troops, gold, prices or keys.

## Troops

### Regeneration depends on the player type

`troopIncreaseRate(player)` gives the troops a player gains in one tick (see [access.md](access.md)). A human player gets the base rate, and a bot gets half. A Nation, a country that the computer plays, gets a factor from the difficulty.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`, `src/core/configuration/Config.ts:883-903`
- Used in: `src/features/troop-bar/regeneration.ts:13-23`
- Found in: #6, #20

### The regeneration curve peaks near 42% full

Without the constant 10 in the formula, the curve peaks at `0.73 / 1.73`, the 42.2% level (see `CONTEXT.md`). With the 10, the peak depends on the troop count. It is 41.52% full at 5,000 troops, 42.17% full at 500,000 troops and 42.12% full at 1,000,000 troops.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Used in: `src/features/troop-bar/regeneration.ts:4-6`
- Found in: #1, #6, #20

### The share of best rate stays high near the peak

Each item gives the troop fill, as a share of max troops, where the share of best rate (see `CONTEXT.md`) reaches a value:

- 99% of the best rate or more: 36.9% to 47.5% full
- 90% of the best rate or more: 26.0% to 59.5% full

Rounded to a whole percent, the share reads 100% from 38.4% to 45.9% full.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Found in: #1, #6, #20, #21

### The plateau runs from 30.6% to 54.3% full

The plateau (see `CONTEXT.md`) runs precisely from 30.560% to 54.290% full, with its midpoint at 42.45%. Across 5,000 to 500,000 troops, the plateau and the ranges of the previous fact move by 3 points at most.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Used in: `src/features/troop-bar/regeneration.ts:116-121`
- Found in: #1, #6, #20, #21

### The regeneration curve falls faster below the peak

Each item gives how many times slower regeneration is than at the peak, at a distance below and above the peak:

- 20 points off: x1.19 below, x1.15 above
- 30 points off: x1.62 below, x1.41 above
- 40 points off: x4.99 below, x2.00 above

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Found in: #1, #6, #20, #21

### The share of best rate falls to 30% at 90% full

Ten points below the peak, the share of best rate is 96.3%, and ten points above the peak it is 96.6%. At 80% full the share is 55.1%, at 90% full it is 30%, and at 100% full it is 0.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Found in: #1, #6, #20, #21

### Committed troops leave your troops at launch

When a player launches an attack, `AttackExecution` removes the committed troops (see `CONTEXT.md`) from the player's troops at once. Regeneration reads only the troops. So only the first fill of the troop bar, in `#0084d1`, feeds regeneration.

- Checked at: `332e5410e`
- Game source: `src/core/execution/AttackExecution.ts:117`
- Found in: #6

### `renderTroops()` divides the internal troop count by 10

The HUD (see `CONTEXT.md`) prints displayed troops, and `renderTroops()` divides the internal troop count by 10 to get them.

- Checked at: `332e5410e`
- Game source: `src/client/Utils.ts:280-282`
- Used in: `src/features/troop-bar/regeneration.ts:28-29`
- Found in: #1

### The troop bar sizes its two fills with `scaleX`

The troop bar has a fill for troops (`.bg-malibu-blue`) and a fill for committed troops (`.bg-aquarius`). Each tick, the game writes each fill width as an inline `transform: scaleX(...)`. It clamps the two widths, so together they never pass a full bar. The rest of the troop bar markup is in [rendering.md](rendering.md).

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts`
- Used in: `src/features/troop-bar/troop-bar.ts:12-13`, `src/features/troop-bar/troop-bar.ts:35-40`
- Found in: #6, #20

## Gold income

### Gold income per tick depends only on the player type

`goldAdditionRate(player)` gives the gold that a player earns each tick, and it reads only the player type. A bot earns 50 per tick, and a human player or a Nation earns 100. Land, troops and cities do not change it. `PlayerExecution` pays it once per tick to each player who is alive, but not in the spawn phase (see `CONTEXT.md`).

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:909-915`, `src/core/execution/PlayerExecution.ts:33`, `src/core/execution/PlayerExecution.ts:69`, `src/core/execution/PlayerExecution.ts:88`
- Found in: #1, #2, #15

### A lobby multiplier scales gold income

The lobby, the setup screen of a match, sets `goldMultiplier`, 1 by default. It multiplies the flat income and the trade ship payout. The gold host cheat gives the lobby creator a separate multiplier. The config object on the page returns the exact values (see [access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:282`, `src/core/configuration/Config.ts:521-524`
- Found in: #1, #2, #15

### No update reports spent gold

`gold()` on a `PlayerView`, the game's object for one player, returns the gold that the player holds now. Every gold gain reaches the page as an event, but no update reports gold that a player spends (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:506`
- Used in: `src/game/types.ts:104-105`
- Found in: #2, #8, #9

### Cities and ports raise income only indirectly

Cities and ports do not raise the flat rate. A port sends out trade ships, and a city holds a train station. Both of these pay gold.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PortExecution.ts:57`, `src/core/game/TrainStation.ts:15`
- Found in: #2

### A conqueror takes the victim's gold

When a player eliminates another player, the conqueror gets part of the gold that the victim holds. The conqueror gets half of it from a human victim, and all of it from a bot or a Nation.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:530`
- Found in: #2

### Gold rises in steps, not at a steady rate

One trade ship can pay about 80,000 gold at once. So a player's gold over time goes up in steps, not as a smooth flow.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:332-337`, `src/core/execution/TradeShipExecution.ts:197-198`
- Found in: #1, #2, #9

### The leaderboard has income columns at `c8dc34214`

The client at commit `c8dc34214` has a `GoldRateTracker`, which does not exist at `332e5410e`. It adds four columns for every player to the in-game leaderboard: Gold Income/min, Ship Trade Gold/min, Piracy Gold/min and Train Trade Gold/min. `DEFAULT_STATS_COLUMNS` holds only `clan`, `tiles`, `gold` and `maxtroops`, so a player must turn the income columns on in the column picker.

- Checked at: `c8dc34214`
- Game source: `src/client/hud/layers/lib/GoldRateTracker.ts:42`, `src/client/hud/layers/lib/StatsColumns.ts`, `src/client/StatsConstants.ts`
- Found in: #1, #8, #15

### The income columns read 0 in a paused game

Each income column is the slope between the oldest and the newest total in a window of two game minutes. So a paused game reads 0.

- Checked at: `c8dc34214`
- Game source: `src/client/hud/layers/lib/GoldRateTracker.ts:42`
- Found in: #1, #8, #15

## Unit prices

### Some unit prices rise with the count owned

In `unitInfo`, these prices grow with `n`, the number of that unit that the player has:

- Warship: `(n + 1) * 250,000`, capped at 1,000,000
- SAM launcher: `(n + 1) * 1,500,000`, capped at 3,000,000
- Defense post: `(n + 1) * 50,000`, capped at 250,000

- Checked at: unknown
- Game source: `src/core/configuration/Config.ts:356`
- Found in: #9

### The missile silo and the bombs have fixed prices

A missile silo costs 1,000,000, an atom bomb 750,000 and a hydrogen bomb 5,000,000. These prices do not change with the count owned.

- Checked at: unknown
- Game source: `src/core/configuration/Config.ts:356`
- Found in: #9

### City, port and factory prices stop at 1,000,000 after three steps

The price of the next city, port or factory goes through the three price steps (see `CONTEXT.md`) and then stays at 1,000,000.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:391`, `src/core/configuration/Config.ts:393`, `src/core/configuration/Config.ts:467`, `src/core/configuration/Config.ts:474-478`
- Used in: `src/features/hotbar/prices.ts:4-7`, `src/features/hotbar/prices.ts:15`
- Found in: #1, #9, #16

### The price pool counts unit levels, capped by units built

The price pool (see `CONTEXT.md`) counts the unit levels that the player owns, capped by the number of units built. A unit under construction counts toward the price but not toward `totalUnitLevels`.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:391`, `src/core/configuration/Config.ts:474`
- Found in: #1, #9, #16

### The MIRV price shows the launch count

The MIRV price is `25,000,000 + 15,000,000 * m`, where `m` counts the MIRVs that any player in the match has launched. So a script can compute `m` from the current MIRV price. The game shows that number nowhere.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:356`, `src/core/configuration/Config.ts:420`
- Found in: #1, #9

### Infinite gold makes every unit free for a human

Infinite gold comes from a lobby setting, or from a host cheat that covers only the lobby creator. With infinite gold, the game prices every unit at 0 for a human player.

- Checked at: `332e5410e`, source only
- Game source: `src/core/configuration/Config.ts:413-419`, `src/core/configuration/Config.ts:499-503`, `src/core/configuration/Config.ts:554-560`
- Used in: `src/features/hotbar/prices.ts:25-27`

### A disabled structure has no hotbar icon

A lobby can disable a city, a port or a factory, each one on its own. The hotbar then draws no icon for that unit.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:243-245`, `src/client/hud/layers/UnitDisplay.ts:207-209`
- Found in: #1

## Hotbar and build menus

### The hotbar element holds the current prices

`<unit-display>` draws the hotbar (see `CONTEXT.md`), and its `playerBuildables` field lists the units that the player can build, each with its `cost`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:36`, `src/client/hud/layers/UnitDisplay.ts:96`, `src/core/game/Game.ts:179`, `src/core/game/Game.ts:893`, `src/core/game/Game.ts:898`
- Used in: `src/game/types.ts:108-130`, `src/features/hotbar/hotbar.ts:73-82`
- Found in: #1, #9, #30

### A build starts from one of three surfaces

The three build surfaces are:

1. The hotbar, `<unit-display>`.
2. The radial menu, which opens on a plain click on the map and shows one price at a time in a tooltip.
3. The build menu, `<build-menu>`, which opens on the `buildMenuModifier` keybind and a click, and has a public `playerBuildables` field.

- Checked at: unknown
- Game source: `src/client/InputHandler.ts:824`, `src/client/hud/layers/MainRadialMenu.ts`, `src/client/hud/layers/BuildMenu.ts:132`
- Found in: #9

### The build menu greys a button for four reasons

The build menu greys a button in these cases:

- The player has not enough gold.
- The clicked tile has no legal spot.
- The player is dead, or the match is in the spawn phase.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/BuildMenu.ts`
- Found in: #1, #9

### A greyed hotbar icon ignores placement

A greyed hotbar icon means only "you cannot build this". The hotbar tests gold and one prerequisite, and never the placement. A warship needs a port, and the three bombs need a missile silo. A city, a port and a factory need nothing.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:71-90`
- Found in: #1, #9

## Trade

### A port draws its trade destination at random

A player never picks a trade route. `PortExecution.tradingPorts()` builds a weighted list, and the port draws a destination from it at random. The list holds the ports of every other player that are reachable by water and not under embargo. The weights use straight-line grid (Manhattan) distance.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PortExecution.ts:99`
- Found in: #1, #11

### Near ports and partner ports get extra weight

These rules set the weights in the list of trade destinations:

- The nearest `max(4, total / 3)` ports are entered twice.
- A port of an alliance partner or a teammate is entered twice more.
- A port nearer than 300 tiles loses both bonuses, but keeps its place in the nearest list.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PortExecution.ts:99`, `src/core/configuration/Config.ts:804-810`
- Found in: #1, #11

### Trade ship payout formula

`tradeShipGold` pays `75000 / (1 + e^(-0.03 * (dist - 300))) + 50 * dist`, times the same gold multiplier as the flat income. `dist` is the number of water tiles that the ship actually travelled. Along a coast, this can be twice the Manhattan distance. A route of 100 tiles pays about 5,000, and a route of 500 tiles pays about 100,000.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:332-337`, `src/core/configuration/Config.ts:804`
- Found in: #1, #2, #11

### Both port owners get the full trade amount

When a trade ship arrives, `TradeShipExecution.complete()` calls `addGold` twice with the full amount. One call pays the owner of the source port, and the other pays the owner of the destination port. The game reads the source port owner at arrival, even when the port changed hands or no longer exists. When both owners are the same player, the game deletes the ship with no payout.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:173`, `src/core/execution/TradeShipExecution.ts:197-198`
- Found in: #1, #2, #11

### A captured trade ship pays only its captor

A captured trade ship pays once, to its current owner. The game stats count that gold as steal, not as trade.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:181`, `src/core/game/StatsImpl.ts:203`
- Found in: #2

### A capture tells the sender and the captor only

When a player captures a trade ship, the game tells two players. The sender reads "Your trade ship was captured by X", and the captor reads "Received N gold from ship captured from Y". The owner of the destination port also loses the payout, but the game tells that player nothing.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:73`, `src/core/execution/TradeShipExecution.ts:183`
- Found in: #11

## Keybinds

### A player can change keybinds in the middle of a match

A player can remap the game's keys from the settings modal, also in the middle of a match. The game's key recorder component is `<setting-keybind>`.

- Checked at: `332e5410e`
- Game source: `src/client/components/baseComponents/setting/SettingKeybind.ts`
- Used in: `src/game/keybinds.ts:7-10`
- Found in: #1, #13, #26, #41

### The game stores keybinds in `localStorage`

The game keeps the player's keybinds in `localStorage` under `settings.keybinds`, and it merges them over its defaults on every read.

- Checked at: `332e5410e`
- Game source: `src/core/game/UserSettings.ts:16`, `src/core/game/UserSettings.ts:68`, `src/core/game/UserSettings.ts:513`, `src/core/game/UserSettings.ts:532`, `src/core/game/UserSettings.ts:541`
- Used in: `src/game/keybinds.ts:7-8`, `src/game/keybinds.ts:19-23`, `src/game/keybinds.ts:131-135`
- Found in: #13, #26, #41

### No default keybind uses Backquote

The default keybinds use Space, KeyM and the digit keys, and none of them uses Backquote.

- Checked at: `332e5410e`
- Game source: `src/core/game/UserSettings.ts:17`
- Used in: `src/game/keybinds.ts:28-40`
- Found in: #13, #26, #41
