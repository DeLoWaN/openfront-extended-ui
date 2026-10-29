# Troops, gold and units

This file covers how the game counts troops and gold, what units cost, how trade pays, and how the hotbar and the game's keybinds work. Read it before you write a feature that shows or computes troops, gold, prices or keys.

## Troops

### Troop regeneration formula

`troopIncreaseRate(player)` gives the troops a player gains in one tick, which is one step of the game simulation. The game runs 10 ticks per second by default, a speed setting changes this in singleplayer and replays, and a pause stops it. The gain per tick is `(10 + troops^0.73 / 4) * (1 - troops / maxTroops)`. A human player gets this value with no multiplier, a bot gets half, and a Nation (a country that the computer plays) gets a factor from the difficulty.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`, `src/core/configuration/Config.ts:883-903`
- Used in: `src/features/troop-bar/regeneration.ts:4`
- Found in: #6, #20

### Peak of the regeneration curve

Without the constant 10, the curve peaks at `0.73 / 1.73`, which is 42.2% of max troops. With the 10, the peak depends on the troop count it is computed at. It is 41.52% full at 5,000 troops, 42.17% full at 500,000 troops and 42.12% full at 1,000,000 troops.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Used in: `src/features/troop-bar/regeneration.ts:13-23`
- Found in: #1, #6, #20

### The top of the regeneration curve is flat

The rate stays close to its best over a wide range of troop fill, where the fill is the share of max troops that the player holds:

- 99% of the best rate or more: 36.9% to 47.5% full
- 95% of the best rate or more: 30.6% to 54.3% full (precisely 30.560% to 54.290%, with the midpoint at 42.45%)
- 90% of the best rate or more: 26.0% to 59.5% full

Rounded to a whole percent, the rate reads 100% of best from 38.4% to 45.9% full. Across 5,000 to 500,000 troops, these ranges move by 3 points at most.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Found in: #1, #6, #20, #21

### The rate away from the peak

The curve is not symmetric. This list gives how many times slower regeneration is than at the peak, at a distance below and above the peak:

- 20 points off: x1.19 below, x1.15 above
- 30 points off: x1.62 below, x1.41 above
- 40 points off: x4.99 below, x2.00 above

Ten points below the peak gives 96.3% of the best rate, and ten points above gives 96.6%. At 80% full the rate is 55.1% of best, at 90% full it is 30%, and at 100% full it is 0.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:875`
- Found in: #1, #6, #20, #21

### Attack troops leave the pool at launch

When a player launches an attack, the game removes the troops from the player's pool at once. Regeneration reads that pool. So only the first fill of the troop bar, in `#0084d1`, feeds regeneration.

- Checked at: `332e5410e`
- Game source: `src/core/execution/AttackExecution.ts:117`
- Found in: #6

### Internal troop numbers are ten times the shown numbers

The troop values inside the game state are ten times the troop numbers that the HUD (the game's on-screen panels) shows.

- Checked at: `332e5410e`
- Used in: `src/features/troop-bar/regeneration.ts:28-29`
- Found in: #1

### The two fills of the troop bar

The troop bar draws the troops fill (`.bg-malibu-blue`) first and the fill for troops committed to attacks (`.bg-aquarius`) second, then the troop numbers, with no `z-index`. Each tick the game writes each fill width as an inline `transform: scaleX(...)` and clamps the two so that together they never pass a full bar. The rest of the troop bar markup is in [rendering.md](rendering.md).

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts`
- Used in: `src/features/troop-bar/troop-bar.ts:12`, `src/features/troop-bar/troop-bar.ts:35-40`
- Found in: #6, #20

## Gold income

### Flat gold income per tick

`goldAdditionRate(player)` gives the gold that a player earns each tick, and it reads only the player type. A bot earns 50 per tick, and a human player or a Nation earns 100. Land, troops and cities do not change it. `PlayerExecution` pays it once per tick, only to players who are alive, and not in the spawn phase (the first part of a match, see [spawn.md](spawn.md)).

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:909-915`, `src/core/execution/PlayerExecution.ts:33`, `src/core/execution/PlayerExecution.ts:69`, `src/core/execution/PlayerExecution.ts:88`
- Found in: #1, #2, #15

### Lobby gold multiplier

The lobby (the setup screen of a match) sets `goldMultiplier`, 1 by default. It multiplies the flat income and the trade ship payout. A lobby creator with the gold host cheat gets a separate multiplier. So do not hard-code 100: call the config object on the page, which gives exact values (see [access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:282`, `src/core/configuration/Config.ts:521-524`
- Found in: #1, #2, #15

### A player's gold

`gold()` on a `PlayerView` (the game's object for one player) returns the gold that the player holds now, as a `bigint`. Every gold gain reaches the page as an event, but no update reports gold that a player spends (see [events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:506`
- Used in: `src/game/types.ts:104`
- Found in: #2, #8, #9

### Cities and ports raise income only indirectly

Cities and ports do not raise the flat rate. A port sends out trade ships, and a city holds a train station. Both of these pay gold.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PortExecution.ts:57`, `src/core/game/TrainStation.ts:15`
- Found in: #2

### Conquest gold

When a player eliminates another player, the conqueror gets part of the victim's treasury (the gold the victim holds). The conqueror gets half of it from a human victim, and all of it from a bot or a Nation.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:530`
- Found in: #2

### Gold arrives in lumps

One trade ship can pay about 80,000 gold at once. So a player's gold over time goes up in steps, not as a smooth flow.

- Checked at: `332e5410e`
- Found in: #1, #2, #9

### The game's own income columns

The client at commit `c8dc34214` has a `GoldRateTracker`, which does not exist at `332e5410e`. It adds four income columns for every player to the in-game leaderboard: Gold Income/min, Ship Trade Gold/min, Piracy Gold/min and Train Trade Gold/min. Each rate is the slope between the oldest and the newest cumulative snapshot in a window of two game minutes, so a paused game reads 0. `DEFAULT_STATS_COLUMNS` holds only `clan`, `tiles`, `gold` and `maxtroops`, so a player must turn the income columns on in the column picker.

- Checked at: `c8dc34214`
- Game source: `src/client/hud/layers/lib/GoldRateTracker.ts:42`, `src/client/hud/layers/lib/StatsColumns.ts`, `src/client/StatsConstants.ts`
- Found in: #1, #8, #15

## Unit prices

### Unit price formulas

`unitInfo` in the config gives the price of each unit. In these formulas, `n` is the number of that unit that the player has:

- Port, city and factory: `2^n * 125,000`, capped at 1,000,000
- Warship: `(n + 1) * 250,000`, capped at 1,000,000
- SAM launcher: `(n + 1) * 1,500,000`, capped at 3,000,000
- Defense post: `(n + 1) * 50,000`, capped at 250,000
- Missile silo: 1,000,000 flat
- Atom bomb: 750,000
- Hydrogen bomb: 5,000,000
- MIRV: `25,000,000 + 15,000,000 * m`, where `m` counts the MIRVs that any player in the match has launched

The `cost` that the game gives on the hotbar already applies these formulas, so read it in place of a computed price.

- Checked at: unknown
- Game source: `src/core/configuration/Config.ts:356`
- Found in: #9

### City, port and factory price steps

The price of the next city, port or factory goes through 125,000, 250,000 and 500,000, then stays at 1,000,000. The cap of 1,000,000 never changes again. Read the step from the price the game gives, with `1 + log2(cost / 125,000)`, and do not count units yourself.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:391`, `src/core/configuration/Config.ts:393`, `src/core/configuration/Config.ts:467`, `src/core/configuration/Config.ts:474-478`
- Used in: `src/features/hotbar/prices.ts:4-7`, `src/features/hotbar/prices.ts:15`
- Found in: #1, #9, #16

### What the city, port and factory price counts

Ports and factories share one count, and cities have their own. The count is the unit levels that the player owns, capped by the number of units built. A unit under construction counts toward the price but not toward `totalUnitLevels`. When the player loses one of these structures, the next price can drop below the cap again.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:391`, `src/core/configuration/Config.ts:474`
- Found in: #1, #9, #16

### The MIRV price shows the launch count

The MIRV price grows with every MIRV that any player launches. So a script can compute the number of MIRV launches in the match from the current MIRV price. The game shows that number nowhere.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:356`
- Found in: #1, #9

### Infinite gold makes every unit free

In a lobby with infinite gold, the game prices every unit at 0.

- Checked at: unknown
- Used in: `src/features/hotbar/prices.ts:26-27`

### A lobby can disable a structure

A lobby can disable a city, a port or a factory, each one on its own. The hotbar then draws no icon for that unit.

- Checked at: `332e5410e`
- Found in: #1

## Hotbar and build menus

### Prices on the hotbar element

The hotbar is the row of ten build icons under the control panel, drawn by `<unit-display>`. Its `playerBuildables` field is a list of the units the player can build. Each item has a `type`, a `UnitType` value such as `"City"`, and a `cost`, the price now in gold as a `bigint`. The field is `private` only in TypeScript, so a script can read it, and it is `null` until the simulation worker sends the first prices.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:36`, `src/client/hud/layers/UnitDisplay.ts:96`, `src/core/game/Game.ts:179`, `src/core/game/Game.ts:893`, `src/core/game/Game.ts:898`
- Used in: `src/game/types.ts:108-126`, `src/features/hotbar/hotbar.ts:73-78`
- Found in: #1, #9, #30

### The three build surfaces

A player can start a build from three places:

1. The hotbar, `<unit-display>`, always on screen. One click starts the placement.
2. The radial menu, which opens on a plain click on the map. It draws d3 arcs and shows one price at a time in a tooltip.
3. The build menu, `<build-menu>`, which opens on Ctrl+click or Cmd+click through the `buildMenuModifier` keybind. It also has a public `playerBuildables` field.

The hotbar draws nothing in some states and is hidden on narrow screens (see [rendering.md](rendering.md)).

- Checked at: unknown
- Game source: `src/client/InputHandler.ts:824`, `src/client/hud/layers/MainRadialMenu.ts`, `src/client/hud/layers/BuildMenu.ts:132`
- Found in: #9

### What greys a build icon

The build menu greys a button for four reasons:

- The player has not enough gold.
- The clicked tile has no legal spot.
- The player is dead.
- The match is in the spawn phase.

A greyed hotbar icon means only "you cannot build this". The hotbar tests gold and one prerequisite, and never the placement. The prerequisite is a port for a warship, and a missile silo for the three bombs; a city, a port and a factory have none.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/BuildMenu.ts`
- Found in: #1, #9

## Trade

### How a port picks a trade destination

A player never picks a trade route. `PortExecution.tradingPorts()` builds a weighted list, and the port draws a destination from it at random. The candidates are the ports of every other player that are reachable by water and not under embargo. The rules for the weights:

- The nearest `max(4, total / 3)` ports are entered twice.
- A port of an ally or a teammate is entered twice more.
- A port nearer than 300 tiles loses both bonuses, but keeps its place in the nearest list.

The weights use straight-line grid (Manhattan) distance. The payout uses the water tiles that the ship travels, which along a coast can be twice as long.

- Checked at: `332e5410e`
- Game source: `src/core/execution/PortExecution.ts:99`
- Found in: #1, #11

### Trade ship payout formula

`tradeShipGold` pays `75000 / (1 + e^(-0.03 * (dist - 300))) + 50 * dist`, times the same gold multiplier as the flat income. `dist` is the number of water tiles that the ship actually travelled. A route of 100 tiles pays about 5,000, and a route of 500 tiles pays about 100,000.

- Checked at: `332e5410e`
- Game source: `src/core/configuration/Config.ts:332-337`, `src/core/configuration/Config.ts:804`
- Found in: #1, #2, #11

### Both ports get the full trade amount

When a trade ship arrives, `TradeShipExecution.complete()` calls `addGold` twice with the full amount: once for the owner of the source port and once for the owner of the destination port. The game reads the source port owner at arrival time, even when the port changed hands or no longer exists. When both owners are the same player, the game deletes the ship with no payout. About half of a player's trade gold comes from ships that other players sent.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:173`, `src/core/execution/TradeShipExecution.ts:197-198`
- Found in: #1, #2, #11

### Captured trade ships

A captured trade ship pays once, to its current owner. The game stats count that gold as steal, not as trade.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:181`, `src/core/game/StatsImpl.ts:203`
- Found in: #2

### Capture messages

When a player captures a trade ship, the game tells two players. The sender reads "Your trade ship was captured by X", and the captor reads "Received N gold from ship captured from Y". The owner of the destination port also loses the payout, but the game tells that player nothing.

- Checked at: `332e5410e`
- Game source: `src/core/execution/TradeShipExecution.ts:73`, `src/core/execution/TradeShipExecution.ts:183`
- Found in: #11

## Keybinds

### Keybinds can change in a match

A player can remap the game's keys from the settings modal, also in the middle of a match. A script that picks its own key must read the game's keybinds again on every key press to avoid a clash. The game's key recorder component is `<setting-keybind>`.

- Checked at: `332e5410e`
- Game source: `src/client/components/baseComponents/setting/SettingKeybind.ts`
- Used in: `src/game/keybinds.ts:7-14`
- Found in: #1, #13, #26, #41

### Where the game stores keybinds

The game keeps the player's keybinds in `localStorage` under the key `settings.keybinds`. It merges them over its defaults on every read. It writes the string `"Null"` for an action that the player has unbound. A binding can be stored in three forms (a plain string, an object with `value`, a list with one item), and `normalizedUserKeybinds` reads all three.

- Checked at: `332e5410e`
- Game source: `src/core/game/UserSettings.ts:16`, `src/core/game/UserSettings.ts:68`, `src/core/game/UserSettings.ts:513`, `src/core/game/UserSettings.ts:532`, `src/core/game/UserSettings.ts:541`
- Used in: `src/game/keybinds.ts:7-22`, `src/game/keybinds.ts:133-135`
- Found in: #13, #26, #41

### Default keybinds

The default keybinds include `toggleView` on Space, `coordinateGrid` on KeyM, `buildCity` on Digit1, `buildFactory` on Digit2 and `buildPort` on Digit3. On a Mac, `buildMenuModifier` is `MetaLeft`. The game binds nothing to Backquote by default.

- Checked at: `332e5410e`
- Game source: `src/core/game/UserSettings.ts:17`
- Used in: `src/game/keybinds.ts:29-40`
- Found in: #13, #26, #41
