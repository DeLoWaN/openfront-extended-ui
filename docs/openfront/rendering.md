# How the game draws the map and the HUD

This file covers how the game draws its map and its HUD (see `CONTEXT.md`), and where a script can add to them. Read it before you change player colours, draw a layer over the map, read the camera, or put an element into the HUD. How a script reaches the game objects is in [access.md](access.md).

## The map view and its render settings

### The map view has one live settings object

The map view is the WebGL object that draws the map, at the page global `window.__webglView` (see [access.md](access.md)). Each pass (one draw step, such as names) reads `getSettings()` again at each draw. So a script write shows on the next frame. The game also edits this object itself, in `RenderOverrides.ts` and in its debug panel.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:350`, `src/client/render/gl/Renderer.ts:436`, `:492`, `:1149-1151`, `src/client/render/gl/passes/TerritoryPass.ts:420`, `:443`, `src/client/render/gl/RenderOverrides.ts:65-68`, `src/client/render/gl/debug/index.ts:8-31`
- Used in: `src/game/types.ts:208-214`
- Found in: #1, #12, #14

### Render settings survive a WebGL context restore

A WebGL context loss is an event where the browser drops the GPU state of the canvas. On a restore, `MapRenderer` gives the old settings object to the new renderer, so values that a script wrote stay.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:62-66`, `:89-98`, `:350`
- Used in: `src/game/types.ts:212`
- Found in: `research/spawn-pulse-tuning`

### A graphics settings change resets the render settings

When the player changes any graphics setting, the game builds fresh defaults and copies them over the live settings object. Values that a script wrote go back to the defaults, and the `spawnOverlay` radii of the spawn pulse (see [spawn.md](spawn.md)) do too. The reset button of the debug panel does the same. So a value that a script wrote lasts only until the next such change.

- Checked at: `332e5410e`, source only
- Game source: `src/client/ClientGameRunner.ts:625-627`, `:642-652`, `src/client/render/gl/SettingsUtils.ts:12-29`, `src/client/render/gl/RenderOverrides.ts`, `src/client/render/gl/debug/Wiring.ts:100-106`
- Found in: #1, #33, #37, `research/spawn-pulse-tuning`

### Only one render setting needs a reload

`RenderSettings.ts` says that `tileDrip.bucketCount` takes effect only after a page reload. All other render settings apply live.

- Checked at: `332e5410e`, source only
- Game source: `src/client/render/gl/RenderSettings.ts:370-377`
- Found in: `research/spawn-pulse-tuning`

### Territory saturation applies after the hover highlight

The hover highlight is the brighter tint on the territory of the player under the cursor. The territory shader applies `mapOverlay.territorySaturation` after this highlight. Its default is 0.85, and the default of `mapOverlay.territoryAlpha` is 0.588.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/render-settings.json:80-81`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:111`, `:127-130`
- Found in: #12, #14

### `passEnabled.name` hides the names on the map

`passEnabled.name` set to `false` removes the player names from the map on the next frame.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/render-settings.json:11`
- Found in: #12, #14

### Shaders are fixed at build time

The game imports each shader source at build time with the `?raw` import of Vite, its build tool. The pass compiles it once, in its constructor. A script cannot change a shader without a rebuild of the renderer.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/passes/TerritoryPass.ts:20-21`, `:137-144`
- Found in: #12

### Terrain colours come from five base colours

The game bakes the terrain into a texture from five base colours in `getSettings().terrain`, and `rebuildTerrain()` bakes it again. The default colours are in `render-settings.json`.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:236`, `src/client/render/gl/RenderSettings.ts:62`, `src/client/render/gl/render-settings.json:19-25`, `encodeTerrainTile` in `src/client/render/gl/utils/ColorUtils.ts`
- Used in: `src/game/types.ts:215-230`, `src/features/alliance-view/terrain.ts:4-11`, `:78-80`, `src/test/fakes.ts:267-274`

## The camera

### Camera scale is CSS pixels per tile

The camera is the `TransformHandler` object, and a tile is one square cell of the map. Its `scale` counts CSS pixels per tile, and the renderer multiplies `scale` by the device pixel ratio. How a script reaches the camera, and its coordinate methods, are in [access.md](access.md).

- Checked at: `332e5410e`
- Game source: `src/client/TransformHandler.ts:34-36`, `src/client/ClientGameRunner.ts:429-439`
- Used in: `src/game/types.ts:245-247`
- Found in: `research/spawn-pulse-tuning`, `research/spawn-test-bed`

### The player zooms from `scale` 0.2 to 20

The player can zoom from `scale` 0.2 to `scale` 20. `centerAll` does not obey this range.

- Checked at: `332e5410e`, source only
- Game source: `src/client/TransformHandler.ts:307`
- Found in: `research/spawn-pulse-tuning`, `research/spawn-test-bed`

## Player colours and the palette

### Player colours sit at the player's `smallID`

`territoryColor()` and `borderColor()` on a player return its colours, and `smallID()` is the index of these colours in the palette.

- Checked at: `332e5410e`
- Game source: `src/client/view/PlayerView.ts:285`, `:309`, `:440`
- Used in: `src/game/types.ts:11-14`, `:84-85`, `:98-101`

### The palette is one 4096 x 2 float texture

The palette holds the colours of every player, with row 0 for the territory fill and row 1 for the border. Each entry is R, G, B, A from 0 to 1, at offset `smallID * 4` in its row.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/utils/ColorUtils.ts:14`, `:16`, `src/client/WebGLFrameBuilder.ts:162`, `:619-636`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:59-60`
- Used in: `src/features/alliance-view/palette.ts:1-17`
- Found in: #12

### Only the SAM radius pass reads the fill alpha

The game writes alpha 150/255 into every fill entry and 1 into every border entry. The SAM radius pass reads the fill alpha, and this pass draws the range circle of each SAM (surface-to-air missile) launcher.

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:619`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:132`
- Used in: `src/features/alliance-view/palette.ts:19-28`
- Found in: #12

### `updatePalette` recolours the whole map

One `updatePalette(palette)` call on the map view recolours territory, borders, structure icons, units and name outlines together. Name letters keep their own fill, because only the name outline takes the player colour.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/MapRenderer.ts:169`, `src/client/render/gl/Renderer.ts:719-738`
- Used in: `src/game/types.ts:201-207`, `src/features/alliance-view/palette.ts:6-7`
- Found in: #1, #12, #13, #14

### Cosmetic structure colours ignore the palette

A cosmetic is an item that changes the look of the structures or warships of a player. The game draws these fills from a second texture, the effect palette, so a rewritten main palette does not recolour them. For structures, this applies only to the local player (the player in this browser) and to the player under the cursor.

- Checked at: `332e5410e`
- Game source: `src/client/WebGLFrameBuilder.ts:128-134`, `src/client/render/gl/shaders/structure/structure.frag.glsl:179-187`, `src/client/render/gl/shaders/unit/unit.frag.glsl:139-149`
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

`HoverHighlightController` gives one owner id to four passes through `view.setHighlightOwner(ownerID)`. The shaders brighten a tile only when its owner equals `uHighlightOwner`, so the game cannot highlight a set of players. Each hover change makes the game recompute all borders once. How the game finds the player under the cursor is in [access.md](access.md).

- Checked at: `332e5410e`
- Game source: `src/client/controllers/HoverHighlightController.ts:77`, `src/client/render/gl/Renderer.ts:1089-1093`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:111-114`, `src/client/render/gl/shaders/border-compute/border-compute.frag.glsl:50`, `src/client/render/gl/passes/BorderComputePass.ts:150-155`
- Found in: #12

### The relation matrix holds one byte per pair of players

`buildRelationMatrix` builds a symmetric 1024 x 1024 byte matrix: 0 is neutral, 1 is friendly, 2 is embargo. An embargo is a trade stop that one player puts on another. The matrix includes teams, alliances and embargoes, and the game uploads it only when one of these changes. Each upload forces a recompute of all borders, and a value from `view.updateRelations()` lasts only until the next real change.

- Checked at: `332e5410e`
- Game source: `src/client/render/frame/derive/RelationMatrix.ts:4-80`, `src/client/view/GameView.ts:597-602`, `src/client/render/frame/Upload.ts:118-122`
- Found in: #12

### The map marks an alliance only on a shared border

In the normal view, the game mixes a friendly tint or an embargo tint into the border between two adjacent tiles with different owners. Allies whose land does not touch get no mark. Alliance clusters, which are groups of players linked by alliances, feed only the SAM radius pass. The alliance icon beside a name appears only for allies of the local player (`localPlayer.allies.includes(sid)`).

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/day-night/border-stamp.frag.glsl:50-55`, `src/client/render/gl/passes/BorderStampPass.ts:119-132`, `src/client/render/gl/shaders/border-compute/border-compute.frag.glsl:37-46`, `src/client/render/frame/derive/AllianceClusters.ts:8-44`, `src/client/render/frame/derive/PlayerStatus.ts:141`
- Found in: #1, #12

### The alternate view hides territory fill

The alternate view is a map mode that the player holds a key for, Space by default (keybinds are in [economy.md](economy.md)). It goes through `AlternateViewEvent` and `view.setAltView`, and it also hides the names. Borders take the affiliation palette, which colours each player as self, ally, neutral or enemy of the local player only. Only `ViewModeController` calls `setAltView`, so a script can call it without a conflict.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:82`, `:584-587`, `src/client/controllers/ViewModeController.ts:22-24`, `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:56`, `src/client/render/gl/shaders/day-night/border-stamp.frag.glsl:41-43`, `src/client/render/gl/utils/Affiliation.ts:112-144`, `src/client/render/gl/Renderer.ts:1366-1367`
- Used in: `src/game/keybinds.ts:93-99`
- Found in: #1, #12, #13

### The renderer holds the alternate view state

Two controls turn the alternate view on: the hold key, and a toggle in the in-match settings menu. Both send `AlternateViewEvent`, and the renderer keeps the result in its private field `altView`. A script reads it as `window.__webglView.renderer.altView`, which covers both controls. A script that watches the key alone misses the menu toggle.

- Checked at: `8ca8e5895`, seen in a local match
- Game source: `src/client/hud/layers/SettingsModal.ts:161`, `src/client/controllers/ViewModeController.ts:22-23`, `src/client/render/gl/MapRenderer.ts:390-391`, `src/client/render/gl/Renderer.ts:200`, `:1156-1158`
- Used in: `src/game/types.ts:258-268`, `src/features/nation-hatch/index.ts:140-141`

### `setLocalPlayerID` changes more than alliance colours

`view.setLocalPlayerID(id)` builds the affiliation palette again around that player. It also gives the new id to the SAM radius, structure, unit and railroad passes. So after a call, the units of the real local player draw as the units of someone else.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/Renderer.ts:1108-1116`, `src/client/render/gl/utils/Affiliation.ts:56-60`
- Found in: #12

### The alliance icon beside a name fades and flashes

Beside the name of each ally, the game draws an alliance icon with brightness `remainingTicks / allianceDuration`. In the renewal window (see `CONTEXT.md`), the icon flashes faster and faster. The game draws it only for alliances of the local player. Alliance durations are in [alliances.md](alliances.md).

- Checked at: `332e5410e`
- Game source: `src/client/render/frame/derive/PlayerStatus.ts:168`, `src/client/render/gl/shaders/name/status-icon.vert.glsl:289`
- Found in: #10, #14

## Names on the map

### The game draws names inside the renderer

The renderer draws player names in WebGL, so no page element exists for a name. `nameLocation()` on a player gives the anchor that the name pass uses.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`, `src/client/view/PlayerView.ts:436`, `src/core/game/Game.ts:1039`
- Used in: `src/features/alliance-view/clocks.ts:4-10`, `src/game/types.ts:17-27`, `:102-103`
- Found in: #12, #14

### A name grows with the square of its size

The name shader sizes a name from `NameLocation.size`, and the name grows with the square of `size` up to a cap. A script cannot read the uniforms `uFontBase` and `uFontSize`, and the atlas metrics are in `msdf-atlas.json`.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`, `resources/atlases/msdf-atlas.json`
- Used in: `src/features/alliance-view/clocks.ts:27-34`, `:149-161`
- Found in: #14

### The game hides small names

The game drops a name that covers less than `cullThreshold` (0.008) of the screen width.

- Checked at: `332e5410e`
- Game source: `src/client/render/gl/shaders/name/name.vert.glsl:96`
- Used in: `src/features/alliance-view/clocks.ts:35-36`, `:163-174`
- Found in: #14

## Draw a layer over the map

### An input overlay covers the map canvas

The map is a WebGL canvas with `position: fixed`, full size and no z-index, as the first child of `<body>`. Above it, a transparent full-screen `<div id="game-input-overlay">`, also with no z-index, receives mouse and touch input. A layer over the map must use `pointer-events: none` and turn pointer events on only for its own controls, as the HUD does.

- Checked at: `332e5410e`
- Game source: `src/client/Utils.ts:382-394`, `src/client/ClientGameRunner.ts:323-326`, `:564-575`, `index.html:321`
- Used in: `src/features/hotbar/hotbar.ts:90-91`
- Found in: #3

### A tile covers the world square from its corner

The territory shader takes `floor` of the world position, so tile `(x, y)` covers the world square from `(x, y)` to `(x + 1, y + 1)`. `worldToScreenCoordinates({ x: 0, y: 0 })` is therefore the top left corner of the map on the screen. An image with one pixel per tile, drawn there at `scale` CSS pixels per pixel with smoothing off, lines up with the map.

- Checked at: `8ca8e5895`, seen in a local match
- Game source: `src/client/render/gl/shaders/map-overlay/territory.frag.glsl:37`, `src/client/TransformHandler.ts:95-120`
- Used in: `src/features/nation-hatch/index.ts:87`, `src/features/nation-hatch/layer.ts`

### A per-tile overlay is too slow in JavaScript

A large map holds 3 to 4 million tiles. A JavaScript loop over each tile at 60 frames per second is not possible. `tileStateBuffer()` gives the buffer of tile states that the game already holds, at no cost.

- Checked at: `332e5410e`
- Game source: `src/client/view/GameView.ts:1294`
- Found in: #12, #14

### Maps run from 512 x 512 to 4108 x 1948 tiles

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

### The game draws its own crosshair while the player aims

The game sets `cursor: crosshair` on `#game-input-overlay` while a warship is selected or Shift is held. `CrosshairPass` also draws a red crosshair of 40 px, 20 px around the cursor. It draws it while the player aims a warship or a MIRV, a nuclear missile with many warheads.

- Checked at: `332e5410e`
- Game source: `src/client/InputHandler.ts:437`, `:668`, `src/client/render/gl/passes/CrosshairPass.ts`
- Used in: `src/features/hotbar/hotbar.ts:93-98`
- Found in: #30

## Put an element into the HUD

### The HUD is static Lit elements

The HUD uses Lit (`lit` ^3.3.2), a library for custom HTML elements, and each component extends `LitElement`. The HUD tags are in the static `index.html`, so they exist from the first page load. The game never rebuilds them between matches, and `createRenderer()` only finds them with `querySelector`.

- Checked at: `332e5410e`
- Game source: `index.html:338`, `:361`, `:373-383`, `src/client/hud/layers/ControlPanel.ts:26-27`, `src/client/hud/GameRenderer.ts:66-286`
- Found in: #3

### Most HUD elements have no shadow DOM

These HUD elements turn off the shadow DOM (a hidden subtree that page CSS cannot reach) with `createRenderRoot() { return this; }`:

* `control-panel`, `unit-display`, `player-info-overlay`, `player-panel`, `game-left-sidebar`, `game-right-sidebar`
* `player-stats`, `team-stats`, `events-display`, `attacks-display`, `chat-display`, `actionable-events`

Only `build-menu` and `performance-overlay` keep a shadow DOM, with an open shadow root that JavaScript can read and page CSS cannot style.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:632-634`, `src/client/hud/layers/UnitDisplay.ts:48-50`, `src/client/hud/layers/BuildMenu.ts:126-127`, `:167-282`, `src/client/hud/layers/PerformanceOverlay.ts:18-19`
- Used in: `src/game/types.ts:116-123`, `src/features/hotbar/hotbar.ts:14-15`
- Found in: #1, #3, #6

### Lit removes added nodes only on a template change

A normal Lit update changes values and keeps the nodes that a script appended. Lit removes all content after its marker comment only when `render()` returns a different top-level template or an empty result. A node that a script prepends as the first child sits before the marker and stays, but this depends on Lit internals.

- Checked at: `332e5410e`
- Game source: none (the Lit library, `lit-html.js:866-877`, `:1037-1052`, `:1117-1124`, `:1486-1489`)
- Found in: #3

### `<control-panel>` keeps added nodes

`<control-panel>` always returns the same template, so it is the safest Lit host. In a live match, a node that a script added inside it stayed for the whole match. This holds only while `render()` has no early exit. The gold gain pip inside it is a conditional slot, so a node inside the pip does not stay.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:603-630`, `:499-507`
- Found in: #3, #5, #20

### Some HUD elements empty themselves

These elements often return an empty render, and Lit then removes any node a script added, with no error and no event:

* `<player-info-overlay>` when no player is under the cursor, and `<events-display>` when it is hidden or has no events
* `<player-panel>` each time it hides, under four conditions
* `<player-stats>` and `<team-stats>` when the player hides the table with its toggle button

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:625-627`, `src/client/hud/layers/EventsDisplay.ts:617-620`, `src/client/hud/layers/PlayerPanel.ts:881-893`, `src/client/components/StatsTable.ts:293-295`, `:390-400`
- Found in: #3, #9, #10, #16, #17

### Lit bindings overwrite added classes

Lit writes a bound attribute whole, with `setAttribute`. If the `class` of an element is a template binding, a class that a script adds disappears at the next change of that value. Lit never rewrites host attributes from `index.html`, for example `<control-panel class="w-full">`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:620-623`, `index.html:338`
- Found in: #3

### The game writes inline styles on three HUD panels

`GameRightSidebar.createRenderRoot()` sets `display`, `flexDirection`, `alignItems` and `gap` on its host. Its `updateParentOffset()` writes `marginTop` on its parent `<div>` in `index.html`. `GameLeftSidebar` and `PlayerInfoOverlay` set `margin-top` from a computed offset. The spawn timer and the immunity timer move these three panels by 7 px.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/GameRightSidebar.ts:69-77`, `:197-204`, `src/client/hud/layers/GameLeftSidebar.ts:96-98`, `:118`, `src/client/hud/layers/PlayerInfoOverlay.ts:102-104`, `:637`
- Found in: #3

### The static top-right `<div>` keeps added nodes

The `<div>` at `index.html:365` is static HTML that no Lit component draws, so a third child that a script appends there stays. `GameRightSidebar` writes the `marginTop` of this `<div>`.

- Checked at: `332e5410e`
- Game source: `index.html:365-370`, `src/client/hud/layers/GameRightSidebar.ts:197-204`
- Used in: `src/features/alliance-panel/index.ts:16-20`, `:32`, `src/test/fakes.ts:638-644`
- Found in: #1, #3, #10, #17, #41

### Sources disagree on nodes inside `<game-right-sidebar>`

Sources disagree. Check before use.

* #10, #17 and #41 say that the next Lit render of `<game-right-sidebar>` removes a node that a script puts inside it. This render comes about every 250 ms.
* #3 says that a normal Lit update keeps appended nodes, and does not list `<game-right-sidebar>` among the elements that empty themselves.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/GameRightSidebar.ts:131-133`
- Found in: #3, #10, #17, #41

### The game appends its popups to `<body>`

The game makes its own popups with a `<div>` appended to `document.body` and placed from a measured rectangle, for example in `ColumnPicker` and `ConfirmDialog`. No game code clears the children of `<body>`. An empty `<div id="app">` also exists, and the game does not use it. The game installs no `MutationObserver` in `src/client`, so it does not undo DOM changes.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ColumnPicker.ts:86-92`, `src/client/components/ConfirmDialog.ts:60`, `index.html:317`
- Found in: #3

### The game sends no HUD geometry events

The game uses `ResizeObserver` only on the WebGL canvas, and it listens to `window.resize` only to update the canvas rectangle. A layer that aligns with a HUD element must install its own `ResizeObserver`. The bottom HUD is a grid with a fixed middle column of 500 px, which changes width at the `sm` breakpoint.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:417-426`, `src/client/render/gl/MapRenderer.ts:72-78`, `src/client/hud/GameRenderer.ts:363-365`, `index.html:321`, `:330`
- Found in: #3

### The game uses Tailwind 4 with literal class names

The game styles its pages with Tailwind CSS 4, a CSS library of small utility classes. The class names are literal, not hashed, so page CSS can target them, but many unrelated elements share one utility class. Tailwind builds only the classes that the game uses, so a class that the game does not use has no CSS. The server sends no Content-Security-Policy, so an injected `<style>` works, and the brand colours are custom properties in an `@theme` block.

- Checked at: `332e5410e`
- Game source: `src/client/styles.css:1`, `:6-38`
- Found in: #3

### The in-match leaderboard is `<player-stats>`

The in-match leaderboard is `<player-stats>` inside `<game-left-sidebar>`, with the base class `StatsTable`. `<leaderboard-modal>` is a different element, the ranking on the home page. The HUD has no top bar. The top left is `<game-left-sidebar>`, the top right is `<game-right-sidebar>` with the timer, and the top centre is `<player-info-overlay>`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerStats.ts:8-9`, `src/client/hud/layers/GameLeftSidebar.ts:13-14`, `src/client/hud/layers/PlayerInfoOverlay.ts:634-636`
- Found in: #3

### HUD blocks sit between z-index 200 and 1001

The bottom HUD block is at z-index 200, and its wrapper has `pointer-events: none`. The top-left sidebar is at 900, the top-right block at 1000 and the hover info panel at 1001. The build menu is at 9999, and the consent banners go up to 999999.

- Checked at: `332e5410e`
- Game source: `index.html:41`, `:320-357`, `:365-370`, `src/client/hud/layers/GameLeftSidebar.ts:113`, `src/client/hud/layers/PlayerInfoOverlay.ts:635`, `src/client/hud/layers/BuildMenu.ts:176`
- Found in: #1, #3, #5, #14, #37

### Every modal sits above the HUD and dims it

Every modal sits above the 1000 block, and behind a modal the game blurs and dims its HUD. A node inside the HUD dims too, but an overlay on the page stays bright. A map layer at `z-index: 50` sits under every game panel, so the leaderboard can hide a map label.

- Checked at: `332e5410e`
- Game source: `index.html:320-357`, `:365-370`
- Found in: #1, #3, #5, #14, #37

### HUD text is 14 px bold tabular figures

The HUD text uses 14 px bold tabular figures, with a 1 px dark drop shadow under light text. Boxes have 6 px corners, 1 px borders and gaps of 4 to 6 px.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:347`, `:364`, `:468`, `:486`
- Found in: #6, #21

### HUD colours have fixed meanings

In the HUD, yellow means gold, blue means troops, green means good and orange means a warning. Purple appears only outside the bottom row: `PlayerPanel` marks a Nation in indigo and a Bot in purple, and two modals use `bg-indigo-600`. A Nation is a player that the game controls, and a Bot is a simpler computer player. Pink, fuchsia and rose are unused.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerPanel.ts:365-371`, `src/client/hud/layers/WinModal.ts:231`, `src/client/hud/layers/SendResourceModal.ts:276`
- Found in: #6, #21

### The control panel narrows below 64rem

Below the `lg` breakpoint (64rem, 1024 px), the control panel changes to its narrow layout. The hotbar container is `hidden lg:block`, so the hotbar has no size at this width.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:626-627`, `index.html:339`
- Used in: `src/features/hotbar/hotbar.ts:115-120`
- Found in: #1, #3, #9, #16

## How often the HUD and the map redraw

### The HUD redraws on ticks, the map on frames

The tick rate and its exceptions are in [access.md](access.md). The HUD redraws from the tick loop: `renderer.tick()` calls the `tick()` of each controller, and a controller can slow itself with `getTickIntervalMs()`. The `requestAnimationFrame` loop only syncs the camera and draws the WebGL canvas.

- Checked at: `332e5410e`
- Game source: `src/client/ClientGameRunner.ts:466-471`, `:877`, `src/client/hud/GameRenderer.ts:377-402`
- Found in: #3

### HUD components redraw 1 to 10 times per second

The HUD components redraw at these rates:

* 10 per second: `ControlPanel`, `PlayerInfoOverlay` and `UnitDisplay`, `EventsDisplay` at most, and `BuildMenu` only while open
* 4 per second: `GameRightSidebar`
* 1 per second: `GameLeftSidebar`, and `PlayerStats` and `TeamStats` only while visible

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:171`, `src/client/hud/layers/PlayerInfoOverlay.ts:172-174`, `src/client/hud/layers/UnitDisplay.ts:89-105`, `src/client/hud/layers/GameRightSidebar.ts:131-133`, `src/client/hud/layers/GameLeftSidebar.ts:70-72`, `src/client/components/StatsTable.ts:112-114`, `src/client/hud/layers/BuildMenu.ts:161-165`
- Found in: #3

## The troop bar and the hotbar

### The troop bar is a 24 px box with two fills

The troop bar is a 24 px tall box (`h-6`) in `<control-panel>`. The game stretches its two fills with `transform: scaleX(...)`: troops in `#0084d1`, committed troops in `#3fa9f5`. The fill fraction is `troops / maxTroops`, so `left: 42.2%` marks 42.2% of the bar with no measure. The troop numbers sit across the middle, and [economy.md](economy.md) says which fill class is which.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:329-359`, `:395-441` (`calculateTroopBar`)
- Used in: `src/test/fakes.ts:381-392`
- Found in: #1, #3, #5, #6, #20, #21

### The wide and narrow troop bars are both in the page

The control panel hides one of its two troop bars with `lg:hidden` or `hidden lg:block`, so a plain `querySelector` can return the hidden copy. The narrow bar writes a troop count at its right edge, and its troop rate pill sits across its middle.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:626-627`, `renderDesktopTroopBar` and `renderMobileTroopBar` in `src/client/hud/layers/ControlPanel.ts`
- Used in: `src/features/troop-bar/troop-bar.ts:17-24`
- Found in: #1, #3, #5, #6, #20, #21

### Only the troop bar clips, not its ancestors

Only the troop bar clips its content, and every ancestor up the HUD has `overflow: visible`. The cell that holds the bar is `position: static` and exactly as wide as the bar. So a node one level up can draw above the bar without a clip, after the script sets `position: relative` on that cell.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts`
- Used in: `src/features/troop-bar/troop-bar.ts:21-23`
- Found in: #5, #20

### The troop rate pill changes colour at the peak

A pill left of the troop bar shows the troop rate, for example `+380/s`. Its border and text are green while the rate rises and orange while it falls, so the colour changes at the peak. Its width is fixed at `w-[5.5rem]`.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/ControlPanel.ts:300-307`, `:461-490`
- Found in: #6

### The inspect panel draws a troop bar too

`PlayerInfoOverlay` draws the same troop bar for any player that the user inspects.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/PlayerInfoOverlay.ts:545-582`
- Found in: #6

### The hotbar is empty in the spawn phase, after death and in a replay

Each hotbar icon is an `<img>` whose `alt` names its structure, inside a positioned item of `<unit-display>`. The `render()` of `<unit-display>` returns `null` in the spawn phase, after death, in a replay and with all units disabled. Hotbar prices are in [economy.md](economy.md).

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/UnitDisplay.ts:33`, `:50`, `:116`, `:119`, `:277`, `render` and `renderUnitItem` in `src/client/hud/layers/UnitDisplay.ts`, `index.html:339`
- Used in: `src/features/hotbar/hotbar.ts:3-12`, `:24`, `:40-47`, `src/game/types.ts:116-123`, `src/test/fakes.ts:454-464`
- Found in: #3, #9, #16

## Menus and modals

### `body` overflow is `hidden` while an `<o-modal>` is open

While any `<o-modal>` is open, `document.body.style.overflow` is `hidden`. The chat, the player panel and the leaderboard are `<o-modal>` modals, but the two settings modals are not.

- Checked at: `332e5410e`
- Game source: `src/client/components/baseComponents/Modal.ts`
- Used in: `src/features/alliance-view/index.ts:78`, `:146-156`
- Found in: #1, #13

### The in-match settings menu is rebuilt at each open

The gear icon in `<game-right-sidebar>` opens `<settings-modal>`, which the game builds again at each open. At `332e5410e`, its first row, "Graphics settings", opens a second panel.

- Checked at: `332e5410e`
- Game source: `src/client/hud/layers/SettingsModal.ts:49`, `:214`, `:243-260`
- Used in: `src/settings-panel/entries.ts:7-10`, `:42-43`, `:54-57`
- Found in: #26, #41

### Newer game versions drop the Graphics settings row

On the game `main` branch of 2026-10-27, the in-match menu has no "Graphics settings" row. A row with `data-open-settings` opens the settings page of the game in its place. Nobody has seen this newer menu on openfront.io.

- Checked at: `unknown` (game `main` of 2026-10-27)
- Game source: `src/client/hud/layers/SettingsModal.ts` on game `main` of 2026-10-27, not at `332e5410e` (path unconfirmed)
- Used in: `src/settings-panel/entries.ts:44-45`, `:54-57`
- Found in: #1, #41

### The settings page draws its body late

Outside a match, the settings page is `<user-setting id="page-settings">`, and the game draws its body after the script starts.

- Checked at: `332e5410e`
- Game source: `index.html:246`, `src/client/UserSettingModal.ts`
- Used in: `src/settings-panel/entries.ts:11-13`
- Found in: #26, #41
