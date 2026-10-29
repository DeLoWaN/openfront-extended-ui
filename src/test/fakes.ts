/**
 * Stand-ins for the game objects the package reads.
 *
 * `FakeControlPanel` is a real custom element, because two things the package
 * does depend on that. It reads the game's markup below the element, and it
 * shadows the element's `tick` with an own property and restores the original
 * with `delete`, which only works while `tick` sits on the prototype.
 *
 * `FakeEventBus` copies the one behaviour of the real bus that traps callers:
 * `off` matches by function reference, so a listener registered as one function
 * and removed as another stays registered forever.
 */

import type {
  Alliance,
  BuildMenu,
  BuildableUnit,
  Colour,
  ControlPanel,
  EventBus,
  GameConfig,
  GameEventHandler,
  GameEventType,
  GameUpdates,
  GameView,
  MapRenderer,
  MatchSettings,
  NameLocation,
  PlayerState,
  PlayerType,
  PlayerView,
  RenderSettings,
  TerrainColours,
  TransformHandler,
  UnitDisplay,
} from "../game/types";

export class FakeEventBus implements EventBus {
  private readonly listeners = new Map<GameEventType, Set<GameEventHandler>>();

  on(type: GameEventType, handler: GameEventHandler): void {
    let handlers = this.listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(type, handlers);
    }
    handlers.add(handler);
  }

  off(type: GameEventType, handler: GameEventHandler): void {
    this.listeners.get(type)?.delete(handler);
  }

  listenerCount(): number {
    let total = 0;
    for (const handlers of this.listeners.values()) total += handlers.size;
    return total;
  }

  emit(type: GameEventType, event: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      (handler as (event: unknown) => void)(event);
    }
  }
}

/** A colour, in the shape the game's own accessors return. */
export function fakeColour(r: number, g: number, b: number): Colour {
  return { toRgb: () => ({ r, g, b, a: 1 }) };
}

/** Gives each alliance a number of its own, as the game does. */
let nextAllianceId = 1;

export class FakePlayerView implements PlayerView {
  alive = true;
  /** What the game prints for this player. */
  name: string;
  goldHeld = 0n;
  allyList: FakePlayerView[] = [];
  allianceList: Alliance[] = [];
  /** Undefined stands for a player the renderer has not placed yet. */
  nameData: NameLocation | undefined = { x: 0, y: 0, size: 40 };
  player = true;
  /** Null in a match without teams, as the game has it. */
  teamName: string | null = null;
  kind: PlayerType = "HUMAN";
  /** Undefined stands for a player who has not picked a spawn. */
  readonly state: PlayerState = {};

  constructor(
    readonly small = 1,
    readonly playerID = `player-${small}`,
    readonly territory: Colour = fakeColour(200, 100, 50),
    readonly border: Colour = fakeColour(220, 120, 70),
  ) {
    this.name = `Player ${small}`;
  }

  isAlive(): boolean {
    return this.alive;
  }
  /** Picks a spawn, the way a player does. */
  spawnAt(x: number, y: number, game: FakeGameView): void {
    this.state.spawnTile = game.ref(x, y);
  }
  smallID(): number {
    return this.small;
  }
  id(): string {
    return this.playerID;
  }
  displayName(): string {
    return this.name;
  }
  isPlayer(): boolean {
    return this.player;
  }
  allies(): PlayerView[] {
    return this.allyList;
  }
  isOnSameTeam(other: PlayerView): boolean {
    return (
      this.teamName !== null &&
      this.teamName === (other as FakePlayerView).teamName
    );
  }
  team(): string | null {
    return this.teamName;
  }
  type(): PlayerType {
    return this.kind;
  }
  hasSpawned(): boolean {
    return this.state.spawnTile !== undefined;
  }
  alliances(): Alliance[] {
    return this.allianceList;
  }
  territoryColor(): Colour {
    return this.territory;
  }
  borderColor(): Colour {
    return this.border;
  }
  nameLocation(): NameLocation | undefined {
    return this.nameData;
  }
  gold(): bigint {
    return this.goldHeld;
  }

  /**
   * Allies both players and writes the alliance row on each of them.
   *
   * Returns the alliance's number, which a renewal keeps.
   */
  allyWith(other: FakePlayerView, expiresAt: number): number {
    const id = nextAllianceId++;
    this.allyList.push(other);
    other.allyList.push(this);
    this.allianceList.push({ id, other: other.id(), expiresAt });
    other.allianceList.push({ id, other: this.id(), expiresAt });
    return id;
  }

  /** Moves the end tick of one alliance, as a completed renewal does. */
  renew(allianceId: number, expiresAt: number): void {
    for (const alliance of this.allianceList) {
      if (alliance.id === allianceId) alliance.expiresAt = expiresAt;
    }
  }

  /** Ends the alliance on this side, with no news from the game. */
  endAlliance(allianceId: number): void {
    this.allianceList = this.allianceList.filter(
      (alliance) => alliance.id !== allianceId,
    );
  }
}

/** The game's own alliance figures, as a live match reports them. */
export class FakeGameConfig implements GameConfig {
  /** A match without teams, until a test sets otherwise. */
  match: MatchSettings = { gameMode: "Free For All" };
  extensionOffset = 300;
  requestDuration = 200;
  allianceTicks = 3000;

  gameConfig(): MatchSettings {
    return this.match;
  }
  allianceExtensionPromptOffset(): number {
    return this.extensionOffset;
  }
  allianceRequestDuration(): number {
    return this.requestDuration;
  }
  allianceDuration(): number {
    return this.allianceTicks;
  }
}

export class FakeGameView implements GameView {
  player: FakePlayerView | null = new FakePlayerView();
  spawnPhase = false;
  tickCount = 1;
  /** What the game reports for the last tick. Null before the first one. */
  updates: GameUpdates | null = null;
  readonly settings = new FakeGameConfig();
  /** The map is square, this many tiles on a side. */
  readonly side = 100;

  private readonly roster: FakePlayerView[] = [];
  private readonly owners = new Map<number, number>();
  private readonly water = new Set<number>();

  myPlayer(): PlayerView | null {
    return this.player;
  }
  inSpawnPhase(): boolean {
    return this.spawnPhase;
  }
  ticks(): number {
    return this.tickCount;
  }
  updatesSinceLastTick(): GameUpdates | null {
    return this.updates;
  }
  players(): PlayerView[] {
    return this.roster;
  }
  playerBySmallID(id: number): PlayerView {
    const found = this.roster.find((candidate) => candidate.smallID() === id);
    // The real one throws for an id it does not know, so this one does too.
    if (!found) throw new Error(`no player with smallID ${id}`);
    return found;
  }
  config(): GameConfig {
    return this.settings;
  }
  ref(x: number, y: number): number {
    return y * this.side + x;
  }
  x(ref: number): number {
    return ref % this.side;
  }
  y(ref: number): number {
    return Math.floor(ref / this.side);
  }
  width(): number {
    return this.side;
  }
  height(): number {
    return this.side;
  }
  isValidCoord(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.side && y < this.side;
  }
  isLand(ref: number): boolean {
    return !this.water.has(ref);
  }
  tileState(ref: number): number {
    return this.owners.get(ref) ?? 0;
  }
  tileStateBuffer(): Uint16Array {
    const buffer = new Uint16Array(this.side * this.side);
    for (const [ref, owner] of this.owners) buffer[ref] = owner;
    return buffer;
  }

  add(player: FakePlayerView): FakePlayerView {
    this.roster.push(player);
    return player;
  }
  /** Gives one tile to a player. A smallID of 0 leaves it unclaimed. */
  own(x: number, y: number, smallID: number): void {
    this.owners.set(this.ref(x, y), smallID);
  }
  makeWater(x: number, y: number): void {
    this.water.add(this.ref(x, y));
  }
}

/** The game's default terrain colours. `render-settings.json:19`. */
export const DEFAULT_TERRAIN: TerrainColours = {
  oceanColor: "#4785b5",
  sandColor: "#CCCB9E",
  plainsColor: "#BEDC8A",
  highlandColor: "#DCCB9E",
  mountainColor: "#e6e6e6",
};

/**
 * The map renderer the game leaves on `window.__webglView`.
 *
 * `updatePalette` copies what it is given, so this copies too. The package
 * reuses one array for every call, and a stored reference would make every
 * recorded palette read as the last one.
 */
export class FakeMapRenderer implements MapRenderer {
  readonly palettes: Float32Array[] = [];
  /** The live settings object, edited in place as the game's own is. */
  readonly settings: RenderSettings = { terrain: { ...DEFAULT_TERRAIN } };
  /** The terrain colours at each bake, oldest first. */
  readonly bakes: TerrainColours[] = [];
  /** The GPU renderer, with the game's alternate view off. */
  readonly renderer = { altView: false };

  updatePalette(palette: Float32Array): void {
    this.palettes.push(palette.slice());
  }

  getSettings(): RenderSettings {
    return this.settings;
  }

  rebuildTerrain(): void {
    if (this.settings.terrain) this.bakes.push({ ...this.settings.terrain });
  }

  get last(): Float32Array | undefined {
    return this.palettes.at(-1);
  }
}

/** The camera, with a straight scale and no offset. */
export class FakeTransformHandler implements TransformHandler {
  scale = 2;
  offsetX = 0;
  offsetY = 0;
  /** Every player the camera was sent to, oldest first. */
  readonly visited: PlayerView[] = [];

  onGoToPlayer(event: { player: PlayerView }): void {
    this.visited.push(event.player);
  }

  screenToWorldCoordinates(
    screenX: number,
    screenY: number,
  ): { x: number; y: number } {
    return {
      x: Math.floor(screenX / this.scale + this.offsetX),
      y: Math.floor(screenY / this.scale + this.offsetY),
    };
  }

  worldToScreenCoordinates(cell: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    return {
      x: (cell.x - this.offsetX) * this.scale,
      y: (cell.y - this.offsetY) * this.scale,
    };
  }
}

/** The `<control-panel>` element, with the game's own `tick` on the prototype. */
export class FakeControlPanel extends HTMLElement {
  game?: GameView;
  readonly eventBus = new FakeEventBus();
  /** Counts calls to the game's own tick, to prove it still runs. */
  ownTicks = 0;

  tick(): void {
    this.ownTicks++;
  }

  asControlPanel(): ControlPanel {
    return this as unknown as ControlPanel;
  }
}

/**
 * The `<build-menu>` element, which carries the camera.
 *
 * A plain element rather than a custom one: the package reads one property off
 * it and never touches its markup.
 */
export function createFakeBuildMenu(
  camera: TransformHandler = new FakeTransformHandler(),
): BuildMenu {
  const menu = document.createElement("build-menu") as BuildMenu;
  menu.transformHandler = camera;
  document.body.append(menu);
  return menu;
}

const TAG = "control-panel";

/** Adds a `<control-panel>` to the page. Registers the element on first use. */
export function createFakeControlPanel(): FakeControlPanel {
  if (!customElements.get(TAG)) customElements.define(TAG, FakeControlPanel);
  const panel = document.createElement(TAG) as FakeControlPanel;
  document.body.append(panel);
  return panel;
}

/**
 * The game's own markup for one troop bar, copied class for class.
 *
 * Read from `renderDesktopTroopBar` and `renderMobileTroopBar` in
 * `src/client/hud/layers/ControlPanel.ts` at OpenFrontIO commit 332e5410e. Four
 * things about it matter to the package, so the copy keeps all four:
 *
 * - The bar hides its overflow and is already positioned.
 * - The two fills sit together in one node, two levels below the bar.
 * - The troops fill comes first and the committed troops fill second.
 * - The troop numbers come after the fills, with no `z-index` anywhere.
 */
function buildTroopBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className =
    "w-full h-6 border border-gray-600 rounded-md bg-gray-900/60 overflow-hidden relative";

  const fills = document.createElement("div");
  fills.className = "relative h-full";
  for (const colour of ["bg-malibu-blue", "bg-aquarius"]) {
    const fill = document.createElement("div");
    fill.className = `absolute inset-y-0 left-0 w-full origin-left ${colour} transition-transform duration-200 ease-out`;
    fills.append(fill);
  }

  const numbers = document.createElement("div");
  numbers.className =
    "absolute inset-0 flex items-center text-lg font-bold leading-none pointer-events-none";

  bar.append(fills, numbers);
  return bar;
}

/**
 * Adds troop bars to the panel and returns them.
 *
 * The game keeps a wide bar and a narrow bar in the page at all times and hides
 * one of them with CSS, so the default is two. Each bar sits in a cell of the
 * HUD's own row, which the package never touches.
 */
export function addTroopBars(panel: HTMLElement, count = 2): HTMLElement[] {
  const bars: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const cell = document.createElement("div");
    cell.className = "troop-cell";
    const bar = buildTroopBar();
    cell.append(bar);
    panel.append(cell);
    bars.push(bar);
  }
  return bars;
}

/**
 * Draws a troop level on a bar the way the game draws it.
 *
 * `level` and `committed` are fractions of the maximum. The game clamps the two
 * fills so they never sum past a full bar, and writes both as an inline
 * transform, which is the only place the package reads them from.
 */
export function setTroopBarFill(
  bar: HTMLElement,
  level: number,
  committed = 0,
): void {
  const troops = bar.querySelector<HTMLElement>(".bg-malibu-blue")!;
  const committedTroops = bar.querySelector<HTMLElement>(".bg-aquarius")!;
  const green = Math.max(0, Math.min(100, level * 100));
  const orange = Math.max(0, Math.min(100 - green, committed * 100));
  troops.style.transform = `scaleX(${green / 100})`;
  committedTroops.style.transform = `translateX(${green}%) scaleX(${orange / 100})`;
}

/**
 * The game's own markup for the hotbar, copied class for class.
 *
 * Read from `render` and `renderUnitItem` in
 * `src/client/hud/layers/UnitDisplay.ts` at OpenFrontIO commit 332e5410e.
 * Three things about it matter to the package, so the copy keeps all three:
 *
 * - Each icon sits in an item of its own, and that item is already positioned.
 * - The item holds one box, and the box holds the icon two levels down.
 * - The icon names its own structure in its `alt`.
 */
const HOTBAR_ICONS = [
  "city",
  "factory",
  "port",
  "defense_post",
  "missile_silo",
  "sam_launcher",
  "warship",
  "atom_bomb",
  "hydrogen_bomb",
  "mirv",
] as const;

/** The `<unit-display>` element, with the prices the game hands it. */
export class FakeUnitDisplay extends HTMLElement {
  playerBuildables: BuildableUnit[] | null = null;

  asUnitDisplay(): UnitDisplay {
    return this as unknown as UnitDisplay;
  }

  /** Draws the row of ten icons, the way the game draws it. */
  fill(): void {
    const border = document.createElement("div");
    border.className = "border-t border-white/10 p-0.5 w-full";
    const row = document.createElement("div");
    row.className = "grid grid-rows-1 grid-flow-col gap-0.5 w-fit mx-auto";

    for (const icon of HOTBAR_ICONS) row.append(buildHotbarItem(icon));
    border.append(row);
    this.replaceChildren(border);
  }
}

function buildHotbarItem(structureKey: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "flex flex-col items-center relative";

  const box = document.createElement("div");
  box.className =
    "opacity-40 border border-slate-500 rounded-sm px-0.5 pb-0.5 flex items-center gap-0.5 cursor-pointer hover:bg-gray-800 rounded-sm text-white";

  const hotkey = document.createElement("div");
  hotkey.className = "ml-0.5 text-[10px] relative -top-1 text-gray-400";

  const icons = document.createElement("div");
  icons.className = "flex items-center gap-0.5 pt-0.5";
  const icon = document.createElement("img");
  icon.alt = structureKey;
  icon.className = "align-middle size-5";
  icons.append(icon);

  box.append(hotkey, icons);
  item.append(box);
  return item;
}

const HOTBAR_TAG = "unit-display";

/** Adds a drawn `<unit-display>` to the page. Registers it on first use. */
export function createFakeHotbar(): FakeUnitDisplay {
  if (!customElements.get(HOTBAR_TAG)) {
    customElements.define(HOTBAR_TAG, FakeUnitDisplay);
  }
  const hotbar = document.createElement(HOTBAR_TAG) as FakeUnitDisplay;
  document.body.append(hotbar);
  hotbar.fill();
  return hotbar;
}

/**
 * Writes the prices the game hands the hotbar.
 *
 * Keyed by the game's own `UnitType` values, such as "City". Every item the
 * game prices is listed, so a test that sets one price leaves the rest priced
 * past the cap rather than unpriced.
 */
export function setHotbarPrices(
  hotbar: FakeUnitDisplay,
  prices: Record<string, bigint>,
): void {
  hotbar.playerBuildables = Object.entries(prices).map(([type, cost]) => ({
    type,
    cost,
  }));
}

/** One call on a canvas, with the drawing state at the moment of the call. */
export interface CanvasCall {
  readonly op: string;
  readonly args: readonly unknown[];
  readonly globalAlpha: number;
  readonly fillStyle: unknown;
  readonly strokeStyle: unknown;
  readonly lineWidth: number;
  readonly font: string;
  readonly globalCompositeOperation: string;
  readonly imageSmoothingEnabled: boolean;
}

/**
 * A 2D canvas context that writes down what it is asked to draw.
 *
 * jsdom has no canvas, so `getContext` returns null there. This stands in for
 * it, and keeps the drawing state each call ran under, because a test needs to
 * know the colour and the opacity a shape was drawn with.
 */
export class FakeCanvasContext {
  readonly calls: CanvasCall[] = [];
  globalAlpha = 1;
  fillStyle: unknown = "#000";
  strokeStyle: unknown = "#000";
  lineWidth = 1;
  lineJoin = "miter";
  lineCap = "butt";
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  globalCompositeOperation = "source-over";
  imageSmoothingEnabled = true;

  private record(op: string, args: unknown[]): void {
    this.calls.push({
      op,
      args,
      globalAlpha: this.globalAlpha,
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      globalCompositeOperation: this.globalCompositeOperation,
      imageSmoothingEnabled: this.imageSmoothingEnabled,
    });
  }

  setTransform = (...args: unknown[]) => this.record("setTransform", args);
  clearRect = (...args: unknown[]) => this.record("clearRect", args);
  beginPath = (...args: unknown[]) => this.record("beginPath", args);
  arc = (...args: unknown[]) => this.record("arc", args);
  moveTo = (...args: unknown[]) => this.record("moveTo", args);
  lineTo = (...args: unknown[]) => this.record("lineTo", args);
  closePath = (...args: unknown[]) => this.record("closePath", args);
  stroke = (...args: unknown[]) => this.record("stroke", args);
  fill = (...args: unknown[]) => this.record("fill", args);
  fillText = (...args: unknown[]) => this.record("fillText", args);
  strokeText = (...args: unknown[]) => this.record("strokeText", args);
  save = (...args: unknown[]) => this.record("save", args);
  restore = (...args: unknown[]) => this.record("restore", args);
  translate = (...args: unknown[]) => this.record("translate", args);
  rotate = (...args: unknown[]) => this.record("rotate", args);
  fillRect = (...args: unknown[]) => this.record("fillRect", args);
  drawImage = (...args: unknown[]) => this.record("drawImage", args);
  putImageData = (...args: unknown[]) => this.record("putImageData", args);

  /** jsdom has no `ImageData`, so this hands back the same shape. */
  createImageData = (width: number, height: number) => {
    this.record("createImageData", [width, height]);
    return { width, height, data: new Uint8ClampedArray(width * height * 4) };
  };

  /** A pattern is opaque to the page, so a marked object stands in for it. */
  createPattern = (...args: unknown[]) => {
    this.record("createPattern", args);
    return { pattern: true };
  };

  /** Every call of one kind, oldest first. */
  of(op: string): CanvasCall[] {
    return this.calls.filter((call) => call.op === op);
  }
}

/**
 * Makes every canvas in the page hand back one shared fake context.
 *
 * Returns the context and a function that puts the real `getContext` back.
 */
export function installFakeCanvas(): {
  context: FakeCanvasContext;
  restore: () => void;
} {
  const context = new FakeCanvasContext();
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    return context;
  } as unknown as typeof original;
  return {
    context,
    restore: () => {
      HTMLCanvasElement.prototype.getContext = original;
    },
  };
}

/**
 * The static `<div>` that holds the game's top right buttons.
 *
 * Copied from `index.html:365` at OpenFrontIO commit 332e5410e. The game writes
 * it once and nothing re-renders it, and it holds the sidebar and the replay
 * panel. The alliance panel is added as its third child.
 */
export function createFakeSidebar(): HTMLElement {
  const host = document.createElement("div");
  host.className =
    "flex flex-col items-end fixed top-0 right-0 z-1000 gap-2";
  host.append(
    document.createElement("game-right-sidebar"),
    document.createElement("replay-panel"),
  );
  document.body.append(host);
  return host;
}
