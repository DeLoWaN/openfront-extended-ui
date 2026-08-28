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
  ControlPanel,
  EventBus,
  GameEventHandler,
  GameEventType,
  GameView,
  PlayerView,
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

export class FakePlayerView implements PlayerView {
  alive = true;
  isAlive(): boolean {
    return this.alive;
  }
}

export class FakeGameView implements GameView {
  player: FakePlayerView | null = new FakePlayerView();
  spawnPhase = false;
  tickCount = 1;

  myPlayer(): PlayerView | null {
    return this.player;
  }
  inSpawnPhase(): boolean {
    return this.spawnPhase;
  }
  ticks(): number {
    return this.tickCount;
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

const TAG = "control-panel";

/** Adds a `<control-panel>` to the page. Registers the element on first use. */
export function createFakeControlPanel(): FakeControlPanel {
  if (!customElements.get(TAG)) customElements.define(TAG, FakeControlPanel);
  const panel = document.createElement(TAG) as FakeControlPanel;
  document.body.append(panel);
  return panel;
}

/**
 * The game's own markup around the troop bar.
 *
 * The bar is the grandparent of the blue fill and hides its overflow. The cell
 * above the bar is the node the package draws into. The game keeps a desktop
 * copy and a mobile copy in the page at all times and hides one of them.
 */
export function addTroopBars(panel: HTMLElement, count = 2): HTMLElement[] {
  const cells: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const cell = document.createElement("div");
    cell.className = "troop-cell";
    const bar = document.createElement("div");
    bar.className = "overflow-hidden";
    const track = document.createElement("div");
    const fill = document.createElement("div");
    fill.className = "bg-malibu-blue";
    track.append(fill);
    bar.append(track);
    cell.append(bar);
    panel.append(cell);
    cells.push(cell);
  }
  return cells;
}
