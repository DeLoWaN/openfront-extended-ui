# The spawn phase

This file covers the spawn phase, the first part of a match where each player picks a spawn tile, the tile where the player's land starts. It also covers teams and how the game draws its spawn pulse, the animated marks on spawn tiles. Read it before you write a feature that runs before the match proper starts.

## The spawn phase

### Gate spawn features on `inSpawnPhase()`

`GameView.inSpawnPhase()` is `startTick === null`. `GameView` is the game's object for the current match (see [access.md](access.md)). The method is true until a `SpawnPhaseEnd` update arrives. A test for "the match is live" that requires `!inSpawnPhase()` is false for the whole spawn phase, so a spawn feature must gate on `inSpawnPhase()` itself.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:318-321`, `src/client/view/GameView.ts:1070-1072`
- Used in: `src/game/types.ts:166`, `src/features/spawn-marks/index.ts:72`
- Found in: #1, #4, #34, #37, `research/spawn-test-bed`

### Spawn phase length

`numSpawnPhaseTurns()` returns 300 ticks (30 seconds) for multiplayer, 150 ticks with random spawn, and 100 ticks for a solo game, but nothing reads the solo value. A tick is one step of the game simulation, 10 per second by default. A speed setting changes the rate in singleplayer and replays, and a pause stops it. The right sidebar counts down the 300 ticks, divides by 10 for seconds, and shows no countdown in a solo game.

- Checked at: `332e5410e`, source only
- Game source: `src/core/configuration/Config.ts:637-645`, `src/core/execution/SpawnTimerExecution.ts:10-13`, `src/client/hud/layers/GameRightSidebar.ts:143-156`
- Found in: `research/spawn-test-bed`

### No spawn timer in a solo game

The game starts the spawn timer only outside solo games. Only two things end the spawn phase: the timer, and the human's spawn pick in a solo game. So a solo spawn phase lasts until the player clicks a spawn tile.

- Checked at: `332e5410e`
- Game source: `src/core/GameRunner.ts:108-110`, `src/core/execution/SpawnTimerExecution.ts:12`, `src/core/execution/SpawnExecution.ts:111`
- Found in: #1, #34, `research/spawn-test-bed`

### Random spawn ends a solo spawn phase at once

With random spawn on, the game places the human player at the start of the match. In a solo game, this ends the spawn phase immediately.

- Checked at: `332e5410e`, source only
- Game source: `src/core/GameRunner.ts:114-116`, `src/core/execution/SpawnExecution.ts:103-111`
- Found in: `research/spawn-test-bed`

### `myPlayer()` in the spawn phase

Sources disagree on whether `myPlayer()` is null before the local player spawns. [access.md](access.md) gives both claims. A script must work in both cases until someone settles this in a match.

- Used in: `src/features/spawn-marks/players.ts:35-36`

## Spawn position

### `state.spawnTile` and `hasSpawned()`

`PlayerView.state.spawnTile` is the tile that the player has picked now. A `PlayerView` is the game's object for one player. `spawnTile` is `undefined` until the player picks a tile, and it follows a new pick on the same tick. `hasSpawned()` is true once `spawnTile` is set.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:92`, `src/client/view/PlayerView.ts:648-650`, `src/core/game/PlayerImpl.ts:352`, `src/core/game/PlayerImpl.ts:618-628`, `src/core/game/GameUpdates.ts:255`
- Used in: `src/game/types.ts:63`, `src/game/types.ts:78`, `src/features/spawn-marks/players.ts:57`
- Found in: #34, #37, `research/spawn-test-bed`

### Spawns move in the spawn phase

A human player picks a new spawn tile on every click. A Nation (a country that the computer plays) picks its first spawn tile in the first tick it runs. It then picks again every 30 to 100 ticks (3 to 10 seconds); the difficulty sets the period. So a script must read `spawnTile` on every tick and cache nothing.

- Checked at: `332e5410e`, source only
- Game source: `src/core/execution/NationExecution.ts:74-90`, `src/core/execution/NationExecution.ts:108-113`
- Found in: #1, #34, #37, `research/spawn-test-bed`

### A spawn claims a disc of radius 4 tiles

A spawn claims the tiles within 4 tiles of the spawn centre, a disc about 8 tiles across. The game's name box uses a spawn region of 8.

- Checked at: `332e5410e`, source only
- Game source: `src/core/execution/Util.ts:145`, `src/core/game/GameMap.ts:542-562`, `src/client/hud/NameBoxCalculator.ts:19`
- Found in: #1, `research/spawn-test-bed`

### `nameLocation()` in the spawn phase

In the spawn phase, `nameLocation()` returns `{x, y, size}` at the spawn tile, with `y` raised by `fontSize / 3`. The game computes it again on every spawn phase tick for each spawned human and Nation, and it is `undefined` before the player spawns. For the exact spawn centre, use `state.spawnTile` with `GameView.x()` and `GameView.y()`. Use `nameLocation()` only for a label that must sit with the player's name.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:436-438`, `src/core/GameRunner.ts:179-188`, `src/client/hud/NameBoxCalculator.ts:26-44`, `src/client/WebGLFrameBuilder.ts:355-357`
- Used in: `src/game/types.ts:102`, `src/features/spawn-marks/players.ts:28-29`
- Found in: #14, #34, #37, `research/spawn-test-bed`

### Team spawn areas group a team's Nations

On 25 maps, the map manifest has `teamGameSpawnAreas`, for example `aegean`, `korea` and `vietnam`. On these maps, the Nations of each team spawn inside one box of the map. `world` has no such areas, so its Nations spawn at their manifest positions.

- Checked at: `332e5410e`, source only
- Game source: `src/core/execution/NationExecution.ts:129-148`, `resources/maps/*/manifest.json`
- Found in: #34, `research/spawn-test-bed`

## Teams and teammates

[access.md](access.md) explains `team()`, `isOnSameTeam()`, team names and the team count.

### Team assignment rules

The game puts players on teams by two rules:

- With Duos, Trios or Quads, the game places the human first and fills the fuller team first. So Nations fill the human's team, and two humans land on one team.
- With a plain team count (2 to 7), each player goes to the smallest team. So two humans land on different teams.

In both cases, clan members go together, and the game prefers to keep friends together.

- Checked at: `332e5410e`, source only
- Game source: `src/core/game/TeamAssignment.ts:33-100`, `src/core/game/TeamAssignment.ts:102-123`, `src/core/game/TeamAssignment.ts:136-148`
- Found in: `research/spawn-test-bed`

## Camera and size on screen

### Camera at the start of a match

When the renderer starts, the game calls `centerAll(0.9)`. It centres the camera on the map centre with `scale = min(viewWidth / mapWidth, viewHeight / mapHeight) * 0.9`, where `scale` is CSS pixels per tile (see [rendering.md](rendering.md)). The default `scale` of 1.8 applies only before `centerAll` runs. In a solo game, nothing moves the camera before the player clicks, except a random spawn or the end of the spawn phase.

- Checked at: `332e5410e`, source only
- Game source: `src/client/hud/GameRenderer.ts:368`, `src/client/TransformHandler.ts:34`, `src/client/TransformHandler.ts:388-404`, `src/client/ClientGameRunner.ts:903-930`, `src/client/ClientGameRunner.ts:981-990`
- Used in: `src/features/spawn-marks/geometry.ts:9-10`
- Found in: #34, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### Size of a spawn and of the pulse on screen

The size on screen is the size in tiles times the camera `scale`. The start scale depends on the map and on the viewport size:

- 1440x900 viewport: Onion 1.58, compact World 1.30, World 0.65, Europe 0.45, Giant World 0.32
- 1920x1080 viewport: World 0.864, Europe 0.581, Achiran 0.572

So at 1440x900, an 8-tile spawn is 5.2 px across on World and 2.5 px on Giant World. The default teammate ring, 16.1 tiles at its peak, is 13.9 px on World at 1920x1080 and 3.2 px at zoom 0.2. Issue #1 gives a spawn of about 5 px with the whole map in view, and a ring of about 3 px fully zoomed out and about 7 px at the largest radius. Issue #1 states no viewport for these numbers.

- Checked at: `332e5410e`, source only
- Game source: `src/client/TransformHandler.ts:388-404`, `resources/maps/*/manifest.json`
- Found in: #1, #33, #34, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

## The game's spawn pulse

### Only human players get a spawn pulse

The frame builder gives a spawn pulse only to players of type `"HUMAN"`. A human who has not picked a spawn tile yet gets none. Nations and bots never get a pulse, so a solo game shows no pulse from the game at all.

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:345`, `src/client/WebGLFrameBuilder.ts:347`, `src/core/game/Game.ts:357`
- Used in: `src/game/types.ts:49`, `src/features/spawn-marks/players.ts:23-24`
- Found in: #1, #33, #34, #35, #37, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### Three kinds of pulse mark

`SpawnOverlayPass` draws one instanced quad per spawn tile and paints a ring or a disc inside it. Each quad has a kind: 0 for an enemy, 1 for the local player, 2 for a teammate. A teammate exists only in a team game: a player on the local player's team who is not the local player. Every other human, in any game mode, is an enemy for this pass.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/passes/SpawnOverlayPass.ts:9-12`, `src/client/render/gl/passes/SpawnOverlayPass.ts:35-37`, `src/client/render/gl/passes/SpawnOverlayPass.ts:187`, `src/client/render/gl/passes/SpawnOverlayPass.ts:243`, `src/client/WebGLFrameBuilder.ts:364-367`
- Found in: `research/spawn-pulse-tuning`

### Draw order and shape of the marks

The renderer runs `SpawnOverlayPass` after the territory pass, so the marks sit on top of owned land. The pass draws enemies first, then teammates, then the local player, with normal alpha blend. An enemy disc is flat, at full alpha, with a hard edge, and the pass draws it only on tiles that nobody owns. A teammate ring is a soft gradient with a pulse in radius and alpha, and the pass draws it on any tile.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/Renderer.ts:1335`, `src/client/render/gl/passes/SpawnOverlayPass.ts:184-194`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:30-40`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:42-80`
- Found in: #35, #37, `research/spawn-pulse-tuning`

### Colours of the rings

The teammate ring uses `p.territoryColor()` of that player, which the game copies into the instance buffer. The game builds the instance data again on every tick, so a colour that a script writes there lasts one tick at most. The local player's ring pulses from white to the player's colour, or from white to gold without a team. In a team game, territory colours come from the team, so teammates share one colour family.

- Checked at: `332e5410e`, source only
- Game source: `src/client/WebGLFrameBuilder.ts:352-353`, `src/client/WebGLFrameBuilder.ts:360-362`, `src/client/render/gl/passes/SpawnOverlayPass.ts:178-180`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:48`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:52-54`, `src/client/theme/ThemeProvider.ts:143-147`
- Found in: #1, #33, `research/spawn-pulse-tuning`

### Spawn overlay settings and their defaults

`spawnOverlay` in the render settings holds these values, with radii in map tiles:

- `mateMinRad` 5 and `mateMaxRad` 14
- `selfMinRad` 10 and `selfMaxRad` 30
- `animSpeed` 0.008
- `gradientSolidEnd` 0.1 and `gradientInnerEdge` 0.01
- `highlightRadius` 9 and `highlightAlpha` 1.0

`animSpeed` is in radians per millisecond, which gives one pulse about every 785 ms.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/render-settings.json:325-335`, `src/client/render/gl/RenderSettings.ts:379-389`
- Found in: `research/spawn-pulse-tuning`

### What each spawn overlay setting drives

`mateMinRad` is the inner radius of the teammate ring: alpha rises from 0 at the centre to 1 there. `mateMaxRad` is the outer radius, and it also sets the quad size; `selfMinRad` and `selfMaxRad` do the same for the local player's ring. `gradientSolidEnd` is the share of the ring body at full alpha before the fade. `highlightRadius` is the radius of the enemy disc and sets its quad size, and `highlightAlpha` is the disc opacity.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:35-76`, `src/client/render/gl/passes/SpawnOverlayPass.ts:164-166`, `src/client/render/gl/passes/SpawnOverlayPass.ts:218`, `src/client/render/gl/passes/SpawnOverlayPass.ts:222`
- Found in: `research/spawn-pulse-tuning`

### `gradientInnerEdge` has no effect

The pass uploads `gradientInnerEdge` in the `uGradientStops` uniform, but the shader reads only the `y` part of that uniform. So a write to `gradientInnerEdge` changes nothing.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/passes/SpawnOverlayPass.ts:237`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:15`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:66`
- Found in: #33, `research/spawn-pulse-tuning`

### The pulse ranges are shader constants

The ring radius pulses from 0.5 to 1.15 times the max radius, and the alpha from 0.65 to 1.0. Both ranges are constants in the fragment shader, and no setting reaches them.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:61`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.frag.glsl:79`
- Found in: #33, `research/spawn-pulse-tuning`

### The quad size has no cap

The quad radius is `maxRad * 1.15 + 1`, where 1.15 matches the peak of the radius pulse. The vertex shader places the quad at `center + local * r` with no cap, so a radius that stays the same is never clipped. The cost grows with the square of the radius, with one quad per spawn tile.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/passes/SpawnOverlayPass.ts:29-32`, `src/client/render/gl/passes/SpawnOverlayPass.ts:164-165`, `src/client/render/gl/shaders/spawn-overlay/spawn-overlay.vert.glsl:20-28`
- Found in: #33, `research/spawn-pulse-tuning`

### The spawn overlay settings are live and writable

`window.__webglView` is the `MapRenderer`, and `getSettings()` returns the renderer's own settings object. The pass keeps a reference to its `spawnOverlay` part and reads it on every use. So `window.__webglView.getSettings().spawnOverlay.mateMaxRad = 28` takes effect with no rebuild. `getSettings()` returns `{}` while the WebGL context is lost, so a script must guard against an `undefined` `spawnOverlay` (see [rendering.md](rendering.md)).

- Checked at: `332e5410e`, source only
- Game source: `src/client/ClientGameRunner.ts:394`, `src/client/render/gl/MapRenderer.ts:104-110`, `src/client/render/gl/MapRenderer.ts:350-351`, `src/client/render/gl/Renderer.ts:454-460`, `src/client/render/gl/passes/SpawnOverlayPass.ts:87`
- Used in: `src/game/types.ts:209`
- Found in: #1, #33, `research/spawn-pulse-tuning`

### Write into the settings object, never replace it

The pass holds the original `spawnOverlay` object. A script that assigns a new object, as in `getSettings().spawnOverlay = {...}`, changes nothing in the pass. Only property writes on the original object reach the pass.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/passes/SpawnOverlayPass.ts:54`, `src/client/render/gl/passes/SpawnOverlayPass.ts:87`
- Found in: `research/spawn-pulse-tuning`

### When a spawn overlay change shows on screen

The shader reads both radii, `gradientSolidEnd`, `animSpeed` and `highlightAlpha` as uniforms, so a change to them shows on the next frame. The pass sets the quad size in its `update()`, which runs once per game tick. So after a radius increase, the ring can stay clipped to the old square for up to one tick. A radius decrease has no such effect.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/passes/SpawnOverlayPass.ts:163-166`, `src/client/render/gl/passes/SpawnOverlayPass.ts:218`, `src/client/render/gl/passes/SpawnOverlayPass.ts:230-237`, `src/client/ClientGameRunner.ts:876`, `src/client/WebGLFrameBuilder.ts:213`, `src/client/WebGLFrameBuilder.ts:370`
- Found in: #33, `research/spawn-pulse-tuning`

### A graphics settings change resets the spawn overlay

When the player changes any graphics setting, the game builds fresh defaults and copies them over the live settings object. The graphics overrides hold no `spawnOverlay` entry, so the spawn values go back to their defaults. The reset button of the render debug panel does the same (see [testing.md](testing.md)). A script must write its values again, and a write on every tick costs little.

- Checked at: `332e5410e`, source only
- Game source: `src/client/ClientGameRunner.ts:625-627`, `src/client/ClientGameRunner.ts:642-652`, `src/client/render/gl/SettingsUtils.ts:12-29`, `src/client/render/gl/RenderOverrides.ts`, `src/client/render/gl/debug/Wiring.ts:100-106`
- Found in: #1, #33, #37, `research/spawn-pulse-tuning`

### `updateSpawnOverlay` is public but the game overwrites it

`MapRenderer.updateSpawnOverlay(inSpawnPhase, centers)` is public, and `centers` carries one colour per spawn. The game calls it again on every tick. So a call from a script lasts only until the next tick.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/MapRenderer.ts:261-263`, `src/client/WebGLFrameBuilder.ts:370`
- Found in: `research/spawn-pulse-tuning`
