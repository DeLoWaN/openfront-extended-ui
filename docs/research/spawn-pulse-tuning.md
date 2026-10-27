# Can the game's own spawn pulse be made bigger at run time?

Research for [issue #33](https://github.com/DeLoWaN/openfront-extended-ui/issues/33), part of the map at [issue #1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1).

All file paths below are relative to the game source at `src/client/` in `/Users/damien/git_perso/OpenFrontIO/`, pinned at commit `332e5410e`. The game moves fast, so check a line number before you rely on it.

Nothing here was run live. Every claim comes from reading the source. Claims that only a live run can confirm carry the word **unverified**.

## Answer

**Yes, for size. No, for colour.**

A script can make the teammate ring bigger while the match runs. It writes plain numbers into an object that the renderer reads on every frame. No rebuild is needed.

A script cannot change the colour of the teammate ring through any setting. The colour is not a setting. It comes from each player's territory colour, which the game puts into the instance data every tick.

## Terms

- **Spawn phase**: the time before the match starts, when players pick a spawn tile. See `CONTEXT.md`.
- **Spawn pulse**: what the game draws on a spawn tile during the spawn phase. For a teammate it is a breathing ring. For an enemy it is a flat coloured disc.
- **Pass**: one step of the WebGL renderer. The spawn pulse is drawn by `SpawnOverlayPass`.
- **Quad**: the square of pixels the pass draws for each spawn tile. The shader paints the ring inside it and clips everything outside it.

## How the pulse is built

1. `SpawnOverlayPass.ts` draws one instanced quad per spawn tile (`SpawnOverlayPass.ts:9-12`, `:243`).
2. The pass gives each quad a kind. Enemy is 0, self is 1, teammate is 2 (`SpawnOverlayPass.ts:35-37`).
3. Only human players get a pulse (`WebGLFrameBuilder.ts:345`). A human who has not chosen a spawn tile yet gets none (`WebGLFrameBuilder.ts:347`).
4. A teammate exists only in a team game: the player is on your team and is not you (`WebGLFrameBuilder.ts:364-367`).
5. Every other human, in any game mode, is an "enemy" for this pass (`SpawnOverlayPass.ts:187`).
6. The pass draws after the territory, so the ring sits on top of owned land (`render/gl/Renderer.ts:1335`).

## The nine settings

The defaults are in `render/gl/render-settings.json:325-335`. The type is in `render/gl/RenderSettings.ts:379-389`.

| Setting | Default | Who it affects | What it does | Source |
| --- | --- | --- | --- | --- |
| `mateMinRad` | 5 | Teammate ring | Inner radius, in tiles. Alpha rises from 0 at the centre to 1 here. | `spawn-overlay.frag.glsl:46`, `:62`, `:68-71` |
| `mateMaxRad` | 14 | Teammate ring | Outer radius, in tiles. Also sets the quad size. | `spawn-overlay.frag.glsl:47`, `:63`; `SpawnOverlayPass.ts:165` |
| `selfMinRad`, `selfMaxRad` | 10, 30 | Your own ring | Same as above, for you. | `spawn-overlay.frag.glsl:50-51`; `SpawnOverlayPass.ts:164` |
| `animSpeed` | 0.008 | Both rings | Breath speed, in radians per millisecond. The period is about 785 ms. | `SpawnOverlayPass.ts:218`, `:222` |
| `gradientSolidEnd` | 0.1 | Both rings | Share of the ring body that stays at full alpha before it fades out. | `spawn-overlay.frag.glsl:66`, `:72-76` |
| `gradientInnerEdge` | 0.01 | Nobody | **No effect.** The pass uploads it, but the shader reads only the `y` part of `uGradientStops`. | `SpawnOverlayPass.ts:237`; `spawn-overlay.frag.glsl:15`, `:66` |
| `highlightRadius` | 9 | Enemy discs | Disc radius, in tiles. Also sets the quad size. | `spawn-overlay.frag.glsl:35`; `SpawnOverlayPass.ts:166` |
| `highlightAlpha` | 1.0 | Enemy discs | Disc opacity. | `spawn-overlay.frag.glsl:38` |

## Can a script change them at run time?

Yes. The chain is short and has no copy in it.

1. `window.__webglView` is the `MapRenderer`. The game sets it with no development-only guard (`ClientGameRunner.ts:394`).
2. `getSettings()` on it returns the renderer's own settings object (`render/gl/MapRenderer.ts:350-351`, `render/gl/Renderer.ts:1149-1151`).
3. That object is the one the pass was built with (`render/gl/Renderer.ts:229`, `:454-460`). The pass keeps a reference to the `spawnOverlay` part (`SpawnOverlayPass.ts:87`).
4. The pass reads that reference again on every use:
   - In `update()` it reads `selfMaxRad`, `mateMaxRad` and `highlightRadius` to size the quads (`SpawnOverlayPass.ts:163-166`).
   - In `draw()` it reads `animSpeed` and sends all the other values to the GPU as uniforms (`SpawnOverlayPass.ts:218`, `:230-237`).

The game's own render debug panel does exactly this. It binds sliders to the same object and the changes show at once (`render/gl/debug/Layout.ts:750-830`). The Settings modal has a button that opens it (`hud/layers/SettingsModal.ts:172`, `:535`). Whether every player sees that button is **unverified**.

Example a script can run:

```js
const s = window.__webglView?.getSettings()?.spawnOverlay;
if (s) {
  s.mateMinRad = 10;
  s.mateMaxRad = 28;
}
```

### When the change shows

- **Next frame**: every value the shader reads as a uniform. That is the two radii, `gradientSolidEnd`, `animSpeed` and `highlightAlpha`.
- **Next game tick**: the quad size. The quad is sized in `update()`, and `update()` runs once per game tick (`ClientGameRunner.ts:876`, `WebGLFrameBuilder.ts:213`, `:370`).

Result: after the script raises `mateMaxRad`, the ring may be clipped to the old square for up to one tick. The tick length in the spawn phase is **unverified**. The Wayfinder map assumes 100 ms. Lowering the radius has no such effect.

### Traps

1. **Write into the object. Never replace it.** Run `s.mateMaxRad = 28`. Never run `getSettings().spawnOverlay = {...}`. The pass holds the old object and would ignore the new one (`SpawnOverlayPass.ts:54`, `:87`).
2. **`getSettings()` can return `{}`.** It does so when the renderer does not exist, for example after the browser loses the WebGL context (`render/gl/MapRenderer.ts:104-110`, `:350-351`). Reading `.spawnOverlay` then gives `undefined`. Guard for that.
3. **The values survive a context restore.** The settings object is kept and reused for the new renderer (`render/gl/MapRenderer.ts:62-66`, `:89-98`).
4. **The game can overwrite the script's values.** When the player changes any graphics setting, the game builds fresh defaults and copies them over the live object (`ClientGameRunner.ts:625-627`, `:642-652`, `render/gl/SettingsUtils.ts:12-29`). The graphics overrides contain no `spawnOverlay` entry (`render/gl/RenderOverrides.ts`, checked end to end), so the spawn values go back to the defaults. The debug panel's reset button does the same (`render/gl/debug/Wiring.ts:100-106`). The script should set its values again at the start of each spawn phase. Setting them on every tick is cheap and safer.
5. **Only `tileDrip.bucketCount` is documented as needing a reload** (`render/gl/RenderSettings.ts:370-377`). It is not a spawn setting.

## Can the colour of the teammate ring change?

Not through a setting.

- The teammate colour is per-instance data: `p.territoryColor()` for that player (`WebGLFrameBuilder.ts:352`, `:360-362`). The pass copies it into the buffer (`SpawnOverlayPass.ts:178-180`). The shader uses it as is for a teammate (`spawn-overlay.frag.glsl:48`).
- In a team game that colour comes from the team (`theme/ThemeProvider.ts:143-147`). The game rebuilds the instance data every tick, so any value a script wrote into it would last for one tick at most.
- Your own ring pulses from white to your colour (`spawn-overlay.frag.glsl:52-54`), or from white to gold when you have no team (`WebGLFrameBuilder.ts:353`, `:360-362`). That is fixed in the shader.
- The alpha pulse from 0.65 to 1.0 and the radius pulse from 0.5 to 1.15 are constants in the shader (`spawn-overlay.frag.glsl:61`, `:79`). A script cannot reach them.

So "brighter" is not available. The ring already reaches full alpha at its peak. A script can only make it bigger, or make its solid band wider with `gradientSolidEnd`.

There is one more door, which this note does not recommend. `MapRenderer.updateSpawnOverlay(inSpawnPhase, centers)` is public (`render/gl/MapRenderer.ts:261-263`), and `centers` carries a colour per spawn. A script could call it with its own colours. The game calls it again on every tick and wins (`WebGLFrameBuilder.ts:370`), so the colour would flicker. It would also break ADR-0008.

### Which settings stay inside ADR-0008

[ADR-0008](../adr/0008-information-by-position-and-text-never-by-changing-a-real-colour.md) says the package never changes a real player colour. It adds information by position and by text.

Inside the rule:

- `mateMinRad`, `mateMaxRad`: size is position-like. The colour does not change.
- `gradientSolidEnd`: a wider solid band is still the player's own colour at full alpha.
- `animSpeed`: speed only.

Not clearly inside the rule:

- `highlightAlpha`: it keeps the hue of the enemy disc but makes it paler. ADR-0008 turned down a darkened territory because it "stops reading as its owner". A paler disc has the same weakness. Avoid it.
- `highlightRadius` (smaller): fine for the rule, but it hides where an enemy is. That works against the goal of the feature.

The ADR speaks of the colour of a territory. The ring is an overlay, not a territory. Even so, the cautious reading above is the safe one.

## How big is a bigger pulse on screen?

Ring and disc radii are in map tiles. So the on-screen size is the radius times the zoom. The zoom is `TransformHandler.scale`, in CSS pixels per tile. The camera multiplies it by the device pixel ratio (`ClientGameRunner.ts:429-439`).

- The game starts with the whole map in view: `centerAll(0.9)` (`hud/GameRenderer.ts:368`, `TransformHandler.ts:388-404`). That gives `scale = min(viewWidth / mapWidth, viewHeight / mapHeight) * 0.9`.
- The zoom range is 0.2 to 20 (`TransformHandler.ts:307`). The default start is `1.8` only before `centerAll` runs (`TransformHandler.ts:34`).

Map sizes come from `resources/maps/*/manifest.json`: World is 2000 by 1000, Europe 2904 by 1672, Achiran 2000 by 1700.

For a 1920 by 1080 canvas, the default scale is 0.864 on World, 0.581 on Europe and 0.572 on Achiran. The table uses 0.864, 0.581 and the minimum 0.2.

The outer radius at the top of the breath is `mateMaxRad * 1.15`. The radius in CSS pixels:

| Case | Tiles at peak | At scale 0.864 | At scale 0.581 | At scale 0.2 |
| --- | --- | --- | --- | --- |
| Default, `mateMaxRad` 14 | 16.1 | 13.9 px | 9.4 px | 3.2 px |
| Default, bottom of the breath | 7.0 | 6.0 px | 4.1 px | 1.4 px |
| `mateMaxRad` 30 (top of the debug slider) | 34.5 | 29.8 px | 20.0 px | 6.9 px |
| `mateMaxRad` 60 | 69.0 | 59.6 px | 40.1 px | 13.8 px |
| Enemy disc, `highlightRadius` 9 | 9.0 | 7.8 px | 5.2 px | 1.8 px |
| Your own ring, default `selfMaxRad` 30 | 34.5 | 29.8 px | 20.0 px | 6.9 px |

Readings:

- With `mateMaxRad` at 30, a teammate ring is as large as your own ring is today.
- At the lowest zoom, the default ring is about 3 px in radius. That is too small to see. Even `mateMaxRad` 60 gives only 14 px.
- A ring that stays the same size on screen needs the live zoom. `MapRenderer` has no getter for it. The zoom lives in `TransformHandler`, which the game hands to some HUD elements as a property, for example `emojiTable.transformHandler` (`hud/GameRenderer.ts:76`). Whether a script can reach it from the page is **unverified**.

## Will a bigger ring blend with the enemy discs?

The two shapes differ, so a bigger ring should still read as a ring. A live look is **unverified**.

- An enemy disc is flat. It has full alpha, a hard edge, and it is drawn only on tiles nobody owns (`spawn-overlay.frag.glsl:30-40`). Its radius is 9 tiles.
- A teammate ring is a soft gradient with a pulsing radius and a pulsing alpha. It is drawn on any tile, owned or not (`spawn-overlay.frag.glsl:42-80`).
- The pass draws enemies first, then teammates, then you (`SpawnOverlayPass.ts:184-194`). With normal alpha blending, a ring is drawn over any disc under it.

Two risks remain:

1. In a team game, a disc and a ring both use a player's territory colour, and a team shares one colour family. A large ring in a team colour can look like a disc of the same team.
2. A ring of 30 tiles or more covers any enemy disc near it. That hides where an enemy spawned.

## Does the shader limit how big the ring can grow?

No hard limit exists in the setting path.

- The quad radius is `maxRad * 1.15 + 1` (`SpawnOverlayPass.ts:29-32`, `:164-165`). The `1.15` equals the shader's peak breath scale, `0.5 + 0.65` (`spawn-overlay.frag.glsl:61`). The quad grows with the setting, so the ring is never clipped for a stable value.
- The vertex shader places the quad as `center + local * r` with no cap (`spawn-overlay.vert.glsl:20-28`).
- The debug sliders stop at 30 for `mateMaxRad`, 50 for `selfMaxRad`, and 20 for `highlightRadius` (`render/gl/debug/Layout.ts:750-830`). These are slider limits. The pass does not enforce them.
- Cost grows with the square of the radius, one quad per spawn tile. That is small for a team game. The effect on a lobby with hundreds of humans is **unverified**.
- The one-tick clipping described above applies after an increase.

## What a script can and cannot change

Can change, at run time, with no rebuild:

- `mateMinRad`, `mateMaxRad`, `animSpeed`, `gradientSolidEnd`
- `selfMinRad`, `selfMaxRad`, `highlightRadius`, `highlightAlpha`

Can write, but it does nothing:

- `gradientInnerEdge`

Cannot change through settings:

- The colour of any ring or disc
- The breath range of the radius (0.5 to 1.15) and of the alpha (0.65 to 1.0)
- Which players get a pulse. Humans only, and teammates only in team games.
- The ring size at a fixed screen size. Radii are in tiles, so the ring shrinks as the player zooms out.

## What a live run must still confirm

- The tick length in the spawn phase, and so how long the quad stays at the old size.
- How a ring of 20 to 30 tiles looks next to enemy discs, in a team game with many teams.
- Whether a script can read the live zoom, to hold a constant on-screen size.
- Whether the Settings modal shows the debug panel button to every player.
- Whether a graphics settings change really resets the spawn values (the code says it does).

## Consequence for #35

Making the game's own pulse bigger is a cheap first candidate for the spawn mark. Its weak point is zoom: the ring is tied to tiles and is tiny at low zoom, which is the case the feature exists for. A mark of our own, sized in screen pixels, avoids that. The prototype should compare the two.
