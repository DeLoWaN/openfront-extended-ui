# Tests against the live game

This file says how to test a userscript against the real OpenFront game. A userscript is a script that a userscript manager such as Tampermonkey adds to a web page. The file covers the matches to set up, what to read from the browser console, and what a test environment hides. Read it before you check a feature in a match. The project's own build and unit tests are in [development.md](../development.md).

## Run the script against the game

### The dev server runs at `localhost:9000`

The dev server is the local copy of the game that `npm run dev` serves from the OpenFrontIO clone, at `http://localhost:9000`. [development.md](../development.md) gives the setup. Load the script there through Tampermonkey, or paste it into the browser console. If the dev server fails because the installed packages lack a Vite feature, run `npm ci`: it changes no tracked file.

- Checked at: `332e5410e`
- Game source: `package.json:9`, `vite.config.ts:331-332`
- Used in: `src/userscript.ts:20-26`
- Found in: #1, #5, #21

### openfront.io ships a minified build

The live site ships a minified build, so it can differ from the dev server. The minifier renames the game classes, so a lookup by class name fails there with no error ([access.md](access.md)). Check every feature on openfront.io too.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:68`
- Found in: #1, #4, #10

### Chrome runs the script only with "Allow user scripts"

Chrome runs a userscript in the page's own world only after "Allow user scripts" is on for the userscript manager in `chrome://extensions`. Without it, the script also shows as enabled and reports no error ([access.md](access.md)).

- Checked at: live game, date unknown
- Game source: none, seen in a match
- Used in: `README.md:14`
- Found in: #1

## Solo test matches

### A solo game keeps the spawn phase open until your click

A solo game has no spawn timer, so its spawn phase lasts until you click the map ([spawn.md](spawn.md)). Random spawn places you at once, so it ends a solo spawn phase.

- Checked at: `332e5410e`
- Game source: `src/core/GameRunner.ts:108-110`, `src/core/GameRunner.ts:114-116`
- Found in: #1, #34, `research/spawn-test-bed`

### A solo Quads match on World gives you three Nation teammates

1. In Single Player, pick the map World, the size Normal, the mode Teams and the team count Quads.
2. Keep the default count of Nations, the computer players with country names.
3. Set the slider that the lobby labels "Tribes" to 0, so no Bot (another kind of computer player) joins.
4. Turn random spawn off, start the match, and do not click the map.

- Checked at: `332e5410e`
- Game source: `src/core/game/TeamAssignment.ts:102-123`, `resources/lang/en.json:852`
- Used in: `src/features/spawn-marks/index.ts:42-43`
- Found in: #1, #34, `research/spawn-test-bed`

### The solo test bed shows no teammate pulse and no spawn of your own

The solo test bed cannot show the spawn pulse of a teammate (see `CONTEXT.md`). The game draws that pulse for human teammates only, and a solo game has one human. The test bed also cannot show your own spawn. The spawn phase ends on the tick of your click, so your `hasSpawned()` stays false for the whole phase ([access.md](access.md)).

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:345`, `src/core/execution/SpawnExecution.ts:111`
- Found in: #1, #34, `research/spawn-test-bed`

### Only Nations fill the teams of a solo game

A solo game holds one human, so Nations fill every other place on the teams. A feature for human teammates therefore shows nothing there. [access.md](access.md) gives the team count and Nation count options.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/TeamAssignment.ts:102-123`, `src/core/game/GameImpl.ts:155-181`
- Found in: #34, #35, #37, `research/spawn-test-bed`

### `myPlayer()` is null in a replay

`GameView` is the page's read-only copy of the match state, and its `myPlayer()` returns your own player ([access.md](access.md)). In a replay, `myPlayer()` is null for the whole match, because the local server sends no client id for a recorded game. So a replay can test only the map features that do not depend on the local player.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1007`, `src/client/LocalServer.ts:150`, `src/client/LocalServer.ts:164`
- Found in: #1, #4

## Read the game state from the console

### The console can read your teammates in the spawn phase

Run `g = document.querySelector("control-panel").game; me = g.myPlayer();` in the browser console. Then map `g.players().filter(p => p.isOnSameTeam(me) && p !== me)` to `displayName()`, `type()`, `team()`, `hasSpawned()`, `state.spawnTile`, `g.x(tile)`, `g.y(tile)` and `nameLocation()`. The camera is `document.querySelector("build-menu").transformHandler`, with `scale`, `offsetX` and `offsetY`. The snippet needs a non-null `myPlayer()` in the spawn phase, and sources disagree on that ([access.md](access.md)).

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/layers/ControlPanel.ts:28`, `src/client/hud/layers/BuildMenu.ts:134`
- Found in: #4, #34, #37, `research/spawn-test-bed`

### The render debug panel edits the live render settings

The game has a render debug panel. Its sliders edit the live render settings, the object that `window.__webglView.getSettings()` returns, and a change shows at once ([rendering.md](rendering.md)). The slider limits are `mateMaxRad` 30, `selfMaxRad` 50 and `highlightRadius` 20, but the render pass itself enforces no limit. A button in the in-match settings menu opens the panel, and it is unverified whether every player sees that button.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/debug/Layout.ts:750-830`, `src/client/hud/layers/SettingsModal.ts:172`, `src/client/hud/layers/SettingsModal.ts:535`
- Found in: `research/spawn-pulse-tuning`

### Event classes are readable by name on the dev server only

The event bus carries events between the parts of the game, and it keys its listeners by event class. The page does not expose those classes. On the dev server, a script can read them by name from the listener map of the bus. On openfront.io the names differ, for example `class s` ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/core/EventBus.ts:21-43`
- Found in: #1, #4, #10, #12

### `WinUpdate` carries the stats of every human at game end

The page never receives the per-player stats of the simulation during play. At game end, the `WinUpdate` update carries `allPlayersStats`: the full `PlayerStats` of each human, keyed by client id. Bots and Nations have no entry. A script can compare these stats with any number that it rebuilt during play, such as gold per source ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:335`, `src/core/Schemas.ts:430`
- Found in: #2, #8

## Test with several humans

### All tabs of one browser profile are the same player

Every tab of one browser profile shares the player id, a random id in `localStorage`. The server treats a second join with that id as a rejoin and closes the old connection, so use one of these setups for two humans:

* a normal window and a private window
* two browser profiles, or two browsers

- Checked at: `332e5410e`
- Game source: `src/client/Auth.ts:13`, `src/client/Auth.ts:361-368`, `src/server/Worker.ts:547-562`, `src/server/GameServer.ts:801-835`
- Found in: #1, #34, #37, `research/spawn-test-bed`

### A private lobby needs 2 clients to start

A private lobby is a match that a host creates and shares through a link. The host's start button stays disabled below 2 clients, and the host picks Teams and a team count in the lobby. The join link has the form `http://localhost:9000/w<n>/game/<id>` and shows in the host's address bar unless streamer mode is on. With two profiles, Teams, Duos and World, the game draws the spawn pulse for both humans.

- Checked at: `332e5410e`, source only
- Game source: `src/client/HostLobbyModal.ts:490-492`, `src/client/HostLobbyModal.ts:622`, `src/client/Main.ts:815-840`, `src/client/Main.ts:1043-1051`, `src/client/WebGLFrameBuilder.ts:345-367`
- Found in: #34, `research/spawn-test-bed`

### The host can pause a private lobby

The host of a private lobby can pause the game. A pause stops the turns, the steps of the match that the server sends, so the spawn timer stops too. It is unverified whether the pause button works in the spawn phase.

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/layers/GameRightSidebar.ts:406-410`, `src/server/GameServer.ts:591-627`
- Found in: `research/spawn-test-bed`

### The multi-tab detector skips three cases

The multi-tab detector of the game does not run in these cases:

* in the spawn phase
* in a solo game
* in the dev environment

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/layers/MultiTabModal.ts:32-37`
- Found in: `research/spawn-test-bed`

### The dev environment lifts the address and account limits

The server skips its same-address and duplicate-account limits in the dev environment.

- Checked at: `332e5410e`, source only
- Game source: `src/server/GameServer.ts:730-762`
- Found in: `research/spawn-test-bed`

## Limits of the test environment

### The in-match settings menu pauses a solo game

The in-match settings menu pauses a solo game while it is open. Anything that a script draws on a tick does not redraw until the menu closes.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/GameRightSidebar.ts:279-283`, `src/client/hud/layers/SettingsModal.ts:119-123`
- Found in: #41

### A solo match runs at one tick per second in the agent browser

The agent browser is the browser pane that an AI agent drives for tests. In it, a local solo match ran at about one tick per second, far below the normal rate ([access.md](access.md)). That rate is too slow to see Nations form alliances ([alliances.md](alliances.md)).

- Checked at: live game, 2026-08-25
- Game source: none, seen in a match
- Found in: #13, #14

### A hidden agent browser slows timers and draws no frames

When the agent browser is hidden, a long-lived timer fires about once a minute, and the game's clock stops with it. `requestAnimationFrame` never runs there. Drive per-frame code by hand in such a pane, for example through a debug function on `window`.

- Checked at: live game, 2026-08-25
- Game source: none, seen in a match
- Found in: #14

### The agent browser sends key events with an empty `code`

The agent browser sends key events whose `KeyboardEvent.code` is empty. Test any code that reads `code` with a real keyboard.

- Checked at: live game, 2026-10-27
- Game source: none, seen in a match
- Found in: #41
