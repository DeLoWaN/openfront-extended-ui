# Testing against the live game

This file says how to test a userscript against the real OpenFront game. A userscript is a script that a userscript manager such as Tampermonkey adds to a web page. The file covers the matches to set up, what to read from the browser console, and what a test environment hides. Read it before you check a feature in a match. The project's own build and unit tests are in [development.md](../development.md).

## Run the script against the game

### Run the game on its dev server

The dev server is the local copy of the game that `npm run dev` serves from the OpenFrontIO clone, at `http://localhost:9000`. [development.md](../development.md) gives the setup. Load the script there through Tampermonkey, or paste it into the browser console. If the dev server fails because the installed packages lack a Vite feature, run `npm ci`: it changes no tracked file.

- Checked at: `332e5410e`
- Used in: `src/userscript.ts:26`
- Found in: #1, #5, #21

### Check every feature on openfront.io too

The live site ships a minified build, so it can differ from the dev server. The minifier renames the game classes: `SendAllianceExtensionIntentEvent` ships as `class s`. So a lookup by class name works on the dev server and fails with no error on openfront.io. [access.md](access.md) gives the access paths that work on both.

- Checked at: `332e5410e`
- Game source: `src/client/Transport.ts:68`
- Found in: #1, #4, #10

### Chrome runs the script only with "Allow user scripts"

Chrome runs a userscript in the page's own world only after "Allow user scripts" is on for the userscript manager in `chrome://extensions`. Without it, the script installs and shows as enabled, but it does nothing and reports no error. The script needs the page's own world to reach the game objects ([access.md](access.md)).

- Checked at: unknown
- Used in: `README.md:14`
- Found in: #1

## Solo test matches

### A solo team game keeps the spawn phase open

The spawn phase is the start of a match, when each player picks a spawn tile. A solo game has no spawn timer, so its spawn phase lasts until you click the map ([spawn.md](spawn.md)). A Nation is a computer player with a country name, and a Bot is another kind of computer player. Set up the match in this order:

1. Open Single Player.
2. Pick the map World, the size Normal, the mode Teams and the team count Quads.
3. Keep the Nations at the default. Set the Bots slider, which the lobby labels "Tribes", to 0.
4. Turn random spawn off. Random spawn places you at once and ends a solo spawn phase.
5. Start the match and do not click the map. Three Nations join your team as stand-in teammates.

- Checked at: `332e5410e`
- Game source: `src/core/GameRunner.ts:108-110`, `src/core/GameRunner.ts:114-116`, `src/core/game/TeamAssignment.ts:102-123`, `resources/lang/en.json:852`
- Used in: `src/features/spawn-marks/index.ts:32`
- Found in: #1, #34, `research/spawn-test-bed`

### What the solo test bed cannot show

The solo test bed cannot show the game's own spawn pulse, the glow that marks a teammate's spawn. The game draws that pulse for human players only, and a solo game has one human. The test bed also cannot show your own spawn. The spawn phase ends on the tick (one step of the game simulation) of your click, so your `hasSpawned()` stays false for the whole phase.

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:345`, `src/core/execution/SpawnExecution.ts:111`
- Found in: #1, #34, `research/spawn-test-bed`

### Lobby settings for many teams

The solo modal and the host lobby offer the same team count options: 2 to 7, Quads, Trios, Duos and Humans Vs Nations. The Nations slider runs from 1 to 400, and World defaults to 72 Nations. Only Nations fill these teams, so a feature for human teammates shows nothing there. [access.md](access.md) gives the team count, and [spawn.md](spawn.md) gives the team assignment rules.

- Checked at: `332e5410e`, source only
- Game source: `src/client/components/GameConfigSettings.ts:48-59`, `src/client/components/GameConfigSettings.ts:586-590`, `src/client/SinglePlayerModal.ts:404-440`, `src/core/Schemas.ts:343-348`, `src/core/game/GameImpl.ts:155-181`
- Found in: #34, #35, #37, `research/spawn-test-bed`

### A replay tests features that need no local player

`GameView` is the page's read-only copy of the match state, and its `myPlayer()` returns your own player ([access.md](access.md)). In a replay, `myPlayer()` is null for the whole match, because the local server sends no client id for a recorded game. So a feature tied to "you" draws nothing there. Use a replay to test map features that do not depend on the local player.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1007`, `src/client/LocalServer.ts:150`, `src/client/LocalServer.ts:164`
- Found in: #1, #4

## Read the game state from the console

### Read your teammates from the console in the spawn phase

Run `g = document.querySelector("control-panel").game; me = g.myPlayer();` in the browser console. Then map `g.players().filter(p => p.isOnSameTeam(me) && p !== me)` to `displayName()`, `type()`, `team()`, `hasSpawned()`, `state.spawnTile`, `g.x(tile)`, `g.y(tile)` and `nameLocation()`. Read the camera from `document.querySelector("build-menu").transformHandler`: `scale`, `offsetX` and `offsetY`. Run the snippet twice, 10 s apart: a Nation's `x` and `y` change, because Nations pick their spawn again ([spawn.md](spawn.md)).

The snippet needs `myPlayer()` to be non-null in the spawn phase, and sources disagree on that ([access.md](access.md)).

- Checked at: `332e5410e`, source only
- Found in: #4, #34, #37, `research/spawn-test-bed`

### The render debug panel edits the live render settings

The game has a render debug panel. Its sliders edit the live render settings, the object that `window.__webglView.getSettings()` returns, and a change shows at once ([rendering.md](rendering.md)). The slider limits are `mateMaxRad` 30, `selfMaxRad` 50 and `highlightRadius` 20, but the render pass itself enforces no limit. A button in the in-match settings menu opens the panel, and it is unverified whether every player sees that button.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/debug/Layout.ts:750-830`, `src/client/hud/layers/SettingsModal.ts:172`, `src/client/hud/layers/SettingsModal.ts:535`
- Found in: `research/spawn-pulse-tuning`

### Event classes are readable by name on the dev server only

The event bus is the game object that carries events between the parts of the game. It keys its listeners by event class, and the page does not expose those classes. On the dev server, a script can read the classes by name from the listener map of the bus. The live site renames them, for example to `class s`, so this lookup is a test aid only ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/EventBus.ts:11-13`, `src/core/EventBus.ts:21-43`
- Found in: #1, #4, #10, #12

### Check rebuilt numbers against the stats at game end

The page never receives the per-player stats of the simulation during play. At game end, the `WinUpdate` update carries `allPlayersStats`: the full `PlayerStats` of each human, keyed by client id. Bots and Nations have no entry. Compare these stats with any number a script rebuilt during play, such as gold per source ([events.md](events.md)).

- Checked at: `332e5410e`
- Game source: `src/core/game/GameUpdates.ts:335`, `src/core/Schemas.ts:430`
- Found in: #2, #8

## Test with several humans

### Use one browser profile per human

The player id is a random id in `localStorage`, so every tab of one browser profile is the same player. The server treats a second join with that id as a rejoin: it moves the player to the new connection and closes the old one. For a test with several humans, give each human one of these:

- a normal window, and a private window for the second human
- a second browser profile
- another browser

- Checked at: `332e5410e`
- Game source: `src/client/Auth.ts:13`, `src/client/Auth.ts:361-368`, `src/server/Worker.ts:547-562`, `src/server/GameServer.ts:801-835`
- Found in: #1, #34, #37, `research/spawn-test-bed`

### Set up a private lobby with several humans

A private lobby is a match that a host creates and shares through a link. The host's start button stays disabled below 2 clients, and the host picks Teams and a team count in the lobby. The join link has the form `http://localhost:9000/w<n>/game/<id>` and shows in the host's address bar unless streamer mode is on. For a real teammate check, use two profiles with Teams, Duos and World: the game's spawn pulse then draws for both humans.

- Checked at: `332e5410e`, source only
- Game source: `src/client/HostLobbyModal.ts:490-492`, `src/client/HostLobbyModal.ts:622`, `src/client/Main.ts:815-840`, `src/client/Main.ts:1043-1051`, `src/client/WebGLFrameBuilder.ts:345-367`
- Found in: #34, `research/spawn-test-bed`

### The host can pause a private lobby

The host of a private lobby can pause the game. A pause stops the turns, the steps of the match that the server sends, so the spawn timer stops too. It is unverified whether the pause button works in the spawn phase.

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/layers/GameRightSidebar.ts:406-410`, `src/server/GameServer.ts:591-627`
- Found in: `research/spawn-test-bed`

### The dev environment relaxes the multi-tab and address checks

The multi-tab detector of the game does not run in these cases:

- in the spawn phase
- in a solo game
- in the dev environment

The server skips its same-address and duplicate-account limits in the dev environment.

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/layers/MultiTabModal.ts:32-37`, `src/server/GameServer.ts:730-762`
- Found in: `research/spawn-test-bed`

## Limits of the test environment

### The in-match settings menu pauses a solo game

The in-match settings menu pauses a solo game while it is open. Anything that a script draws on a tick does not redraw until the menu closes.

- Checked at: unknown
- Found in: #41

### Nations form no alliances early in a match

Nations need hundreds of ticks before they form alliances. So a test early in a match sees no alliance between Nations ([alliances.md](alliances.md)).

- Checked at: `332e5410e`
- Found in: #13, #14

### A local solo match ran at one tick per second in the agent browser

The agent browser is the browser pane that an AI agent drives for tests. In it, a local solo match ran at about one tick per second, not 10. That rate is too slow to see Nations form alliances. So the tests of the alliance code used a stub of `allies()` on a few players.

- Checked at: `332e5410e`
- Found in: #13, #14

### A hidden browser pane slows timers and stops frames

In a hidden browser pane, a long-lived timer fires about once a minute, and the game's clock froze with it. `requestAnimationFrame` never runs there. Drive per-frame code by hand in such a pane, for example through a debug function on `window`.

- Checked at: `332e5410e`
- Found in: #14

### The agent browser sends key events with an empty `code`

The agent browser sends key events whose `KeyboardEvent.code` is empty. Test any code that reads `code` with a real keyboard.

- Checked at: unknown
- Found in: #41
