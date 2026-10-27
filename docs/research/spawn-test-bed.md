# What can a script read at spawn, and how do we get teammates to test with?

Research for [issue #34](https://github.com/DeLoWaN/openfront-extended-ui/issues/34), part of the map at [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1).

Game paths below are relative to `src/` in `/Users/damien/git_perso/OpenFrontIO/`, pinned at commit `332e5410e`. Package paths are relative to the root of this repository. The game moves fast, so check a line number before you rely on it.

Nothing here was run live. Every claim comes from reading the source. A claim that only a live run can confirm carries the word **unverified**.

## Answer

**Test in a solo game with the team mode "Quads".** One browser tab is enough. You get a spawn phase with three teammates, and the spawn phase has no time limit.

Why it works:

- The solo lobby lets you pick a team mode. The game puts the Nations into the teams, so Nations become your teammates.
- The game has no spawn timer in a solo game. The spawn phase lasts until you click a spawn tile. If you never click, it never ends.
- Every Nation picks a spawn tile on its own during that phase. A script can read each one.

What this setup cannot show:

- **The game's own spawn pulse.** The pulse draws human players only, and a solo game has one human. So you never see the pulse under your mark. Check that alignment once with real humans, in the second setup below.
- **Your own spawn.** The spawn phase ends on the same tick you click. In the solo test, `hasSpawned()` stays false for you for the whole phase.

## Terms

- **Spawn phase**: the time before the match starts, when each player picks a spawn tile.
- **Spawn pulse**: what the game draws on a spawn tile during the spawn phase. It draws one for each human player.
- **Nation**: a computer player. It picks its own spawn tile.
- **Teammate**: a player on your team in a team game. This is not an alliance partner.
- **Tick**: one step of the game simulation. The game runs 10 ticks per second (`client/hud/layers/GameRightSidebar.ts:153-154`).
- **Camera**: the pan and zoom of the map. Its object is the `TransformHandler`.

## The recommended test, step by step

1. Run the game from `/Users/damien/git_perso/OpenFrontIO/` with `npm run dev`. The page is `http://localhost:9000`. The built userscript already matches that address (`dist/openfront-extended-ui.user.js:13`, `@include http://localhost:9000/*`).
2. Open the page with the userscript installed. Open Single Player.
3. Pick a map that has no team spawn areas, for example **World**. Keep the size on Normal.
4. Set the mode to **Teams**. Set the team count to **Quads**.
5. Leave Nations on the map default. Set Bots to 0. Leave "random spawn" off.
6. Start the game. **Do not click the map.** The spawn phase now waits for you.
7. In the browser console, read the fields (snippet at the end of this file).

Why each choice:

- **Teams, Quads.** In "Quads" the game makes teams of four. The human is placed first and fills the first team with Nations (`core/game/TeamAssignment.ts:102-123`, `:136-148`). You get three Nation teammates. "Duos" gives one and "Trios" gives two.
- **Plain numbers (2 to 7) also work** but give uneven teams. The game puts each player on the smallest team (`TeamAssignment.ts:120`), so the Nations spread out and your team gets about `Nations / teams` of them.
- **Do not use "Humans Vs Nations".** The humans go to one team and all Nations to the other. You would have no teammate (`core/game/GameImpl.ts:204-209`).
- **A map with no team spawn areas.** On 25 maps the manifest has `teamGameSpawnAreas` (for example `aegean`, `korea`, `vietnam`). There, each team's Nations spawn inside one box of the map (`core/execution/NationExecution.ts:129-148`). Your teammates would sit close together. That is easier than the real problem. `world` has no such areas, so its Nations spawn at their manifest positions, spread over the map. This claim about spread is **unverified**.
- **Random spawn off.** With random spawn on, the game spawns the human at start. In a solo game that ends the spawn phase at once (`core/GameRunner.ts:114-116`, `core/execution/SpawnExecution.ts:103-111`).
- **Bots 0.** Bots spawn too, but they are on the separate Bot team (`core/game/GameImpl.ts:108`, `:687`). They only add noise.

## How many teammates and teams can a solo lobby hold?

- **Nations:** 1 to 400. The setting is a slider with `max="400"` (`client/components/GameConfigSettings.ts:586-590`). The schema agrees (`core/Schemas.ts:343-348`). When the map has fewer Nations than you ask for, the game adds Nations with random names (`core/game/NationCreation.ts:53-61`, `:92-142`).
- **Team counts in the lobby:** 2, 3, 4, 5, 6, 7, Quads, Trios, Duos, Humans Vs Nations (`client/components/GameConfigSettings.ts:48-59`). The solo modal uses the same component (`client/SinglePlayerModal.ts:404-440`).
- **Many teams:** Duos, Trios and Quads make `ceil(players / size)` teams (`core/game/GameImpl.ts:155-181`). With the default 72 Nations on World, Quads gives 19 teams and Duos gives 37. From 8 teams up, the game names them "Team 1", "Team 2" and so on (`GameImpl.ts:182-196`). This is the "many teams" case that issue #1 describes.
- **Largest teammate group in the lobby:** Quads gives 3 teammates. A numeric count of 2 gives about half of all players, so with 72 Nations that is about 36 teammates.

## The spawn phase in a solo game

| Fact | Source |
| --- | --- |
| The game starts the spawn timer only outside solo games. | `core/GameRunner.ts:108-110` |
| `numSpawnPhaseTurns()` returns 100 for a solo game, but nothing reads it there. The value is dead for solo. Other games get 300 (150 with random spawn). | `core/configuration/Config.ts:637-645`, `core/execution/SpawnTimerExecution.ts:10-13` |
| Only two places end the spawn phase: the timer, and the human's spawn pick in a solo game. | `core/execution/SpawnTimerExecution.ts:12`, `core/execution/SpawnExecution.ts:111` |
| The game's own sidebar knows this and shows no countdown in a solo game. | `client/hud/layers/GameRightSidebar.ts:143-153` |
| A Nation picks its first spawn tile in the first tick it runs. | `core/execution/NationExecution.ts:107-160` |
| **A Nation re-picks its spawn tile every 30 to 100 ticks** (3 to 10 seconds), depending on difficulty. So `spawnTile` of a Nation changes during the phase. A script must read it on every tick and cache nothing. | `core/execution/NationExecution.ts:108-113`, `:74-90` |

The previous exploration said that `Config.ts:637-645` gives the spawn phase length. That holds for real multiplayer. It does not hold for a solo game.

## What a script can read at spawn

A script reaches the match through `document.querySelector("control-panel").game`. This is how the package already does it (`src/runtime/lifecycle.ts:47-54`). The match object is the `GameView`. The game sets it before the spawn phase, so the package's match start fires during the spawn phase. That claim about timing is **unverified**.

### On the match (`GameView`)

| Field or method | What it gives at spawn | Source |
| --- | --- | --- |
| `inSpawnPhase()` | True until the phase ends. It is `startTick === null`. | `client/view/GameView.ts:1070-1072`; the field is set at `:318-321` |
| `ticks()` | The current tick. | `client/view/GameView.ts:1066` |
| `players()` | Every player: humans, Nations and bots. Dead and unspawned ones too. | `client/view/GameView.ts:1019` |
| `myPlayer()` | Your player. Non-null from the first game update, even before you spawn. | `client/view/GameView.ts:1007`, `:462` |
| `x(tile)` and `y(tile)` | World coordinates of a tile reference. | `client/view/GameView.ts:1163-1168` |
| `width()` and `height()` | The map size in tiles. | `client/view/GameView.ts:1172-1177` |

`myPlayer()` is non-null because the game creates every player before the first tick (`core/game/GameImpl.ts:197-231`) and sends a full snapshot of each one on its first update (`core/game/PlayerImpl.ts:153`). The package types say `myPlayer()` is "null before the local player spawns" (`src/game/types.ts`, on `GameView.myPlayer`). That comment looks wrong for this reason. That is **unverified** live.

### On each player (`PlayerView`)

| Field or method | What it gives at spawn | Source |
| --- | --- | --- |
| `state.spawnTile` | The tile the player has picked now. `undefined` until the player picks. It tracks a re-pick on the same tick. | `client/view/PlayerView.ts:92`; `core/game/PlayerImpl.ts:352`, `:622-628`; `core/game/GameUpdates.ts:255` |
| `hasSpawned()` | True once `spawnTile` is set. | `client/view/PlayerView.ts:648-650`; `core/game/PlayerImpl.ts:618-620` |
| `nameLocation()` | `{ x, y, size }` in world tiles. During the spawn phase it is the spawn tile, with `y` raised by a third of the font size. It exists for Humans and Nations that have spawned. It is `undefined` before. | `client/view/PlayerView.ts:436-438`; `core/GameRunner.ts:179-188`; `client/hud/NameBoxCalculator.ts:26-44` |
| `team()` | The team name, for example "Team 1". `null` in a game without teams. It is set once and never changes. | `client/view/PlayerView.ts:465-467` |
| `isOnSameTeam(other)` | True when both teams are not null and equal. In a game without teams it is always false, even for yourself. | `client/view/PlayerView.ts:535-537` |
| `type()` | `"HUMAN"`, `"NATION"` or `"BOT"`. | `client/view/PlayerView.ts:468-480`; `core/game/Game.ts:357-361` |
| `isAlive()` | True once the player owns at least one tile. A spawned player is alive. | `client/view/PlayerView.ts:481-483`; `core/game/PlayerImpl.ts:614-616` |
| `smallID()`, `id()`, `clientID()` | The identifiers. `clientID()` is set for humans only. | `client/view/PlayerView.ts:440-442`, `:459-464` |
| `displayName()` | The name drawn on the map. | `client/view/PlayerView.ts:449-454` |
| `territoryColor()` | The colour of the player's land. The native pulse uses it. | `client/view/PlayerView.ts:285`; `client/WebGLFrameBuilder.ts:351-353` |

Three details matter for a mark:

- `nameLocation()` and `state.spawnTile` give nearly the same point. The first is moved up by `fontSize / 3` for the name. Use `state.spawnTile` with `x()` and `y()` for the exact spawn centre.
- The game recomputes `nameLocation()` on every tick of the spawn phase, for each spawned Human and Nation (`core/GameRunner.ts:179-188`). The comment in the game says the spawn tile updates faster than the 2-tick name centroid (`client/WebGLFrameBuilder.ts:355-357`).
- `GameView` ignores a new `nameLocation()` for a player that is not alive (`client/view/GameView.ts:335-338`). A player is alive as soon as it owns a spawn tile, so this does not matter at spawn.

### The map hook of the package

`mapHooksReader()` (`src/features/alliance-view/hooks.ts:38-54`) needs two things:

- `window.__webglView`. The game sets it with no development-only guard (`client/ClientGameRunner.ts:394`).
- `build-menu.transformHandler`. The game sets it when it builds the renderer (`client/hud/GameRenderer.ts:87`).

Both come from game start-up code, not from the first tick of the match, so they should exist during the spawn phase. That is **unverified** live. Two limits of the package code apply:

- `isMatchLive()` is false for the whole spawn phase (`src/game/match.ts:15-19`). A spawn feature must not use it. It must test `game.inSpawnPhase()`.
- The package types in `src/game/types.ts` do not declare `team()`, `type()`, `hasSpawned()`, `displayName()` or `state` on `PlayerView`. A spawn feature adds them to its own types.

## The camera at spawn

### What the camera is

`TransformHandler` holds `scale`, `offsetX` and `offsetY` (`client/TransformHandler.ts:34-36`). `scale` is CSS pixels per world tile. The renderer multiplies it by the device pixel ratio to get device pixels (`client/ClientGameRunner.ts:429-439`).

`worldToScreenCoordinates()` returns viewport coordinates in CSS pixels. It removes the map centre, applies offset and scale, and adds the canvas rectangle's left and top (`TransformHandler.ts:92-119`, `:144-153`). The canvas rectangle is read once at construction and again only on a window `resize` (`TransformHandler.ts:59-61`, `client/hud/GameRenderer.ts:363-365`). **Unverified:** the rectangle stays right if the canvas moves without a window resize.

### At the start of the spawn phase

The game calls `centerAll(0.9)` when the renderer starts (`client/hud/GameRenderer.ts:368`). The whole map fits in the viewport at 90 percent (`TransformHandler.ts:388-404`):

```
scale = min(viewportWidth / mapWidth, viewportHeight / mapHeight) * 0.9
```

The camera centre is the map centre. In a solo game, nothing moves the camera before you click: the game only moves it in a random-spawn game (`client/ClientGameRunner.ts:903-930`) or after the phase ends (`:981-990`).

The zoom range for the user is 0.2 to 20 (`TransformHandler.ts:307`). `centerAll` is not clamped by that range.

### How big a spawn is

The game claims the tiles within 4 tiles of the spawn centre (`core/execution/Util.ts:145`, `core/game/GameMap.ts:542-562`). That is a disc of about 8 tiles across. The game's own name box uses a spawn region of 8 (`client/hud/NameBoxCalculator.ts:19`).

The native teammate ring has an outer radius of 14 tiles. It breathes up to 1.15 times that, so about 16 tiles (`client/render/gl/render-settings.json:331`, `client/render/gl/passes/SpawnOverlayPass.ts:31`, `:165`).

The table assumes a viewport of 1440 by 900 CSS pixels. The real canvas size is **unverified**. The map sizes come from the manifests in `resources/maps/*/manifest.json`. The compact World uses its `map4x` size (`core/game/TerrainMapLoader.ts:86-100`).

| Map | Size in tiles | Scale at start | Spawn, 8 tiles | Native ring, radius 16 tiles |
| --- | --- | --- | --- | --- |
| Onion, smallest | 512 x 512 | 1.58 | 12.7 px | 25 px |
| World, compact | 1000 x 500 | 1.30 | 10.4 px | 21 px |
| World | 2000 x 1000 | 0.65 | 5.2 px | 10 px |
| Europe | 2904 x 1672 | 0.45 | 3.6 px | 7 px |
| Giant World, largest | 4108 x 1948 | 0.32 | 2.5 px | 5 px |
| Fully zoomed out by the user, any map | any | 0.2 | 1.6 px | 3 px |

On a large map at the default zoom, a spawn is a dot of 2 to 5 pixels. This is why a player cannot find a teammate. A mark of our own needs to be much larger than the spawn itself.

## The setup with several real humans

Use it once, before the build is called finished. The map note says the same.

What is possible:

- A private lobby needs at least 2 humans before the host can start. The start button is disabled with fewer than 2 clients (`client/HostLobbyModal.ts:622`).
- The host picks Teams and a team count in the lobby (`client/HostLobbyModal.ts:490-492`).
- The host gives the other players the link. It has the form `http://localhost:9000/w<n>/game/<id>`. The game reads it at `client/Main.ts:815-840`. The host's address bar shows it (`:1043-1051`), unless the host turned on streamer mode.
- The spawn phase is 300 ticks, which is 30 seconds (`core/configuration/Config.ts:637-645`). That is also what the sidebar counts down (`client/hud/layers/GameRightSidebar.ts:153-156`).
- The host of a private lobby can pause the game (`client/hud/layers/GameRightSidebar.ts:406-410`, `server/GameServer.ts:591-627`). A pause stops the turns, so the spawn timer stops too. Whether the pause button works during the spawn phase is **unverified**.
- The multi-tab detector does not run in the spawn phase, in a solo game, or in the dev environment (`client/hud/layers/MultiTabModal.ts:32-37`).
- The server skips its same-address and duplicate-account limits in the dev environment (`server/GameServer.ts:730-762`). The code comment says "local testing (multi-tab …) is inherently same-IP".

**The trap: two tabs of one browser profile are one player.** The player identity is a random id kept in `localStorage` (`client/Auth.ts:361-368`, key at `:13`). Tabs of one profile share it. The server treats a second join with the same id as a re-join of the first one. It moves the player to the new connection and closes the old one (`server/Worker.ts:547-562`, `server/GameServer.ts:801-835`). The issue text says "several browser tabs". That does not work.

So use one separate browser profile per human. For example:

- One normal window and one private window of Chrome.
- A second Chrome profile.
- Firefox or Safari.

Each needs the userscript manager installed (a private window needs it allowed there) and the userscript installed. The `@include` line covers `localhost:9000` (`dist/openfront-extended-ui.user.js:13`). Whether the userscript loads in each profile is **unverified**.

Where the humans land:

- With **Duos, Trios or Quads**, the game fills the fuller team first. Two humans end up on one team (`core/game/TeamAssignment.ts:102-123`). The Nations then fill the rest of that team.
- With a plain number of teams, humans go to the smallest team. Two humans end up on different teams (`TeamAssignment.ts:102-123`).
- Clan members go together, and friends are preferred (`TeamAssignment.ts:33-100`).

So for a real check: **two profiles, Teams, Duos, World**. The second human is the teammate. The game's own pulse draws on both (`client/WebGLFrameBuilder.ts:345-367`).

## Can a prototype use made-up teammates?

Yes. The drawing code needs no live game, as long as the made-up object answers the same calls. Two limits:

- **`FakePlayerView` is too small for spawn.** `src/test/fakes.ts:68-127` has `smallID()`, `id()`, `isPlayer()`, `isOnSameTeam()`, `territoryColor()`, `nameLocation()` and `isAlive()`. It stores `team` as a field. The real class has `team()` as a method. A spawn feature also needs `team()`, `type()`, `hasSpawned()`, `displayName()` and `state.spawnTile`. Add them to the fake and to `src/game/types.ts`.
- **`FakeTransformHandler` does not match the game's camera.** Its formula is `(x - offsetX) * scale` (`src/test/fakes.ts:237-262`). The real one removes the map centre and adds the canvas rectangle. A prototype that must look right should use the real formula, or run inside the real game.

Besides a position, the drawing code needs:

- The camera, for `worldToScreenCoordinates()` and `scale`. The package already reads it (`src/features/alliance-view/hooks.ts`).
- The viewport size, to find the screen edge. `clocks.ts` uses `window.innerWidth` and `window.innerHeight` (`src/features/alliance-view/clocks.ts:107-108`).
- A test for "is on screen" and a pointer at the edge. The package type `TransformHandler` has only `scale` and the two conversions (`src/game/types.ts`). The game's class also has `screenBoundingRect()` and `isOnScreen()` (`client/TransformHandler.ts:163-205`).
- The mark's colour. `territoryColor()` is what the native pulse uses.
- A refresh on every drawn frame. The camera moves with no event (`docs/adr/0005-the-map-draws-its-own-layer.md`).
- A refresh of positions on every tick. A Nation re-picks its spawn tile.
- A gate that ends when the phase ends: `inSpawnPhase()` turning false removes every mark (`docs/adr/0005-the-map-draws-its-own-layer.md`, "Switching the view mode off has to take the layer with it").

The rules still hold for such a feature:

- [ADR-0008](../adr/0008-information-by-position-and-text-never-by-changing-a-real-colour.md): the mark never changes a territory colour. It adds a shape.
- [ADR-0009](../adr/0009-the-package-changes-your-view-never-the-game.md): the mark only reads. It sends no intent. A camera move is allowed.

## What only a live run can confirm

- That `window.__webglView` and `build-menu.transformHandler` exist during the spawn phase.
- That `worldToScreenCoordinates()` returns a correct point at spawn, with the HUD on screen.
- That the canvas rectangle is right at start (it is cached).
- The real viewport and canvas size, which decide the pixel sizes above.
- That Quads on World gives the human three Nation teammates, and that they spawn spread over the map.
- That `myPlayer()` is non-null before the human spawns.
- That the package's match start fires during the spawn phase.
- That the host's pause button works during the spawn phase.
- That the userscript loads in each separate profile, including a private window.
- That teammates share one territory colour. The native pulse uses it.

## Console snippet for the live check

Paste it in the browser console while the solo spawn phase waits. It prints one row for each Nation on your team.

```js
const g = document.querySelector("control-panel").game;
const me = g.myPlayer();
console.log("inSpawnPhase", g.inSpawnPhase(), "ticks", g.ticks(), "me.team", me?.team(), "me.hasSpawned", me?.hasSpawned());
console.table(
  g.players()
    .filter((p) => p.isOnSameTeam(me) && p !== me)
    .map((p) => ({
      name: p.displayName(), type: p.type(), team: p.team(),
      hasSpawned: p.hasSpawned(), tile: p.state.spawnTile,
      x: p.state.spawnTile === undefined ? null : g.x(p.state.spawnTile),
      y: p.state.spawnTile === undefined ? null : g.y(p.state.spawnTile),
      nameLoc: JSON.stringify(p.nameLocation()),
    })),
);
const cam = document.querySelector("build-menu").transformHandler;
console.log("camera", cam.scale, cam.offsetX, cam.offsetY, "hook", !!window.__webglView);
```

Run it twice, 10 seconds apart. The `x` and `y` of a Nation should change at least once.
