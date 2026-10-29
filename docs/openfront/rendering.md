# Drawing on the map and the HUD

This file covers how the game draws its map and its HUD, and where a script can add to them. The HUD (heads-up display) is the set of panels that the game puts over the map in a match. Read this file before you change player colours, draw a layer over the map, read the camera, or put an element into the HUD. How a script reaches the game objects is in [access.md](access.md).

## The map view and its render settings

### The map view has one live settings object

The game draws the map with WebGL in one object, the map view, which it stores in the page global `window.__webglView` (see [access.md](access.md)). `getSettings()` on the map view returns the live render settings object, not a copy. Each pass (one draw step, such as names) reads the object again at each draw, so a script write shows on the next frame. The game also edits this object itself, in `RenderOverrides.ts` and in its debug panel.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:350`, `src/client/render/gl/Renderer.ts:436`, `:492`, `:1149-1151`, `src/client/render/gl/passes/TerritoryPass.ts:420`, `:443`, `src/client/render/gl/RenderOverrides.ts:65-68`, `src/client/render/gl/debug/index.ts:8-31`
- Used in: `src/game/types.ts:209`
- Found in: #1, #12, #14

### Render settings after a WebGL context loss

A WebGL context loss is an event where the browser drops the GPU state of the canvas. While the context is lost, `getSettings()` returns an empty object. On a restore, `MapRenderer` keeps the old settings object and gives it to the new renderer, so values that a script wrote stay.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:62-66`, `:89-98`, `:350`
- Used in: `src/game/types.ts:209`
- Found in: `research/spawn-pulse-tuning`

### A graphics settings change resets the render settings

When the player changes any graphics setting, the game builds fresh defaults and copies them over the live settings object. Values that a script wrote, for example the `spawnOverlay` radii, go back to the defaults. The reset button of the debug panel does the same. A script must write its values again on every tick, one step of the game simulation, and this write is cheap.

- Checked at: `332e5410e`, source only
- Game source: `src/client/ClientGameRunner.ts:625-627`, `:642-652`, `src/client/render/gl/SettingsUtils.ts:12-29`, `src/client/render/gl/RenderOverrides.ts`, `src/client/render/gl/debug/Wiring.ts:100-106`
- Found in: #1, #33, #37, `research/spawn-pulse-tuning`

The spawn overlay settings themselves are in [spawn.md](spawn.md).

### Only one render setting needs a reload

`RenderSettings.ts` says that `tileDrip.bucketCount` takes effect only after a page reload. All other render settings apply live.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/RenderSettings.ts:370-377`
- Found in: `research/spawn-pulse-tuning`

### Territory saturation, territory alpha and map names

`mapOverlay.territorySaturation` defaults to 0.85, and `mapOverlay.territoryAlpha` defaults to 0.588. The hover highlight is the brighter tint on the territory of the player under the cursor. The territory shader applies the saturation after this highlight. `passEnabled.name` set to `false` removes the player names from the map on the next frame.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/render-settings.json:80-81`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:111`, `:127-130`
- Found in: #12, #14

### Shaders are fixed at build time

The game imports each shader source at build time with the `?raw` import of Vite, its build tool. The pass compiles it once, in its constructor. A script cannot change a shader without a rebuild of the renderer.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/passes/TerritoryPass.ts:20-21`, `:137-144`
- Found in: #12

### Terrain colours come from five base colours

The game bakes the terrain into a texture from five base colours in `getSettings().terrain`. Shallow water is a mix of the ocean colour, and deep water and relief shift the colour. `rebuildTerrain()` bakes the texture again, and each bake walks every map tile. The game also rewrites these settings and bakes again when the player changes a graphics option.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:236`, `src/client/render/gl/RenderSettings.ts:62`, `encodeTerrainTile` in `src/client/render/gl/utils/ColorUtils.ts`
- Used in: `src/game/types.ts:215-229`, `src/features/alliance-view/terrain.ts:4-14`, `:78`

### Default terrain colours

The default base colours of the terrain are these:

* ocean `#4785b5`
* sand `#CCCB9E`
* plains `#BEDC8A`
* highland `#DCCB9E`
* mountain `#e6e6e6`

- Checked at: `unknown`
- Game source: `src/client/render/gl/render-settings.json:19`
- Used in: `src/test/fakes.ts:267-274`

## The camera

### Camera scale is CSS pixels per tile

The camera is the `TransformHandler` object. A tile is one square cell of the map. `TransformHandler` holds `scale`, `offsetX` and `offsetY`, and `scale` is CSS pixels per tile. The renderer multiplies `scale` by the device pixel ratio to get device pixels.

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:34-36`, `src/client/ClientGameRunner.ts:429-439`
- Used in: `src/game/types.ts:246`
- Found in: `research/spawn-pulse-tuning`, `research/spawn-test-bed`

How a script reaches the camera, and its coordinate methods, are in [access.md](access.md).

### The zoom range of the player

The player can zoom from `scale` 0.2 to `scale` 20. `centerAll` does not obey this range.

- Checked at: `332e5410e`, source only
- Game source: `src/client/TransformHandler.ts:307`
- Found in: `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### The map moves under a still cursor

A drag moves the map under a still cursor, and so does the smooth camera motion of the game. Neither sends a mouse event. To know the tile under the cursor, read it again on every frame from the last known cursor position.

- Checked at: `332e5410e`
- Found in: #1

## Player colours and the palette

### Player colour methods

A `smallID` is a small number that the game gives each player, and it is the index of the player colours in the palette. `territoryColor()` on a player returns the territory fill colour, and `borderColor()` returns the border colour. Each colour object has `toRgb()`, with channels from 0 to 255.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:285`, `:309`, `:440`
- Used in: `src/game/types.ts:11`, `:84`, `:98`, `:100`

### The palette texture layout

The palette is one float texture that holds the colours of every player. It is `PALETTE_SIZE` (4096, the 12-bit range of `smallID`) wide and 2 rows high, as a `Float32Array(4096 * 2 * 4)` of 128 KB. Row 0 holds the territory fill at `smallID * 4`, and row 1 holds the border at `PALETTE_SIZE * 4 + smallID * 4`. Each entry is R, G, B, A from 0 to 1, and the game exports `getPaletteSize()`.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/utils/ColorUtils.ts:14`, `:16`, `src/client/WebGLFrameBuilder.ts:162`, `:619-636`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:59-60`
- Used in: `src/features/alliance-view/palette.ts:4-16`
- Found in: #12

### Palette alpha values

The game writes alpha 150/255 into every fill entry and 1 into every border entry. The territory shader ignores the fill alpha and uses `uTerritoryAlpha` (0.588) in its place. The SAM radius pass reads the palette directly. This pass draws the range circle of each SAM (surface-to-air missile) launcher.

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:619`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:132`
- Used in: `src/features/alliance-view/palette.ts:19-34`
- Found in: #12

### `updatePalette` recolours the whole map

`updatePalette(palette)` on the map view replaces the colours of every player in one call. It copies the array, uploads the whole texture with one `texSubImage2D`, pushes the colours to the SAM radius pass, and bakes the name colours again. So one write greys territory, borders, structure icons, units and name outlines together. Name letters keep their own fill, because only the name outline takes the player colour.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:169`, `src/client/render/gl/Renderer.ts:719-738`
- Used in: `src/game/types.ts:202`, `src/features/alliance-view/palette.ts:4-16`
- Found in: #1, #12, #13, #14

### Cosmetic structure colours ignore the palette

A cosmetic is an item that changes the look of the structures or warships of a player. For a player who owns one, the structure and warship fills come from a second texture, the effect palette. This override applies to the local player, who is the player in this browser, and to the player under the cursor. A rewritten main palette does not recolour these fills.

- Checked at: `332e5410e`
- Found in: #1, #13

### The palette is almost write-once

The game writes the palette entry of a player only when it first sees that player. A theme change rewrites the whole palette through `refreshPalette`, and a WebGL context loss rebuilds the renderer. So a palette that a script wrote stays until one of these events:

* a theme change
* a player who joins late
* a WebGL context loss

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:185-190`, `:429-432`, `:478-486`, `src/client/ClientGameRunner.ts:638`, `src/client/render/gl/MapRenderer.ts:112-127`
- Found in: #12

### Team games colour territory by team

In a team game, the territory colour of a player comes from the team. So teammates share one colour family.

- Checked at: `332e5410e`, source only
- Game source: `src/client/theme/ThemeProvider.ts:143-147`
- Found in: `research/spawn-pulse-tuning`

## Highlights, relations and the alternate view

### The hover highlight takes one owner

`HoverHighlightController` calls `view.setHighlightOwner(ownerID)`, and the renderer gives that value to four passes. The shaders brighten a tile only when its owner equals `uHighlightOwner`, and `uHighlightBrighten` is only a strength. So the game cannot highlight a set of players. Each hover change marks the whole border buffer dirty, so the game already recomputes all borders once per hover change.

- Checked at: `332e5410e`
- Game source: `src/client/controllers/HoverHighlightController.ts:77`, `src/client/render/gl/Renderer.ts:1089-1093`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:111-114`, `src/client/render/gl/shaders/border-compute/border-compute.frag.glsl:50`, `src/client/render/gl/passes/BorderComputePass.ts:150-155`
- Found in: #12

How the game finds the player under the cursor is in [access.md](access.md).

### The relation matrix

`buildRelationMatrix` builds a symmetric 1024 x 1024 byte matrix of relations between players: 0 is neutral, 1 is friendly, 2 is embargo. An embargo is a trade stop that one player puts on another. The matrix includes teams, alliances and embargoes, and the game uploads it only when one of these changes. Each upload forces a recompute of all borders, and a value from `view.updateRelations()` lasts only until the next real change.

- Checked at: `332e5410e`
- Game source: `src/client/render/frame/derive/RelationMatrix.ts:4-80`, `src/client/view/GameView.ts:597-602`, `src/client/render/frame/Upload.ts:118-122`
- Found in: #12

### How the map shows alliances

In the normal view, the game mixes a friendly tint or an embargo tint into the border between two adjacent tiles with different owners. Allies whose land does not touch get no mark. Alliance clusters, which are groups of players linked by alliances, feed only the SAM radius pass. The alliance icon beside a name appears only for allies of the local player (`localPlayer.allies.includes(sid)`).

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/day-night/border-stamp.frag.glsl:50-55`, `src/client/render/gl/passes/BorderStampPass.ts:119-132`, `src/client/render/gl/shaders/border-compute/border-compute.frag.glsl:37-46`, `src/client/render/frame/derive/AllianceClusters.ts:8-44`, `src/client/render/frame/derive/PlayerStatus.ts:141`
- Found in: #1, #12

### The alternate view hides territory fill

The alternate view is a map mode that the player turns on with a held key, Space by default, through `AlternateViewEvent` and `view.setAltView`. In this view the territory shader discards every owned tile, so palette writes do not show, and the names hide. Borders take the affiliation palette, which colours each player as self, ally, neutral or enemy of the local player only. No game code calls `setAltView` again, so a script can call it without a conflict.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:82`, `:584-587`, `src/client/controllers/ViewModeController.ts:22-24`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:56`, `src/client/render/gl/shaders/day-night/border-stamp.frag.glsl:41-43`, `src/client/render/gl/utils/Affiliation.ts:112-144`, `src/client/render/gl/Renderer.ts:1366-1367`
- Used in: `src/game/keybinds.ts:93-99`
- Found in: #1, #12, #13

The keybinds of the game are in [economy.md](economy.md).

### `setLocalPlayerID` changes more than alliance colours

`view.setLocalPlayerID(id)` builds the affiliation palette again around that player. It also gives the new id to the SAM radius, structure, unit and railroad passes. So after a call, the units of the real local player draw as the units of someone else.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/Renderer.ts:1108-1116`, `src/client/render/gl/utils/Affiliation.ts:56-60`
- Found in: #12

### The alliance icon beside a name fades and flashes

Beside the name of each ally, the game draws an alliance icon with brightness `remainingTicks / allianceDuration`. The renewal window is the last part of an alliance, when the game offers to renew it. In this window, the icon flashes faster and faster. The game draws it only for alliances of the local player.

- Checked at: `332e5410e`
- Game source: `src/client/render/frame/derive/PlayerStatus.ts:168`, `src/client/render/gl/shaders/name/status-icon.vert.glsl:289`
- Found in: #10, #14

Alliance durations are in [alliances.md](alliances.md).

## Names on the map

### The game draws names inside the renderer

The renderer draws player names in WebGL, so no page element exists for a name. `nameLocation()` on a player returns a `NameLocation`: `x` and `y` in tiles, and a `size`. It returns `undefined` until the renderer has placed the name. So a label from a script must be its own layer, and the script must place it on every frame from the camera.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`, `src/client/view/PlayerView.ts:436`, `src/core/game/Game.ts:1039`
- Used in: `src/features/alliance-view/clocks.ts:4-10`, `src/game/types.ts:18`, `:102`
- Found in: #12, #14

### Name size formula

The game sizes a name from `size` in three steps: `baseSize = max(1, floor(size))`, `nameSize = max(4, floor(baseSize * 0.4))` and `nameScale = min(baseSize * 0.25, 3)`. So a name grows with the square of `size` until the cap, and a small nation still gets a minimum size. The constants are `nameScaleFactor` 0.4, `nameScaleCap` 3, atlas font size 48 and atlas baseline 36. A script cannot read the uniforms `uFontBase` and `uFontSize`.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`, `resources/atlases/msdf-atlas.json`
- Used in: `src/features/alliance-view/clocks.ts:27-36`, `:149-155`
- Found in: #14

### The game hides small names

The game drops a name when the name covers less than `cullThreshold` (0.008) of the screen width. The game measures this width in clip space, which is two units wide, so the device pixel ratio has no effect.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`
- Used in: `src/features/alliance-view/clocks.ts:163-174`
- Found in: #14

## Draw a layer over the map

### The map canvas and the input overlay

The map is a WebGL canvas with `position: fixed`, full size and no z-index, as the first child of `<body>`. Above it, a transparent full-screen `<div id="game-input-overlay">`, also with no z-index, receives mouse and touch input. A layer over the map must use `pointer-events: none` and turn pointer events on only for its own controls, as the HUD of the game does.

- Checked at: `332e5410e`
- Game source: `src/client/Utils.ts:382-394`, `src/client/ClientGameRunner.ts:323-326`, `:564-575`, `index.html:321`
- Used in: `src/features/hotbar/hotbar.ts:90`
- Found in: #3

### A per-tile overlay is too slow in JavaScript

A large map holds 3 to 4 million tiles. A JavaScript loop over each tile at 60 frames per second is not possible. `tileStateBuffer()` gives the buffer of tile states that the game already holds, at no cost.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1294`
- Found in: #12, #14

### Map sizes in tiles

The map manifests give these sizes, in tiles:

* Onion: 512 x 512, the smallest map
* World: 2000 x 1000, and 1000 x 500 in its compact version (`map4x`)
* Aegean: 1700 x 2000
* Achiran: 2000 x 1700
* Africa: 1948 x 2032
* Europe: 2904 x 1672
* Giant World: 4108 x 1948, the largest map

- Checked at: `332e5410e`
- Game source: `resources/maps/*/manifest.json`, `src/core/game/TerrainMapLoader.ts:86-100`
- Found in: #12, #14, `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### The game cursor over the map

The game writes `cursor: crosshair` on `#game-input-overlay` while a warship is selected and while the player holds Shift. `CrosshairPass` draws a red crosshair of 40 px, 20 px around the cursor. It draws it while the player aims a warship or a MIRV, a nuclear missile with many warheads.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:437`, `:668`, `src/client/render/gl/passes/CrosshairPass.ts`
- Used in: `src/features/hotbar/hotbar.ts:95-98`
- Found in: #30

## Put an element into the HUD

### The HUD is static Lit elements

The HUD uses Lit (`lit` ^3.3.2), a library for custom HTML elements, and each component extends `LitElement`. The HUD tags are in the static `index.html`, so they exist from the first page load. The game never rebuilds them between matches, and `createRenderer()` only finds them with `querySelector`.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `:361`, `:373-383`, `src/client/hud/layers/ControlPanel.ts:26-27`, `src/client/hud/GameRenderer.ts:66-286`
- Found in: #3

### Most HUD elements have no shadow DOM

A shadow DOM is a hidden subtree of an element that page CSS cannot reach. These HUD elements turn it off with `createRenderRoot() { return this; }`, so page CSS reaches their content:

* `control-panel`, `unit-display`, `player-info-overlay`, `player-panel`
* `game-left-sidebar`, `game-right-sidebar`, `player-stats`, `team-stats`
* `events-display`, `attacks-display`, `chat-display`, `actionable-events`

Only `build-menu` and `performance-overlay` keep a shadow DOM. Their shadow root is open, so JavaScript can read `buildMenu.shadowRoot`, but page CSS cannot style its content.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:632-634`, `src/client/hud/layers/UnitDisplay.ts:48-50`, `src/client/hud/layers/BuildMenu.ts:126-127`, `:167-282`, `src/client/hud/layers/PerformanceOverlay.ts:18-19`
- Used in: `src/game/types.ts:117-122`, `src/features/hotbar/hotbar.ts:14`
- Found in: #1, #3, #6

### When Lit removes a node that a script added

A normal Lit update changes values and keeps the nodes that a script appended. Lit removes all content after its marker comment only when `render()` returns a different top-level template or an empty result. A node that a script prepends as the first child sits before the marker and stays, but this depends on Lit internals. So a script must check that its node is still attached.

- Checked at: `332e5410e`
- Game source: none (the Lit library, `lit-html.js:866-877`, `:1037-1052`, `:1117-1124`, `:1486-1489`)
- Found in: #3

### `<control-panel>` keeps added nodes

`<control-panel>` always returns the same template, so it is the safest Lit host. In a live match, a node that a script added inside it stayed for the whole match. This holds only while `render()` has no early exit.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:603-630`
- Found in: #3, #5, #20

### HUD elements that empty themselves

These elements often return an empty render, and Lit then removes any node a script added, with no error and no event:

* `<unit-display>`: in the spawn phase (the start of a match, when players pick a start tile), after death, in a replay, and with all units disabled
* `<player-info-overlay>`: when the cursor is not over a player
* `<events-display>`: when hidden or with no events
* `<player-panel>`: each time it hides, under four conditions
* `<player-stats>` and `<team-stats>`: when the player hides the table with its toggle button. Their rows are virtualised and keyed.
* the gold gain pip in `<control-panel>`, which is a conditional slot

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:116`, `:119`, `src/client/hud/layers/PlayerInfoOverlay.ts:625-627`, `src/client/hud/layers/EventsDisplay.ts:617-620`, `src/client/hud/layers/PlayerPanel.ts:881-893`, `src/client/components/StatsTable.ts:293-295`, `:390-400`, `src/client/hud/layers/ControlPanel.ts:499-507`
- Used in: `src/features/hotbar/hotbar.ts:43-46`
- Found in: #3, #9, #10, #16, #17

### Lit bindings overwrite added classes

Lit writes a bound attribute whole, with `setAttribute`. If the `class` of an element is a template binding, a class that a script adds disappears at the next change of that value. Lit never rewrites host attributes from `index.html`, for example `<control-panel class="w-full">`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:620-623`, `index.html:338`
- Found in: #3

### Inline styles that the game writes

`GameRightSidebar.createRenderRoot()` sets `display`, `flexDirection`, `alignItems` and `gap` on its host. Its `updateParentOffset()` writes `marginTop` on its parent `<div>` in `index.html`. `GameLeftSidebar` and `PlayerInfoOverlay` set `margin-top` from a computed offset. The spawn timer and the immunity timer move these three panels by 7 px.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/GameRightSidebar.ts:69-77`, `:197-204`, `src/client/hud/layers/GameLeftSidebar.ts:96-98`, `:118`, `src/client/hud/layers/PlayerInfoOverlay.ts:102-104`, `:637`
- Found in: #3

### The static top-right `<div>` is a safe anchor

The `<div>` at `index.html:365` is static HTML that no Lit component draws. It holds `<game-right-sidebar>` and `<replay-panel>`, as a flex column with an 8 px gap at `z-1000`. A third child that a script appends there stays, sits below the two panels, dims with the game, and stays under every modal. Do not change its `marginTop`, because `GameRightSidebar` writes it.

Sources disagree. Check before use.

* #10, #17 and #41 say that the next Lit render of `<game-right-sidebar>` removes a node that a script puts inside it. This render comes about every 250 ms.
* #3 says that a normal Lit update keeps appended nodes, and does not list `<game-right-sidebar>` among the elements that empty themselves.

- Checked at: `332e5410e`
- Game source: `index.html:365-370`, `src/client/hud/layers/GameRightSidebar.ts:197-204`
- Used in: `src/features/alliance-panel/index.ts:16-20`, `:32`, `src/test/fakes.ts:638-644`
- Found in: #1, #3, #10, #17, #41

### Popups on `<body>`

The game makes its own popups with a `<div>` appended to `document.body` and placed from a measured rectangle, for example in `ColumnPicker` and `ConfirmDialog`. No game code clears the children of `<body>`. An empty `<div id="app">` also exists, and the game does not use it. The game installs no `MutationObserver` in `src/client`, so it does not undo DOM changes.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ColumnPicker.ts:86-92`, `src/client/components/ConfirmDialog.ts:60`, `index.html:317`
- Found in: #3

### The game sends no HUD geometry events

The game uses `ResizeObserver` only on the WebGL canvas, and it listens to `window.resize` only to update the canvas rectangle. A layer that aligns with a HUD element must install its own `ResizeObserver`. The bottom HUD is a grid with a fixed middle column of 500 px, which changes width at the `sm` breakpoint.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:417-426`, `src/client/render/gl/MapRenderer.ts:72-78`, `src/client/hud/GameRenderer.ts:363-365`, `index.html:321`, `:330`
- Found in: #3

### Styles: Tailwind 4 with literal class names

The game styles its pages with Tailwind CSS 4, a CSS library of small utility classes. The class names are literal, not hashed, so page CSS can target them, but many unrelated elements share one utility class. Tailwind builds only the classes that the game uses, so a script must bring its own CSS. The server sends no Content-Security-Policy, so an injected `<style>` works, and the brand colours are custom properties in an `@theme` block.

- Checked at: `332e5410e`
- Game source: `src/client/styles.css:1`, `:6-38`
- Found in: #3

### HUD names that are easy to confuse

The in-match leaderboard is `<player-stats>` inside `<game-left-sidebar>`, with the base class `StatsTable`. `<leaderboard-modal>` is a different element, the ranking on the home page. The HUD has no top bar. The top left is `<game-left-sidebar>`, the top right is `<game-right-sidebar>` with the timer, and the top centre is `<player-info-overlay>`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerStats.ts:8-9`, `src/client/hud/layers/GameLeftSidebar.ts:13-14`, `src/client/hud/layers/PlayerInfoOverlay.ts:634-636`
- Found in: #3

### HUD z-index order

The HUD blocks use these z-index values, from low to high:

* 200: the bottom HUD block, whose wrapper has `pointer-events: none`
* 900: the top-left sidebar
* 1000: the top-right block with the timer
* 1001: the hover info panel
* 9999: the build menu
* up to 999999: the consent banners

Every modal sits above the 1000 block. Behind a modal, the game blurs and dims its HUD. A node inside the HUD dims too, but an overlay on the page stays bright. A map layer at `z-index: 50` sits under every game panel, so a map label can be hidden under the leaderboard.

- Checked at: `332e5410e`
- Game source: `index.html:41`, `:320-357`, `:365-370`, `src/client/hud/layers/GameLeftSidebar.ts:113`, `src/client/hud/layers/PlayerInfoOverlay.ts:635`, `src/client/hud/layers/BuildMenu.ts:176`
- Found in: #1, #3, #5, #14, #37

### HUD sizes

The HUD text uses 14 px bold tabular figures, with a 1 px dark drop shadow under light text. Boxes have 6 px corners, 1 px borders and gaps of 4 to 6 px.

- Checked at: `332e5410e`
- Found in: #6, #21

### HUD colour meanings

In the HUD, yellow means gold, blue means troops, green means good and orange means a warning. Purple appears only outside the bottom row: `PlayerPanel` marks a Nation in indigo and a Bot in purple, and two modals use `bg-indigo-600`. A Nation is a player that the game controls, and a Bot is a simpler computer player. Pink, fuchsia and rose are unused.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:365-371`, `src/client/hud/layers/WinModal.ts:231`, `src/client/hud/layers/SendResourceModal.ts:276`
- Found in: #6, #21

### Narrow layout below 64rem

Below the `lg` breakpoint (64rem, 1024 px), the control panel changes to its narrow layout. The hotbar container is `hidden lg:block`, so the game removes the hotbar at this width.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:626-627`, `index.html:339`
- Used in: `src/features/hotbar/hotbar.ts:118-119`
- Found in: #1, #3, #9, #16

## How often the HUD and the map redraw

### The HUD redraws on ticks, the map on frames

The tick rate and its exceptions are in [access.md](access.md). The HUD redraws from the tick loop: `renderer.tick()` calls the `tick()` of each controller, and a controller can slow itself with `getTickIntervalMs()`. The `requestAnimationFrame` loop only syncs the camera and draws the WebGL canvas.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:466-471`, `:877`, `src/client/hud/GameRenderer.ts:377-402`
- Found in: #3

### HUD redraw rates

The HUD components redraw at these rates:

* `ControlPanel`, `PlayerInfoOverlay` and `UnitDisplay`: 10 per second
* `EventsDisplay`: up to 10 per second
* `BuildMenu`: 10 per second, only while open
* `GameRightSidebar`: 4 per second
* `GameLeftSidebar`: 1 per second
* `PlayerStats` and `TeamStats`: 1 per second, only while visible

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:171`, `src/client/hud/layers/PlayerInfoOverlay.ts:172-174`, `src/client/hud/layers/UnitDisplay.ts:89-105`, `src/client/hud/layers/GameRightSidebar.ts:131-133`, `src/client/hud/layers/GameLeftSidebar.ts:70-72`, `src/client/components/StatsTable.ts:112-114`, `src/client/hud/layers/BuildMenu.ts:161-165`
- Found in: #3

## The troop bar and the hotbar

### Troop bar markup

The troop bar is a bordered box in `<control-panel>`, 24 px tall (`h-6`), with `position: relative` and `overflow: hidden`. It holds two absolute `<div>` fills that the game stretches with `transform: scaleX(...)`: troops in `#0084d1`, then troops sent to attacks in `#3fa9f5`. The troop numbers sit across the middle, in white bold text with a drop shadow. The fill fraction is `troops / maxTroops`, so `left: 42.2%` marks 42.2% of the bar without any measure.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:329-359`, `:395-441` (`calculateTroopBar`)
- Found in: #1, #3, #5, #6, #20, #21

Which fill class is which, and the troop numbers, are in [economy.md](economy.md).

### The wide and narrow troop bars are both in the page

The control panel keeps a wide and a narrow troop bar in the page at all times and hides one with CSS (`lg:hidden`, `hidden lg:block`). So a plain `querySelector` can return the hidden copy, and a script must mark both. The narrow bar writes a troop count at its right edge, and its rate pill sits across its middle.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:626-627`, `renderDesktopTroopBar` and `renderMobileTroopBar` in `src/client/hud/layers/ControlPanel.ts`
- Used in: `src/features/troop-bar/troop-bar.ts:8-9`, `:15`, `:20-23`, `src/test/fakes.ts:382-391`
- Found in: #1, #3, #5, #6, #20, #21

### Overflow around the troop bar

Only the troop bar clips its content, and every ancestor up the HUD has `overflow: visible`. The cell that holds the bar is `position: static` and exactly as wide as the bar. So a node one level up can draw above the bar without a clip, after the script sets `position: relative` on that cell. A node inside the bar, between the fills and the troop numbers, needs no style change on any game element.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts`
- Found in: #5, #20

### The troop rate pill

A pill left of the troop bar shows the troop rate, for example `+380/s`. Its border and text are green while the rate rises and orange while it falls, so the colour changes at the peak. Its width is fixed at `w-[5.5rem]`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:300-307`, `:461-490`
- Found in: #6

### The inspect panel draws a troop bar too

`PlayerInfoOverlay` draws the same troop bar for any player that the user inspects.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:545-582`
- Found in: #6

### Hotbar markup and its empty states

The hotbar is the row of structure icons that `<unit-display>` draws, and `index.html:339` puts it beside `<control-panel>` for the whole page. Each icon sits in its own positioned item, and the item holds one box. The icon sits two levels down in that box, and its `alt` names its structure. `render()` returns `null` in the spawn phase, after death and in a replay, so the hotbar is empty then.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:33`, `:50`, `:277`, `render` and `renderUnitItem` in `src/client/hud/layers/UnitDisplay.ts`, `index.html:339`
- Used in: `src/features/hotbar/hotbar.ts:3-12`, `:24`, `:43-46`, `src/game/types.ts:117-122`, `src/test/fakes.ts:452-462`
- Found in: #9, #16

Hotbar prices are in [economy.md](economy.md).

## Menus and modals

### Detect an open modal

The game has two families of modals. The first `<o-modal>` to open sets `document.body.style.overflow` to `hidden`, and the last one to close clears it. The chat, the player panel and the leaderboard are `<o-modal>` modals. The two settings modals use their own markup and change nothing shared, so this test misses them.

- Checked at: `332e5410e`
- Game source: `src/client/components/baseComponents/Modal.ts`
- Used in: `src/features/alliance-view/index.ts:146-152`
- Found in: #1, #13

### The in-match settings menu at `332e5410e`

The gear icon in `<game-right-sidebar>` opens `<settings-modal>`, the in-match settings menu. Its `render()` returns `null` while closed, so the game builds the whole menu again at each open. A script must add its row again each time. The game finds the menu overlay by the class `.modal-overlay`, and the first row of the menu, "Graphics settings", opens a second panel.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/SettingsModal.ts:49`, `:214`, `:243-260`
- Used in: `src/settings-panel/entries.ts:7-10`, `:42-55`
- Found in: #26, #41

### The in-match settings menu on newer game versions

On the game `main` branch of 2026-10-27, after `332e5410e`, the in-match menu has no "Graphics settings" row. A row with `data-open-settings` opens the settings page of the game in its place. A script that adds a row must handle both menus. Nobody has seen the newer menu on openfront.io.

- Checked at: `unknown` (game `main` of 2026-10-27)
- Used in: `src/settings-panel/entries.ts:42-55`
- Found in: #1, #41

### The settings page outside a match

Outside a match, the settings page is `<user-setting id="page-settings">`, which the SETTINGS button in the top bar opens. The game draws its body after the script starts.

- Checked at: `332e5410e`
- Game source: `src/client/UserSettingModal.ts`
- Used in: `src/settings-panel/entries.ts:11-13`
- Found in: #26, #41
