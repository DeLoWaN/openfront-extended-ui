# Access to the game state

This file explains how a userscript reaches the live state of an OpenFront match. It names the page elements and globals that hold the state. It shows how to run code on every game tick, and how a match starts and ends. It also covers players, tiles, the camera and teams. Read it before you write a feature that reads game data. [events.md](events.md) covers the updates and events that a tick produces.

## Entry points into the page

### The userscript must run in the page's own window

A userscript is a script that a browser extension such as Tampermonkey adds to the game page. With any `@grant` other than `none`, the script runs in a sandbox with a stand-in `window`, so it cannot reach `control-panel.game` or `window.__webglView`.

- Checked at: live game, date unknown
- Game source: none, seen in a match
- Used in: `src/userscript.ts:37-39`
- Found in: #1

### `<control-panel>.game` holds the current match

`document.querySelector("control-panel").game` is the `GameView` of the current match: the page's read-only copy of the game state. The page has no `window.game` global.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `src/client/hud/layers/ControlPanel.ts:26`, `src/client/hud/GameRenderer.ts:98-104`
- Used in: `src/game/types.ts:289-298`
- Found in: #1, #4, #34, `research/spawn-test-bed`

### The game sets `.game` once per match

`createRenderer` finds `<control-panel>` and sets `.eventBus`, `.uiState` and `.game` on it. Its only caller, `createClientGame`, runs once per match, when the server sends the `"start"` message. The new values overwrite the old ones on the same element. In the source, the game sets `.game` before the spawn phase, but no live match confirmed it.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:47`, `src/client/hud/GameRenderer.ts:98-104`, `src/client/ClientGameRunner.ts:174`, `src/client/ClientGameRunner.ts:680`
- Found in: #4, #34, `research/spawn-test-bed`

### `<control-panel>` upgrades only when the game bundle runs

`index.html` holds `<control-panel>` as static markup, and the game registers its class only when the deferred module bundle runs. No code creates or removes the element.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `index.html:474`, `src/client/hud/layers/ControlPanel.ts:26`
- Used in: `src/main.ts:30-33`
- Found in: #4

### `.game` is undefined before the first match

The game's `tsconfig.json` sets `"useDefineForClassFields": false`, so the field `public game: GameView` emits no code. So `panel.game?.myPlayer()` gives `undefined` on the home page, not `null`.

- Checked at: `332e5410e`
- Game source: `tsconfig.json:20`, `src/client/hud/layers/ControlPanel.ts:28`
- Used in: `src/game/types.ts:292-294`
- Found in: #4

### `window.__webglView` is the map renderer

`window.__webglView` holds the `MapRenderer`, the object that draws the map with WebGL ([rendering.md](rendering.md)).

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:352`, `src/client/ClientGameRunner.ts:388-396`, `src/client/render/gl/MapRenderer.ts:9-11`
- Used in: `src/game/types.ts:192-199`, `src/features/alliance-view/hooks.ts:5-6`
- Found in: #1, #4, #12, #33, `research/spawn-pulse-tuning`

### `MapRenderer` also has overlay and highlight setters

Besides its palette, terrain and settings methods, `MapRenderer` has these public methods:

- `updateRelations(data, size)` (`:209`).
- `updateSpawnOverlay(inSpawnPhase, centers)` (`:261`), which the game calls on every tick, so a call from a script lasts one tick.
- `setLocalPlayerID(id)` (`:325`), `setAltView(on)` (`:332`) and `setHighlightOwner(id)` (`:341`).

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:169-350`, `src/client/WebGLFrameBuilder.ts:370`
- Used in: `src/game/types.ts:200-216`
- Found in: #12, `research/spawn-pulse-tuning`

### Private fields of `MapRenderer` keep their names at run time

TypeScript `private` is gone at run time, so a script can read a private field such as `window.__webglView.renderer`. The production build minifies with esbuild, which renames local names and class names but keeps property names unless `mangleProps` is set. The game's `vite.config.ts` does not set it. A private field can still change in any game update, because the game owes nobody a stable private field.

- Checked at: `8ca8e5895`, source only
- Game source: `src/client/render/gl/MapRenderer.ts:39`, `vite.config.ts`
- Used in: `src/game/types.ts:258`, `src/features/nation-hatch/index.ts:140-141`

### The page has no mod API and no other match global

The game has no plugin API and no mod hook. Besides `window.__webglView`, the page sets three globals for its menu pages: `window.showPage`, `window.currentPageId` and `window.__toggleSidebar`. None of them gives access to the match.

- Checked at: `332e5410e`
- Game source: `src/client/Navigation.ts:17`, `src/client/Navigation.ts:79`, `index.html:408`
- Found in: #3, #4, #12

### The camera is on `<build-menu>.transformHandler`

The camera is the game's `TransformHandler` object, and other HUD elements such as `emojiTable` also hold it. Its state is `scale`, `offsetX` and `offsetY`, and `MapRenderer` has no zoom getter ([rendering.md](rendering.md)). #37 saw `<build-menu>` and its `transformHandler` in the spawn phase.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:76`, `src/client/hud/GameRenderer.ts:87`, `src/client/hud/GameRenderer.ts:350`, `src/client/TransformHandler.ts:34-37`
- Used in: `src/game/types.ts:239-247`, `src/game/types.ts:268`, `src/features/alliance-view/hooks.ts:7-8`, `src/features/alliance-panel/index.ts:62`
- Found in: #12, #37, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### `<build-menu>` has an open shadow root

`<build-menu>` is one of two HUD components with a shadow DOM. The root is open, so `buildMenu.shadowRoot` is readable, and its own stylesheet uses plain classes such as `.build-button`. The menu redraws 10 times a second while it is open, and it sits at `z-index: 9999`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/BuildMenu.ts:126-127`, `src/client/hud/layers/BuildMenu.ts:161-165`, `src/client/hud/layers/BuildMenu.ts:167-282`
- Found in: #6, #9

### Production renames the game classes

openfront.io ships a Vite build, and esbuild minifies it and drops the class names. For example, `class SendAllianceExtensionIntentEvent` ships as `class s`. A check on `constructor.name` works on the dev server and fails silently on openfront.io.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:68`, `src/client/hud/layers/ActionableEvents.ts:185`
- Found in: #1, #4, #10

## Ticks and the tick hook

### The game runs 10 ticks per second by default

A tick is one step of the game simulation. The game runs 10 ticks per second by default, with a turn interval of 100 ms. Singleplayer games and replays (recorded matches played back) scale the rate with a speed setting, and a pause stops the ticks. So frozen ticks do not mean that the match ended.

- Checked at: `332e5410e`
- Game source: `src/client/ClientEnv.ts:98-100`, `src/client/LocalServer.ts:86-87`, `src/client/LocalServer.ts:245-247`, `src/client/utilities/ReplaySpeedMultiplier.ts:1-6`, `src/client/Controller.ts:18`, `src/client/view/GameView.ts:1088`
- Found in: #1, #2, #3, #4, `research/spawn-test-bed`

### Game countdowns divide ticks by a fixed 10

The game's own countdowns turn ticks into seconds with a fixed division by 10, so they are wrong under a singleplayer speed setting.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:150`, `src/client/hud/layers/PlayerInfoOverlay.ts:233`, `src/client/hud/layers/GameRightSidebar.ts:153-154`
- Used in: `src/features/alliance-view/alliance.ts:15-21`
- Found in: #13, #14, `research/spawn-test-bed`

### `ticks()` above 0 means the page holds state

`game.ticks()` returns the current tick, so `ticks() > 0` means that the page holds at least one frame of state.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1066-1068`
- Used in: `src/game/types.ts:172-173`
- Found in: #4, `research/spawn-test-bed`

### The controller loop calls `<control-panel>.tick()` on every tick

The loop calls `tick()` with no throttle, and the page cannot reach the `ControlPanel` class itself. A wrapper keeps the original: `el.tick = function () { original.call(this); ... }`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:323`, `src/client/hud/GameRenderer.ts:377-402`, `src/client/ClientGameRunner.ts:856`
- Used in: `src/game/types.ts:299-303`
- Found in: #1, #2, #4

### The tick hook sees every tick

The real simulation runs in a Web Worker, a separate browser thread, and sends its updates to the page in batches. For each update, the page calls `gameView.update()`, then the WebGL frame builder, then `renderer.tick()`. So the hook runs once per tick and drops no tick, even when a batch holds many ticks.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:550`, `src/client/ClientGameRunner.ts:875-877`, `src/core/worker/Worker.worker.ts:85`, `src/core/worker/WorkerClient.ts:54`, `src/client/hud/GameRenderer.ts:396`
- Found in: #2, #4

### The tick loop and the event bus catch no errors

The controller loop and the event bus have no `try`/`catch`. An error in a wrapped `tick` skips every later controller for that tick, such as the win modal and the settings modal.

- Checked at: `332e5410e`
- Game source: `src/client/hud/GameRenderer.ts:324-335`, `src/client/hud/GameRenderer.ts:377-402`
- Found in: #1, #4

## Match flow

### Only a new `.game` object marks a new match

Each match builds a new `GameView`, worker, `Transport` and renderer, but the `EventBus` is a field of `Main` that the game never replaces.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:174`, `src/client/ClientGameRunner.ts:129`, `src/client/ClientGameRunner.ts:550`, `src/client/ClientGameRunner.ts:553`, `src/client/hud/GameRenderer.ts:58`, `src/client/hud/GameRenderer.ts:338`
- Used in: `src/game/types.ts:151-157`, `src/game/types.ts:289-295`
- Found in: #1, #4

### `game-starting` and `body.in-game` come before the `GameView`

The page dispatches the `game-starting` DOM event at the `prestart` step, before it builds the `GameView`. It adds the class `in-game` to `<body>` before `createRenderer` runs. So neither one tells a script that `.game` is ready. The page removes `in-game` when the game stops or the player leaves.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:943`, `src/client/Main.ts:1023`, `src/client/Main.ts:895`, `src/client/Main.ts:1070`, `src/client/ClientGameRunner.ts:171`
- Found in: #3, #4

### `inSpawnPhase()` is true until `SpawnPhaseEnd`

`game.inSpawnPhase()` stays true until a `SpawnPhaseEnd` update arrives ([spawn.md](spawn.md)).

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:320`, `src/client/view/GameView.ts:1070-1072`
- Used in: `src/game/types.ts:166`
- Found in: #1, #4

### The control panel shows itself only for a live player

`ControlPanel.tick()` shows the panel only when `game && !game.inSpawnPhase() && game.myPlayer()?.isAlive()` is true.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:101-110`
- Used in: `src/game/match.ts:3-14`
- Found in: #4

### `myPlayer()` is null before the first update and in a replay

`game.myPlayer()` returns the local player as a `PlayerView`, or `null`, and never `undefined`. A `PlayerView` is the page's read-only copy of one player. In a replay it stays null, because the local server sends no client id for a recorded game.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:461-462`, `src/client/view/GameView.ts:1007-1009`, `src/client/LocalServer.ts:150`, `src/client/LocalServer.ts:164`, `src/core/Schemas.ts:786-787`
- Used in: `src/game/types.ts:159-165`
- Found in: #1, #4

### `myPlayer()` in the spawn phase

Sources disagree. Check before use.

#4 says that `myPlayer()` stays null until the local player spawns, because `SpawnExecution` creates that player. #37 got a non-null value in the spawn phase of a live match, and #34 and `research/spawn-test-bed` agree with the project code.

- Checked at: `332e5410e`
- Game source: `src/core/execution/SpawnExecution.ts:62`, `src/core/execution/utils/PlayerSpawner.ts:14-21`, `src/core/game/GameImpl.ts:197-231`, `src/core/game/PlayerImpl.ts:153`
- Used in: `src/game/types.ts:159-165`
- Found in: #4, #34, #37, `research/spawn-test-bed`

### A dead player keeps the same `PlayerView`

`GameView` adds players to its map and never deletes them, so after death `myPlayer()` returns the same object. The control panel hides itself, but the element and `.game` stay.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:395`, `src/client/view/GameView.ts:462`, `src/client/view/PlayerView.ts:481-483`, `src/client/hud/layers/ControlPanel.ts:107-110`
- Used in: `src/game/types.ts:82-83`
- Found in: #1, #4

### No signal ends a match

A win produces a `WinUpdate` ([events.md](events.md)) and opens the win modal, but its main button only hides the modal, and the ticks continue. After 5 s with no server message, the game opens the WebSocket again, and `.game` stays the same object. A second `"start"` message after a reconnect does not rebuild the game.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/WinModal.ts:102-105`, `src/client/hud/layers/WinModal.ts:253-257`, `src/client/hud/layers/WinModal.ts:296-353`, `src/client/ClientGameRunner.ts:824-828`, `src/client/ClientGameRunner.ts:1020`, `src/client/ClientGameRunner.ts:1400`, `src/client/Transport.ts:412-414`
- Found in: #1, #4

### Most exits load the home page

These exits load the home page with `window.location.href = "/"`:

- the exit buttons of the win modal, the sidebar and the settings modal
- the ranked requeue
- the move to a successor lobby

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/WinModal.ts:261`, `src/client/hud/layers/GameRightSidebar.ts:276`, `src/client/hud/layers/SettingsModal.ts:190`, `src/client/Main.ts:1104`, `src/client/hud/layers/NewLobbyPrompt.ts:39`, `src/client/hud/layers/NewLobbyPrompt.ts:73`
- Found in: #4

### `handleLeaveLobby` leaves a match with no reload

Sources disagree. Check before use.

#4 read that `Main.handleLeaveLobby` leaves the match with no page reload. It stops the runner and removes `in-game`, but it keeps the old `<control-panel>.game`. The game dispatches `leave-lobby` on `document` for a full lobby, for a host who leaves, and for a cancelled ranked match. #26 and #41 saw a page reload when they left a match.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:1053-1085`, `src/client/ClientGameRunner.ts:217-248`
- Found in: #4, #26, #41

### A new lobby join replaces `.game` with no reload

`Main.handleJoinLobby` stops the current game and joins again, so `createRenderer` sets a new `.game`. `ClientGameRunner.stop()` ends the old worker, so the old tick loop goes silent. It also removes the WebGL view, the map canvas and the input overlay, but it does not touch `<control-panel>`. `stop()` cannot cancel a `createClientGame` call in progress, so two matches can overlap for a short time.

- Checked at: `332e5410e`
- Game source: `src/client/Main.ts:893-896`, `src/client/Main.ts:914`, `src/client/ClientGameRunner.ts:174-186`, `src/client/ClientGameRunner.ts:274-287`, `src/client/ClientGameRunner.ts:704-711`, `src/client/ClientGameRunner.ts:1033`, `src/core/worker/WorkerClient.ts:320-324`
- Found in: #4

## Players and units

### `players()` includes players with no spawn

`game.players()` also includes Nations, Bots and players who have not picked a spawn. Nations and Bots are the two kinds of computer player.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1019`
- Used in: `src/game/types.ts:176`
- Found in: #34, `research/spawn-test-bed`

### A player has three identifiers

A player has three identifiers: `smallID()`, `id()` and `clientID()`. Tile states also name the owner by smallID, and only humans have a `clientID()`.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:440-442`, `src/client/view/PlayerView.ts:449-454`, `src/client/view/PlayerView.ts:459-464`, `src/client/view/PlayerView.ts:468-483`, `src/core/game/Game.ts:357-361`, `src/core/game/PlayerImpl.ts:614-616`
- Used in: `src/game/types.ts:48-54`, `src/game/types.ts:76-89`
- Found in: #34, `research/spawn-test-bed`

### `type()` tells a Nation from a human from the first tick

`player.type()` returns `"HUMAN"`, `"NATION"` or `"BOT"`. A Nation is a computer player that plays like a country, and a Bot is a small computer player. The game creates every human and every Nation before the first tick, so the type is there in the spawn phase. A Nation takes its name from the map, and nothing stops a human from taking the same name, so a name never proves the type.

- Checked at: `8ca8e5895`, seen in a local match
- Game source: `src/client/view/PlayerView.ts:415`
- Used in: `src/features/nation-hatch/nations.ts:15-26`

### `gameConfig().playerTeams` names the Humans vs Nations mode

`game.config().gameConfig()` returns the lobby settings of the match. In a Humans vs Nations match, `playerTeams` is the string `"Humans Vs Nations"`. In another team match it is a team count or a preset name, and in a match without teams it is absent.

- Checked at: `8ca8e5895`, source only
- Game source: `packages/engine-lib/src/configuration/Config.ts:158`, `packages/engine-api/src/Schemas.ts:331`, `packages/engine-api/src/game/GameTypes.ts:94`
- Used in: `src/game/types.ts:157`, `src/features/nation-hatch/nations.ts:7`

### `isAlive()` means that the player owns land

`player.isAlive()` is true once the player owns at least one tile.

- Checked at: `332e5410e`, source only
- Game source: `src/client/view/PlayerView.ts:481-483`
- Found in: #34, `research/spawn-test-bed`

### TerraNullius owns every unclaimed tile

TerraNullius owns every unclaimed tile, and its smallID is 0.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1034`, `src/client/view/PlayerView.ts:490`
- Used in: `src/game/types.ts:90`, `src/game/types.ts:178`
- Found in: #12

### `PlayerView.state` changes in place

`PlayerView.state` is public, and the game edits that object in place on each update.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:112`
- Used in: `src/game/types.ts:56-60`, `src/game/types.ts:72`

### A half-built `PlayerView` can throw

The game builds a player view over several ticks, so a read on a view that is not complete can throw.

- Checked at: unknown
- Game source: `src/client/view/PlayerView.ts:496-500`, `src/client/view/GameView.ts:1038-1041` (path unconfirmed)
- Used in: `src/features/alliance-view/alliance.ts:9-10`

### `game.config()` gives the simulation's own rule values

`game.config()` is the same class that the simulation uses, so its methods give exact values, such as `goldAdditionRate(player)` and the unit info ([economy.md](economy.md)).

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:529`, `src/client/view/GameView.ts:1098`
- Used in: `src/game/types.ts:180`
- Found in: #1, #2

### A dead unit stays in the unit lookup for one tick

`GameView` keeps a lookup of units by id, and a dead unit stays in it for one more tick.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:504`, `src/client/view/GameView.ts:1131`
- Found in: #2

## Map tiles and the camera

### `GameView` converts between tile refs and coordinates

A tile ref is the game's handle for one map tile, and `GameView` converts it with `ref(x, y)`, `x(ref)` and `y(ref)`. `width()` and `height()` give the map size in tiles.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1157`, `src/client/view/GameView.ts:1163-1168`, `src/client/view/GameView.ts:1172-1177`, `src/client/view/GameView.ts:1185`, `src/client/view/GameView.ts:1188`
- Used in: `src/game/types.ts:168-171`, `src/game/types.ts:182-187`
- Found in: #34, `research/spawn-test-bed`

### The low 12 bits of a tile state name the owner

The low 12 bits of `game.tileState(ref)` are the owner's smallID. Bit 13 marks fallout, and the map draws a fallout tile as nuked ground, not in its owner's colour. `game.tileStateBuffer()` returns a live `Uint16Array` with the state of every tile, indexed by tile ref.

- Checked at: `8ca8e5895`
- Game source: `src/client/view/GameView.ts:1123`, `src/client/render/gl/utils/TileCodec.ts:9-10`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:46-52`
- Used in: `src/game/types.ts`, `src/features/alliance-view/cursor.ts`, `src/features/nation-hatch/mask.ts:8`
- Found in: #12

### The player under the cursor is the owner of the tile there

The game turns the screen point into a world tile, then reads the owner from that tile's state. The map can move under a still cursor ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/client/controllers/HoverHighlightController.ts:52-54`
- Used in: `src/features/alliance-view/cursor.ts:1-7`
- Found in: #12

### `worldToScreenCoordinates` returns viewport CSS pixels

`transformHandler.worldToScreenCoordinates(cell)` adds the left and top of the canvas rectangle. The class reads that rectangle at start and again on each window `resize`. Nobody checked whether that rectangle stays correct when the canvas moves with no resize.

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:59-61`, `src/client/TransformHandler.ts:92-122`, `src/client/TransformHandler.ts:144-153`, `src/client/hud/GameRenderer.ts:363-365`
- Used in: `src/game/types.ts:248-257`
- Found in: `research/spawn-test-bed`

### `onGoToPlayer` moves the camera and sends no intent

`transformHandler.onGoToPlayer({ player })` moves the camera to that player's name and sends no intent. An intent is an action message to the game server. The call does nothing for a dead player, because the renderer has not placed the name.

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:206-214`, `src/client/hud/layers/BuildMenu.ts:134`
- Used in: `src/game/types.ts:258-265`
- Found in: #1, #10, #17

## Teams

### `isOnSameTeam()` compares two non-null team names

The game sets `team()` once and never changes it. `isOnSameTeam(other)` is true when both team names are non-null and equal.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:465-467`, `src/client/view/PlayerView.ts:535-537`
- Used in: `src/game/types.ts:74-75`, `src/game/types.ts:94-95`, `src/features/spawn-marks/players.ts:19-22`
- Found in: #13, #34, #37, `research/spawn-test-bed`

### Team names are colours below 8 teams

- With fewer than 8 teams, the teams have colour names, in this order: Red, Blue, Yellow, Green, Purple, Orange, Teal.
- With 8 teams or more, the names are "Team 1", "Team 2" and so on.
- In Humans Vs Nations, all humans form one team and all Nations form the other, so a solo human has no teammate.
- Bots are always on a separate Bot team.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/GameImpl.ts:108`, `src/core/game/GameImpl.ts:155-196`, `src/core/game/GameImpl.ts:204-209`, `src/core/game/GameImpl.ts:687`
- Used in: `src/features/spawn-marks/players.ts:24-26`
- Found in: #34, `research/spawn-test-bed`

### Duos, Trios and Quads make `ceil(players / size)` teams

Here `players` counts humans and Nations, and `size` is 2, 3 or 4. For example, the map World with 72 Nations gives 19 teams in Quads and 37 in Duos.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/GameImpl.ts:155-181`
- Found in: #34, `research/spawn-test-bed`

## Lobby options

### The lobby offers 2 to 7 teams and 1 to 400 Nations

The lobby offers these team counts: 2 to 7, Quads, Trios, Duos and Humans Vs Nations. The Nations slider runs from 1 to 400, as the schema allows, and World defaults to 72 Nations. When the map has fewer Nations than the lobby asks for, the game adds Nations with random names. The solo modal uses the same settings component as the host lobby.

- Checked at: `332e5410e`, source only
- Game source: `src/client/components/GameConfigSettings.ts:48-59`, `src/client/components/GameConfigSettings.ts:586-590`, `src/client/SinglePlayerModal.ts:404-440`, `src/core/Schemas.ts:343-348`, `src/core/game/NationCreation.ts:53-61`, `src/core/game/NationCreation.ts:92-142`
- Found in: #34, `research/spawn-test-bed`
