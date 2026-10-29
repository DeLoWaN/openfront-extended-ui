# Reaching the game state

This file explains how a userscript reaches the live state of an OpenFront match. It names the page elements and globals that hold the state, shows how to run code on every game tick, and describes how a match starts and ends. It also covers how to read players, tiles, the camera and teams. Read it before you write a feature that reads game data. [events.md](events.md) covers the updates and events that a tick produces.

## Entry points into the page

### Run the userscript in the page's own window

A userscript is a script that a browser extension such as Tampermonkey adds to the game page. It must declare `@grant none`. With any other `@grant`, the script runs in a sandbox, and its `window` is a stand-in object. The script then cannot read `control-panel.game`, replace its `tick`, or read `window.__webglView`.

- Checked at: `332e5410e`
- Found in: #1

### `<control-panel>` holds the match and the event bus

`document.querySelector("control-panel").game` is the `GameView` of the current match. A `GameView` is the page's read-only copy of the game state. `.eventBus` on the same element is the game's event bus ([events.md](events.md)). The page has no `window.game` global.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `src/client/hud/layers/ControlPanel.ts:26`, `src/client/hud/GameRenderer.ts:98-104`
- Used in: `src/game/types.ts:290-294`
- Found in: #1, #4, #34, `research/spawn-test-bed`

### The game sets `.game` once per match

`createRenderer` finds `<control-panel>` and sets `.eventBus`, `.uiState` and `.game` on it. Its only caller, `createClientGame`, runs once per match, when the server sends the `"start"` message. The new values overwrite the old ones on the same element. The source shows that `.game` is set before the spawn phase, the first part of a match, where players pick a start tile; nobody confirmed this in a live match.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:47`, `src/client/hud/GameRenderer.ts:98-104`, `src/client/ClientGameRunner.ts:174`, `src/client/ClientGameRunner.ts:680`
- Found in: #4, #34, `research/spawn-test-bed`

### Wait for `<control-panel>` to upgrade

`<control-panel>` is written by hand in `index.html`, and no code creates or removes it. The game registers its class only when the deferred module bundle runs. A script that runs earlier gets a plain `HTMLElement` with no `tick` and no `.game`. Wait with `await customElements.whenDefined("control-panel")`.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `index.html:474`, `src/client/hud/layers/ControlPanel.ts:26`
- Found in: #4

### `.game` is absent before the first match

The game's `tsconfig.json` sets `"useDefineForClassFields": false`, so the field `public game: GameView` emits no code. The property is absent until the first match sets it. So `panel.game?.myPlayer()` gives `undefined` on the home page, not `null`.

- Checked at: `332e5410e`
- Game source: `tsconfig.json:20`, `src/client/hud/layers/ControlPanel.ts:28`
- Used in: `src/game/types.ts:290-294`
- Found in: #4

### `window.__webglView` is the map renderer

`window.__webglView` holds the `MapRenderer`, the object that draws the map with WebGL. The game assigns it with no development-only guard, so it exists on openfront.io too. The file header of `MapRenderer` calls it "a pure data sink" for other code. [rendering.md](rendering.md) covers its colour and settings methods.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:352`, `src/client/ClientGameRunner.ts:388-396`, `src/client/render/gl/MapRenderer.ts:9-11`
- Used in: `src/game/types.ts:193-198`, `src/features/alliance-view/hooks.ts:5-6`
- Found in: #1, #4, #12, #33, `research/spawn-pulse-tuning`

### Public methods of `window.__webglView`

`MapRenderer` has these public methods:

- `updatePalette(palette)` (`:169`) replaces the colours of every player.
- `updateRelations(data, size)` (`:209`).
- `rebuildTerrain()` (`:236`) bakes the terrain texture again.
- `updateSpawnOverlay(inSpawnPhase, centers)` (`:261`). The game calls it again on every tick, so a call from a script lasts one tick.
- `setLocalPlayerID(id)` (`:325`), `setAltView(on)` (`:332`) and `setHighlightOwner(id)` (`:341`).
- `getSettings()` (`:350`) returns the live render settings object, or `{}` while the WebGL context is lost.

The WebGL context and the palette texture are private fields. TypeScript `private` is gone at run time, but the bundler can rename those fields.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:38`, `src/client/render/gl/MapRenderer.ts:169-350`, `src/client/render/gl/passes/TerritoryPass.ts:50`, `src/client/WebGLFrameBuilder.ts:370`
- Used in: `src/game/types.ts:202-215`
- Found in: #12, `research/spawn-pulse-tuning`

### No mod API, and no other useful global

The game has no plugin API and no mod hook. Besides `window.__webglView`, the page sets three globals for its menu pages: `window.showPage`, `window.currentPageId` and `window.__toggleSidebar`. None of them gives access to the match.

- Checked at: `332e5410e`
- Game source: `src/client/Navigation.ts:17`, `src/client/Navigation.ts:79`, `index.html:408`
- Found in: #3, #4, #12

### The camera is on `<build-menu>.transformHandler`

The camera is the game's `TransformHandler` object. The game assigns it as the `transformHandler` property of `<build-menu>` and of other HUD elements such as `emojiTable`. The HUD is the game's interface on top of the map. The camera state is `scale`, `offsetX` and `offsetY`, and `MapRenderer` has no zoom getter ([rendering.md](rendering.md)).

#37 saw `<build-menu>` and its `transformHandler` during the spawn phase.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:76`, `src/client/hud/GameRenderer.ts:87`, `src/client/hud/GameRenderer.ts:350`, `src/client/TransformHandler.ts:34-37`
- Used in: `src/game/types.ts:242`, `src/game/types.ts:268`, `src/features/alliance-view/hooks.ts:7-8`, `src/features/alliance-panel/index.ts:62`
- Found in: #12, #37, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### `<build-menu>` has an open shadow root

`<build-menu>` is one of two HUD components with a shadow DOM. The root is open, so `buildMenu.shadowRoot` is readable, and its own stylesheet uses plain classes such as `.build-button`. The menu redraws 10 times a second while it is open, and it sits at `z-index: 9999`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/BuildMenu.ts:126-127`, `src/client/hud/layers/BuildMenu.ts:161-165`, `src/client/hud/layers/BuildMenu.ts:167-282`
- Found in: #6, #9

### Production renames the game classes

openfront.io ships a Vite build that esbuild minifies, so class names are lost. For example, `class SendAllianceExtensionIntentEvent` ships as `class s`. A check on `constructor.name` works on the dev server and fails silently on openfront.io.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:68`, `src/client/hud/layers/ActionableEvents.ts:185` (path unconfirmed)
- Found in: #1, #4, #10

## Ticks and the tick hook

### Ticks: 10 per second by default

A tick is one step of the game simulation. The game runs 10 ticks per second by default, with a turn interval of 100 ms. Singleplayer games and replays (playbacks of recorded matches) scale the rate with a speed setting, and a pause stops the ticks. Measure time in ticks, and do not take frozen ticks as the end of the match.

- Checked at: `332e5410e`
- Game source: `src/client/ClientEnv.ts:98-100`, `src/client/LocalServer.ts:86-87`, `src/client/LocalServer.ts:245-247`, `src/client/utilities/ReplaySpeedMultiplier.ts:1-6`, `src/client/Controller.ts:18`, `src/client/view/GameView.ts:1088`
- Found in: #1, #2, #3, #4, `research/spawn-test-bed`

### Game countdowns divide ticks by a fixed 10

The game's own countdowns turn ticks into seconds with a division by 10. Under a singleplayer speed setting, the real tick rate is different, so these countdowns are then wrong. A script clock next to a game clock should also divide by 10, so that the two agree.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:150`, `src/client/hud/layers/PlayerInfoOverlay.ts:233`, `src/client/hud/layers/GameRightSidebar.ts:153-154`
- Used in: `src/features/alliance-view/alliance.ts:15-21`
- Found in: #13, #14, `research/spawn-test-bed`

### `ticks()` is 0 before the first update

`game.ticks()` returns the current tick. It returns 0 before the first game update, so `ticks() > 0` means that the page holds at least one frame of state.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1066-1068`
- Used in: `src/game/types.ts:172`
- Found in: #4, `research/spawn-test-bed`

### Hook every tick through `<control-panel>.tick`

The game's controller loop calls the `tick()` method of `<control-panel>` once per tick, with no throttle. To run code on each tick, set an own property on the element: `el.tick = function () { original.call(this); ... }`. This property shadows the prototype method, and `delete el.tick` restores it. The class itself is not reachable from the page.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:323`, `src/client/hud/GameRenderer.ts:377-402`, `src/client/ClientGameRunner.ts:856`
- Used in: `src/game/types.ts:300-301`
- Found in: #1, #2, #4

### The tick hook sees every tick

The real simulation runs in a Web Worker, a separate browser thread, and sends its updates to the page in batches. For each update, the page calls `gameView.update()`, then the WebGL frame builder, then `renderer.tick()`. So the hook runs once per tick and drops no tick, even when the page catches up.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:550`, `src/client/ClientGameRunner.ts:875-877`, `src/core/worker/Worker.worker.ts:85`, `src/core/worker/WorkerClient.ts:54`, `src/client/hud/GameRenderer.ts:396`
- Found in: #2, #4

### Catch every error in script code

The controller loop and the event bus catch no errors. An error in a wrapped `tick` skips every controller after `<control-panel>` for that tick:

- the player info overlay
- the win modal
- the settings modal
- the performance overlay

Wrap all script work in `try`/`catch`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:324-335`, `src/client/hud/GameRenderer.ts:377-402`
- Found in: #1, #4

## Match flow

### Use the `.game` object as the match boundary

Each match builds a new `GameView`, a new worker, a new `Transport` and a new renderer. The `EventBus` is a field of `Main`, and the game never replaces it. So only a new `.game` object marks a new match, and a check every 500 ms is enough.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:174`, `src/client/ClientGameRunner.ts:129`, `src/client/ClientGameRunner.ts:550`, `src/client/ClientGameRunner.ts:553`, `src/client/hud/GameRenderer.ts:58`, `src/client/hud/GameRenderer.ts:338`
- Used in: `src/game/types.ts:290-294`
- Found in: #1, #4

### `game-starting` and `body.in-game` come before the `GameView`

The page dispatches the `game-starting` DOM event at prestart, before it builds the `GameView`. It adds the class `in-game` to `<body>` before `createRenderer` runs. So neither one tells a script that `.game` is ready. The page removes `in-game` when the game stops or the player leaves.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:943`, `src/client/Main.ts:1023`, `src/client/Main.ts:895`, `src/client/Main.ts:1070`, `src/client/ClientGameRunner.ts:171`
- Found in: #3, #4

### The spawn phase and `inSpawnPhase()`

`game.inSpawnPhase()` is true until a `SpawnPhaseEnd` update arrives. A "match is live" test is false in the spawn phase, so a feature for the spawn phase must check `inSpawnPhase()` instead. [spawn.md](spawn.md) covers the spawn phase in detail.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:320`, `src/client/view/GameView.ts:1070-1072`
- Used in: `src/game/types.ts:166`
- Found in: #1, #4

### The game's own "match is live" test

`ControlPanel.tick()` shows the panel only when `game && !game.inSpawnPhase() && game.myPlayer()?.isAlive()` is true. This test is false in the spawn phase, before the first update, in a replay and after death. No single condition means "the match is over".

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:101-110`
- Used in: `src/game/match.ts:3-13`
- Found in: #4

### When `myPlayer()` is null

`game.myPlayer()` returns the local player as a `PlayerView`, or `null`, and never `undefined`. A `PlayerView` is the page's read-only copy of one player. `myPlayer()` is null in these cases:

- before the first game update
- for the whole of a replay, because the local server sends no client id for a recorded game

It is not null after death.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:461-462`, `src/client/view/GameView.ts:1007-1009`, `src/client/LocalServer.ts:150`, `src/client/LocalServer.ts:164`, `src/core/Schemas.ts:786-787`
- Used in: `src/game/types.ts:159-164`
- Found in: #1, #4

### `myPlayer()` before the local player spawns

Sources disagree. Check before use.

#4 says that `myPlayer()` is null until the local player spawns, because `SpawnExecution` creates that player. #4 also says that it stays null for a player who never spawns.

#37 read `myPlayer()` in a live match during the spawn phase and got a non-null value. `research/spawn-test-bed` and #34 read in the source that the game creates every player before the first tick. The project code also says non-null in the spawn phase.

- Checked at: `332e5410e`
- Game source: `src/core/execution/SpawnExecution.ts:62`, `src/core/execution/utils/PlayerSpawner.ts:14-21`, `src/core/game/GameImpl.ts:197-231`, `src/core/game/PlayerImpl.ts:153`
- Used in: `src/game/types.ts:159-164`
- Found in: #4, #34, #37, `research/spawn-test-bed`

### A dead player keeps the same `PlayerView`

`GameView` adds players to its map and never deletes them. After death, `myPlayer()` returns the same object, and only `isAlive()` turns false. The control panel hides itself, but the element and `.game` stay.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:395`, `src/client/view/GameView.ts:462`, `src/client/view/PlayerView.ts:481-483`, `src/client/hud/layers/ControlPanel.ts:107-110`
- Found in: #1, #4

### A win, a reconnect or a death ends nothing

The game sends no signal that ends the match. A win produces a `WinUpdate` ([events.md](events.md)) and opens the win modal, but its main button only hides the modal, and the ticks continue. After 5 s with no server message, the game opens the WebSocket again, and `.game` stays the same object. A second `"start"` message after a reconnect does not rebuild the game.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/WinModal.ts:102-105`, `src/client/hud/layers/WinModal.ts:253-257`, `src/client/hud/layers/WinModal.ts:296-353`, `src/client/ClientGameRunner.ts:824-828`, `src/client/ClientGameRunner.ts:1020`, `src/client/ClientGameRunner.ts:1400`, `src/client/Transport.ts:412-414`
- Found in: #1, #4

### How a player leaves a match

Most exits load the home page with `window.location.href = "/"`:

- the exit button of the win modal
- the exit button of the sidebar
- the exit button of the settings modal
- the ranked requeue
- the move to a successor lobby

Sources disagree. Check before use.

#4 read that `Main.handleLeaveLobby` (`Main.ts:1053-1085`) leaves the match with no page reload. It stops the runner and removes `in-game`, but it keeps the old `<control-panel>.game`. The game dispatches `leave-lobby` for a full lobby, for a host who leaves, and for a cancelled ranked match. #26 and #41 saw a page reload when they left a match.

To detach a script in both cases, #4 says to listen for `leave-lobby` on `document` and for `pagehide` on `window`.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:1053-1085`, `src/client/Main.ts:1104`, `src/client/hud/layers/WinModal.ts:261`, `src/client/hud/layers/GameRightSidebar.ts:276`, `src/client/hud/layers/SettingsModal.ts:190`, `src/client/hud/layers/NewLobbyPrompt.ts:39`, `src/client/hud/layers/NewLobbyPrompt.ts:73`, `src/client/ClientGameRunner.ts:217-248`
- Found in: #4, #26, #41

### A second match with no reload

`Main.handleJoinLobby` stops the current game and joins again, so `createRenderer` sets a new `.game`. `ClientGameRunner.stop()` ends the old worker, so the old tick loop goes silent. It also removes the WebGL view, the map canvas and the input overlay, but it does not touch `<control-panel>`. `stop()` cannot cancel a `createClientGame` call in progress, so two matches can overlap for a short time.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:893-896`, `src/client/Main.ts:914`, `src/client/ClientGameRunner.ts:174-186`, `src/client/ClientGameRunner.ts:274-287`, `src/client/ClientGameRunner.ts:704-711`, `src/client/ClientGameRunner.ts:1033`, `src/core/worker/WorkerClient.ts:320-324`
- Found in: #4

## Players and units

### `players()` lists every player

`game.players()` returns every player of the match. The list includes humans, Nations, Bots, dead players and players who have not picked a spawn. Nations and Bots are the two kinds of computer player.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1019`
- Used in: `src/game/types.ts:176`
- Found in: #34, `research/spawn-test-bed`

### Player type and identifiers

`player.type()` returns `"HUMAN"`, `"NATION"` or `"BOT"`. A player has three identifiers: `smallID()`, `id()` and `clientID()`. The smallID is the small number that tile states and palette slots use for the owner; an alliance names its partner by `id()`, and only humans have a `clientID()`. `displayName()` is the name that the game draws on the map.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:440-442`, `src/client/view/PlayerView.ts:449-454`, `src/client/view/PlayerView.ts:459-464`, `src/client/view/PlayerView.ts:468-483`, `src/core/game/Game.ts:357-361`, `src/core/game/PlayerImpl.ts:614-616`
- Used in: `src/game/types.ts:49`, `src/game/types.ts:76-88`
- Found in: #34, `research/spawn-test-bed`

### `isAlive()` means that the player owns land

`player.isAlive()` is true once the player owns at least one tile.

- Checked at: `332e5410e`, source only
- Game source: `src/client/view/PlayerView.ts:481-483`
- Found in: #34, `research/spawn-test-bed`

### TerraNullius owns every unclaimed tile

TerraNullius is the owner of every unclaimed tile, and its smallID is 0. `isPlayer()` is false for it. `game.playerBySmallID(id)` throws for an unknown id.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1034`, `src/client/view/PlayerView.ts:490`
- Used in: `src/game/types.ts:90`, `src/game/types.ts:178`
- Found in: #12

### `PlayerView.state` changes in place

`PlayerView.state` is public, and the game edits that object in place on each update.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:112`
- Used in: `src/game/types.ts:57`, `src/game/types.ts:72`

### A half-built `PlayerView` can throw

The game builds a player view over several ticks. So a read on a view that is not complete can throw.

- Checked at: unknown
- Used in: `src/features/alliance-view/alliance.ts:9-10`

### The config object gives exact rule values

`game.config()` returns the rules of the match. It is the same class that the simulation uses, so its methods give exact values, for example `goldAdditionRate(player)` and the unit info. Ask the config for a number, and do not hard-code it ([economy.md](economy.md)).

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:529`, `src/client/view/GameView.ts:1098`
- Used in: `src/game/types.ts:180`
- Found in: #1, #2

### Units by id, and dead units

`GameView` keeps a lookup of units by id. A dead unit stays in that lookup for one more tick, and then the game removes it.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:504`, `src/client/view/GameView.ts:1131`
- Found in: #2

## Map tiles and the camera

### Tile coordinates

A tile ref is the game's handle for one map tile. `GameView` gives these tile methods:

- `ref(x, y)` gives the ref for a column and a row.
- `x(ref)` and `y(ref)` give the column and the row, in world tiles.
- `width()` and `height()` give the map size in tiles.
- `isValidCoord(x, y)` is false for a point off the map.
- `isLand(ref)` is false for water, and nobody owns water.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1157`, `src/client/view/GameView.ts:1163-1168`, `src/client/view/GameView.ts:1172-1177`, `src/client/view/GameView.ts:1185`, `src/client/view/GameView.ts:1188`
- Used in: `src/game/types.ts:168-170`, `src/game/types.ts:182-186`
- Found in: #34, `research/spawn-test-bed`

### The owner of a tile

`game.tileState(ref)` returns the packed state of one tile. The low 12 bits are the owner's smallID: `game.tileState(ref) & 0xfff`, where `OWNER_MASK` is `0xfff`. `game.tileStateBuffer()` returns a live `Uint16Array` with the state of every tile.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1291`, `src/client/view/GameView.ts:1294`, `src/client/render/gl/utils/TileCodec.ts:9`
- Used in: `src/game/types.ts:188`, `src/features/alliance-view/cursor.ts:11`
- Found in: #12

### The player under the cursor

The game finds the player under the cursor in two steps:

1. It turns the screen point into a world tile.
2. It reads the owner's smallID from the state of that tile.

A script can do the same. The map can move under a still cursor ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/client/controllers/HoverHighlightController.ts:52-54`
- Used in: `src/features/alliance-view/cursor.ts:4-6`
- Found in: #12

### Screen and world coordinates

`transformHandler.screenToWorldCoordinates(x, y)` gives the world tile under a screen point. `worldToScreenCoordinates(cell)` gives the screen point of a world point, in viewport CSS pixels. It adds the left and top of the canvas rectangle, which the class reads at start and again on each window `resize`. Nobody checked whether that rectangle stays correct when the canvas moves with no resize.

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:59-61`, `src/client/TransformHandler.ts:92-122`, `src/client/TransformHandler.ts:144-153`, `src/client/hud/GameRenderer.ts:363-365`
- Used in: `src/game/types.ts:248`, `src/game/types.ts:253`
- Found in: `research/spawn-test-bed`

### Move the camera to a player

`transformHandler.onGoToPlayer(event)` moves the camera to the name of `event.player`. It reads only `event.player` and the optional `event.zoom`, so a plain object `{ player }` works with no game class. It sends no intent, which is an action message to the game server. It does nothing for a player whose name the renderer has not placed, for example a dead player.

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:206-214`, `src/client/hud/layers/BuildMenu.ts:134`
- Used in: `src/game/types.ts:259`
- Found in: #1, #10, #17

## Teams

### `team()` and `isOnSameTeam()`

`player.team()` returns the team name, or `null` in a game without teams. The game sets it once and never changes it. `isOnSameTeam(other)` is true when both team names are non-null and equal. So it is always false in a game without teams, even for the player itself. In a team game, it is also true for the player itself.

Teammates are not alliance partners. [alliances.md](alliances.md) explains the difference.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:465-467`, `src/client/view/PlayerView.ts:535-537`
- Used in: `src/game/types.ts:74`, `src/game/types.ts:94`, `src/features/spawn-marks/players.ts:40`
- Found in: #13, #34, #37, `research/spawn-test-bed`

### Team names

The name that `team()` returns depends on the number of teams:

- With fewer than 8 teams, the teams have colour names, in this order: Red, Blue, Yellow, Green, Purple, Orange, Teal.
- With 8 teams or more, the names are "Team 1", "Team 2" and so on.
- In Humans Vs Nations, every human is on one team and every Nation is on the other. So a solo human has no teammate in this mode.
- Bots, the weakest computer players, are always on a separate Bot team.

[spawn.md](spawn.md) explains how the game assigns players to teams.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/GameImpl.ts:108`, `src/core/game/GameImpl.ts:155-196`, `src/core/game/GameImpl.ts:204-209`, `src/core/game/GameImpl.ts:687`
- Used in: `src/features/spawn-marks/players.ts:24-26`
- Found in: #34, `research/spawn-test-bed`

### Team count in Duos, Trios and Quads

Duos, Trios and Quads make `ceil(players / size)` teams, where `players` counts humans and Nations. For example, the map World with 72 Nations gives 19 teams in Quads and 37 in Duos.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/GameImpl.ts:155-181`
- Found in: #34, `research/spawn-test-bed`

## Lobby options

### Team count and Nation count options

The lobby offers these team counts: 2 to 7, Quads, Trios, Duos and Humans Vs Nations. The Nations slider runs from 1 to 400, as the schema allows, and World defaults to 72 Nations. When the map has fewer Nations than the lobby asks for, the game adds Nations with random names. The solo modal uses the same settings component as the host lobby.

- Checked at: `332e5410e`, source only
- Game source: `src/client/components/GameConfigSettings.ts:48-59`, `src/client/components/GameConfigSettings.ts:586-590`, `src/client/SinglePlayerModal.ts:404-440`, `src/core/Schemas.ts:343-348`, `src/core/game/NationCreation.ts:53-61`, `src/core/game/NationCreation.ts:92-142`
- Found in: #34, `research/spawn-test-bed`
