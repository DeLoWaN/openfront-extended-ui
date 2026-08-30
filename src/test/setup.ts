import { beforeEach } from "vitest";

/**
 * A working `localStorage`, because the test runner does not always leave one.
 *
 * The package reads the game's own keybinds out of it, and so does the store
 * behind the package's own settings. A stand-in that throws on every call would
 * exercise only the guards.
 */
class MemoryStorage implements Storage {
  private entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, String(value));
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  clear(): void {
    this.entries.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

// jsdom keeps one document for a whole test file, so anything a test puts into
// the page is still there for the next one.
beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.body.removeAttribute("style");
  localStorage.clear();
});
