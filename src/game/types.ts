/**
 * The parts of the game the package reads.
 *
 * These describe objects the game builds, not objects the package builds. Every
 * member here is a guess about somebody else's code, so each one names the file
 * it was read from. The game moves fast. Check a citation before you trust it.
 *
 * Read at OpenFrontIO commit 332e5410e.
 */

/** A colour, as the `colord` library hands it back. `PlayerView.ts:285`. */
export interface Colour {
  /** Each channel runs 0 to 255. */
  toRgb(): { r: number; g: number; b: number; a: number };
}

/**
 * Where the game draws a player's name on the map. `Game.ts:1039`.
 *
 * `x` and `y` are world tiles. `size` feeds the steps the game sizes a name
 * with, so a label of ours at this point grows and shrinks with the name.
 */
export interface NameLocation {
  x: number;
  y: number;
  size: number;
}

/**
 * One alliance a player is in. `GameUpdates.ts:261`.
 *
 * The game builds this list for every player, not only the local one, so a
 * stranger's alliances are readable too. `other` is the partner's `PlayerID`,
 * which is a different identifier from the `smallID` the palette is keyed by.
 */
export interface Alliance {
  other: string;
  /** The tick the alliance ends at. Compare it against `GameView.ticks()`. */
  expiresAt: number;
}

/** A player, as the client sees it. `src/client/view/PlayerView.ts`. */
export interface PlayerView {
  /** False after the player dies. The object itself is never removed. */
  isAlive(): boolean;
  /** The index this player's colours sit at in the palette. `:440`. */
  smallID(): number;
  /** The identifier an `Alliance` names its partner by. `:462`. */
  id(): string;
  /** False for TerraNullius, which owns every unclaimed tile. `:490`. */
  isPlayer(): boolean;
  /** The players this one is allied with. Teammates are not included. `:496`. */
  allies(): PlayerView[];
  /** Every alliance this player is in, with its end tick. `:547`. */
  alliances(): Alliance[];
  /** The territory fill colour. `:285`. */
  territoryColor(): Colour;
  /** The border colour. `:309`. */
  borderColor(): Colour;
  /** Undefined until the renderer has placed this player's name. `:436`. */
  nameLocation(): NameLocation | undefined;
}

/** The match's own rules. `src/core/configuration/Config.ts`. */
export interface GameConfig {
  /** How long before the end the game offers to renew, in ticks. */
  allianceExtensionPromptOffset(): number;
}

/**
 * One match, as the client sees it. `src/client/view/GameView.ts`.
 *
 * The game builds a new one of these per match and assigns it onto the same
 * `<control-panel>` element. Its identity is the only thing that tells two
 * matches apart.
 */
export interface GameView {
  /**
   * Null before the local player spawns, null until the first game update
   * arrives, and null for the whole match in a replay. Not null after death.
   */
  myPlayer(): PlayerView | null;
  /** True until the spawn phase ends. */
  inSpawnPhase(): boolean;
  /** 0 before the first game update. */
  ticks(): number;
  /** Every player of this match, dead ones included. `:1019`. */
  players(): PlayerView[];
  /** Throws for an id it does not know, and 0 is TerraNullius. `:1034`. */
  playerBySmallID(id: number): PlayerView;
  /** The match's own rules. `:1098`. */
  config(): GameConfig;
  /** The handle for one tile. `:1157`. */
  ref(x: number, y: number): number;
  /** False for a point off the map. `:1185`. */
  isValidCoord(x: number, y: number): boolean;
  /** False for water, which nobody owns. `:1188`. */
  isLand(ref: number): boolean;
  /** One tile's packed state. Mask it with `OWNER_MASK` for the owner. `:1291`. */
  tileState(ref: number): number;
}

/**
 * The map renderer, as the game puts it on `window`. `MapRenderer.ts`.
 *
 * `ClientGameRunner.ts:394` assigns it to `window.__webglView` with no
 * development-only guard, so it is there in a real match too. It is the game's
 * own public wrapper around the renderer, described in its own file header as a
 * data sink for consumers to use.
 */
export interface MapRenderer {
  /**
   * Replaces every player's colours in one call. `:169`.
   *
   * The array is `PALETTE_SIZE * 2 * 4` floats. It is copied, so the same array
   * can serve every call.
   */
  updatePalette(palette: Float32Array): void;
}

/**
 * The camera. `src/client/TransformHandler.ts`.
 *
 * `GameRenderer.ts:87` assigns it onto the `<build-menu>` element, which is how
 * a userscript reaches it.
 */
export interface TransformHandler {
  /** Screen pixels per world tile. `:33`. */
  readonly scale: number;
  /** The world tile under a point on the screen. `:122`. */
  screenToWorldCoordinates(
    screenX: number,
    screenY: number,
  ): { x: number; y: number };
  /** Where a world point lands on the screen. `:116`. */
  worldToScreenCoordinates(cell: { x: number; y: number }): {
    x: number;
    y: number;
  };
}

/** The `<build-menu>` element, which carries the camera. `GameRenderer.ts:87`. */
export interface BuildMenu extends HTMLElement {
  transformHandler?: TransformHandler;
}

/**
 * The page-wide event bus. `src/core/EventBus.ts`.
 *
 * One bus serves every match on the page, and it never forgets a listener.
 * `off` matches by function reference, so an inline arrow can never be removed.
 */
export interface EventBus {
  on(type: GameEventType, handler: GameEventHandler): void;
  off(type: GameEventType, handler: GameEventHandler): void;
}

/** The class the game emits, used as the bus key. */
export type GameEventType = abstract new (...args: never[]) => object;

export type GameEventHandler = (event: never) => void;

/**
 * The `<control-panel>` element. `index.html:338`, `ControlPanel.ts:26`.
 *
 * Static markup that lives for the whole page. `.game` is replaced each match.
 * `.eventBus` is the same object for every match, so it can never tell them
 * apart. Both are absent until the first match runs.
 */
export interface ControlPanel extends HTMLElement {
  game?: GameView;
  eventBus?: EventBus;
  /**
   * A prototype method the game's controller loop calls once per game tick.
   * An own property shadows it, and `delete` restores the original.
   */
  tick?(): void;
}
