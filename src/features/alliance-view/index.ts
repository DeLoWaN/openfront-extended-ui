import type { GameView, PlayerView } from "../../game/types";
import type { Feature } from "../../runtime/feature";
import { logError, logInfo } from "../../runtime/log";
import { localStorageStore } from "../../runtime/settings";
import { formatClock, readWeb, type AllianceWeb } from "./alliance";
import { createClockLayer, type Clock } from "./clocks";
import { NOBODY, ownerUnderCursor } from "./cursor";
import { mapHooksReader, type MapHooks } from "./hooks";
import { GAME_KEYBINDS_KEY, readGameKeybinds } from "./keybinds";
import { createPalette, paintAlliance, paintReal } from "./palette";

/**
 * The alliance view mode. It greys the map and keeps one player and their
 * alliance partners in their own colours.
 *
 * The subject is the player the map is drawn around. The cursor picks it, and
 * it sticks: it changes only when the cursor reaches another player. So a
 * cursor that crosses open water leaves the subject as it was. Each press is a
 * fresh look, so the subject is forgotten when the key comes up.
 *
 * The subject and their direct alliance partners keep their real colours.
 * Everybody else greys, in one write to the renderer's colour table. Each ally
 * carries a clock under their own name. It says how long that alliance has
 * left, and turns red once the game offers to renew it. Nothing marks the
 * subject: where the package keeps a real player colour it adds information by
 * position and by text, and never changes that colour. See docs/adr/0008.
 *
 * This is the only feature that draws on the map rather than in the HUD, so it
 * is the only one that needs a loop on every drawn frame. See docs/adr/0005.
 *
 * The mode writes the colour table and nothing else. The renderer's own
 * settings are left alone, so there is nothing extra to put back.
 *
 * Two things leak while the mode is up, and both are accepted:
 *
 * - The names on the map lose their coloured outline. The game bakes that
 *   outline from the same colour table.
 * - A player who owns a cosmetic for their structures or warships keeps its
 *   colours. Those come from a second table the mode does not write, and a
 *   restore that missed it would leave a paid cosmetic broken for the match.
 */

const HOLD_KEY_OPTION = "hold-key";

/**
 * The key the mode is held on before a player picks another.
 *
 * The game binds nothing to it out of the box. Its keybinds are the player's to
 * change, so the mode checks on every press and never trusts this alone.
 */
const DEFAULT_HOLD_KEY = "Backquote";

/**
 * How often the mode writes its colours again, in drawn frames.
 *
 * About four seconds at sixty frames a second. Two rare events put the game's
 * own colours back under the mode: a theme change, and a player who spawns
 * while the mode is up. A held key rarely lasts even this long.
 */
const REASSERT_FRAMES = 240;

/** What the game writes on the page's body while one of its modals is open. */
const MODAL_OPEN_OVERFLOW = "hidden";

const NOTHING_COLOURED: ReadonlySet<number> = new Set();

export const allianceView: Feature = {
  id: "alliance-view",
  name: "Alliance view mode",
  options: [
    {
      key: HOLD_KEY_OPTION,
      name: "Hold key",
      whenUnset: DEFAULT_HOLD_KEY,
    },
  ],

  attach(context) {
    const readHooks = mapHooksReader();
    const gameKeybinds = localStorageStore(GAME_KEYBINDS_KEY);
    const palette = createPalette();
    const clocks = createClockLayer();

    /** True while the player holds the mode's own key. */
    let holding = false;
    /** True while the player holds the game's own alternate view key. */
    let alternateViewHeld = false;
    /** The player the map is drawn around. `NOBODY` before the cursor finds one. */
    let subjectID = NOBODY;
    /**
     * Where the cursor sits.
     *
     * A drag, a wheel zoom and the game's own camera all move the map under a
     * cursor that has not moved. None of the three sends a mouse event. So the
     * tile is read on every frame from this, not when the mouse last moved.
     */
    let cursorX = 0;
    let cursorY = 0;
    /** True while the mode's own colours are on the map. */
    let painted = false;
    /** Who the last write coloured, so an unchanged web writes nothing. */
    let writtenSignature = "";
    let framesSinceWrite = 0;
    let frame = 0;
    /** The key already reported as taken, so one press per key says so. */
    let reportedClash = "";

    /**
     * The mode paints only while the key is down and nothing else owns the map.
     *
     * Under the game's own alternate view the territory shader draws no owned
     * tile at all, so nothing written to the colour table reaches the screen.
     * Behind one of the game's own pop-up panels the game dims itself, and a
     * layer of ours over the top reads as a bug.
     */
    function engaged(): boolean {
      return holding && !alternateViewHeld && !modalOpen();
    }

    /**
     * Whether one of the game's modals is open.
     *
     * The first `<o-modal>` to open writes this, and the last to close clears
     * it, at `Modal.ts`. The two settings modals use their own markup and touch
     * nothing shared, so they are missed. That is accepted: they are opened
     * deliberately and nobody holds a key through one.
     */
    function modalOpen(): boolean {
      return document.body.style.overflow === MODAL_OPEN_OVERFLOW;
    }

    /** The key the mode is held on, as the player has it now. */
    function holdKey(): string {
      const chosen = context.optionText(HOLD_KEY_OPTION).trim();
      return chosen === "" ? DEFAULT_HOLD_KEY : chosen;
    }

    /**
     * Draws the mode, or puts the game's own colours back.
     *
     * `rewrite` forces the colour table to be written again even when the same
     * players are coloured, which is how a theme change and a late spawn are
     * repaired.
     */
    function update(rewrite = false): void {
      const hooks = readHooks();
      if (!hooks) return;

      if (!engaged()) {
        standDown(hooks);
        return;
      }

      const found = ownerUnderCursor(
        context.game,
        hooks.camera,
        cursorX,
        cursorY,
      );
      // The subject sticks. Water and unclaimed ground leave it as it was.
      if (found !== NOBODY) subjectID = found;

      const web = subjectID === NOBODY ? null : readWeb(context.game, subjectID);
      const coloured = web?.coloured ?? NOTHING_COLOURED;
      const signature = signatureOf(coloured);
      if (rewrite || !painted || signature !== writtenSignature) {
        paintAlliance(palette, playersOf(context.game), coloured);
        hooks.view.updatePalette(palette);
        painted = true;
        writtenSignature = signature;
        framesSinceWrite = 0;
      }
      clocks.place(clocksOf(web), hooks.camera);
    }

    /** Puts the game's own colours back and takes the clocks off the screen. */
    function standDown(hooks: MapHooks): void {
      clocks.hide();
      if (!painted) return;
      // Read from the game's own accessors on every call, so a player who
      // spawned while the mode was up gets their own colour rather than grey.
      paintReal(palette, playersOf(context.game));
      hooks.view.updatePalette(palette);
      painted = false;
      writtenSignature = "";
    }

    /** Runs on every drawn frame, because the camera moves without telling us. */
    function step(): void {
      frame = requestAnimationFrame(step);
      try {
        update(++framesSinceWrite >= REASSERT_FRAMES);
      } catch (error) {
        // A loop that throws on every frame would fill the console and leave
        // the map grey, so it gives up and puts the colours back instead.
        logError("the alliance view mode failed on a frame", error);
        release();
      }
    }

    function startLoop(): void {
      if (frame !== 0) return;
      frame = requestAnimationFrame(step);
    }

    function stopLoop(): void {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    }

    /** Ends the hold and forgets the subject, so the next press is fresh. */
    function release(): void {
      holding = false;
      alternateViewHeld = false;
      subjectID = NOBODY;
      stopLoop();
      try {
        update();
      } catch (error) {
        // Nothing else can put the colours back, so the map stays grey until
        // the next press or the end of the match.
        logError("the alliance view mode could not restore the map", error);
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.repeat) return;
      const keybinds = readGameKeybinds(gameKeybinds);

      if (event.code === keybinds.alternateViewKey()) {
        alternateViewHeld = true;
        update();
        return;
      }

      const key = holdKey();
      if (event.code !== key) return;
      // This is the rule the game uses itself. Without it the mode fires while
      // the player types in the game's chat.
      if (typingSomewhere()) return;
      if (keybinds.isBound(key)) {
        reportClash(key);
        return;
      }

      holding = true;
      startLoop();
      update();
    }

    function onKeyUp(event: KeyboardEvent): void {
      const keybinds = readGameKeybinds(gameKeybinds);
      if (event.code === keybinds.alternateViewKey()) {
        alternateViewHeld = false;
        update();
        return;
      }
      if (event.code !== holdKey()) return;
      release();
    }

    // A key held while the window loses focus never reports its release, and
    // the map would stay grey for the rest of the match.
    function onBlur(): void {
      if (!holding && !alternateViewHeld) return;
      release();
    }

    function onMouseMove(event: MouseEvent): void {
      cursorX = event.clientX;
      cursorY = event.clientY;
    }

    /**
     * Says once that the game has taken the mode's key.
     *
     * The mode must not steal a key the player configured. Silence here would
     * leave the player on a key that does nothing, with no reason given.
     */
    function reportClash(key: string): void {
      if (reportedClash === key) return;
      reportedClash = key;
      logInfo(
        `the game binds ${key}, so the alliance view mode stays off. Pick another key with openfrontExtendedUi.setOption("alliance-view", "${HOLD_KEY_OPTION}", "KeyJ").`,
      );
    }

    // The capture phase, so a key the game stops before it bubbles still
    // reaches the mode. `blur` never bubbles, so it needs nothing.
    const capture = { capture: true };
    context.onWindowEvent("keydown", onKeyDown, capture);
    context.onWindowEvent("keyup", onKeyUp, capture);
    context.onWindowEvent("mousemove", onMouseMove, capture);
    context.onWindowEvent("blur", onBlur);

    context.onDetach(() => {
      stopLoop();
      // The match may have ended, but the map is still on the screen. Never
      // leave a player's map grey.
      const hooks = readHooks();
      if (hooks) standDown(hooks);
      clocks.remove();
    });
  },
};

/**
 * The set of coloured players, as one value two writes can be compared by.
 *
 * The mode writes the colour table only when this changes, so a subject held
 * still costs one write however long the key is down.
 */
function signatureOf(coloured: ReadonlySet<number>): string {
  return [...coloured].sort((a, b) => a - b).join(",");
}

/** One clock per ally the game has both placed and reported an alliance for. */
function clocksOf(web: AllianceWeb | null): Clock[] {
  if (!web) return [];
  const clocks: Clock[] = [];
  for (const ally of web.allies) {
    if (ally.remainingTicks === null) continue;
    const anchor = nameAnchor(ally.player);
    if (!anchor) continue;
    clocks.push({
      anchor,
      text: formatClock(ally.remainingTicks),
      urgent: ally.urgent,
    });
  }
  return clocks;
}

/** Where the game draws one player's name, or nothing if it has not yet. */
function nameAnchor(player: PlayerView): ReturnType<PlayerView["nameLocation"]> {
  try {
    return player.nameLocation();
  } catch {
    return undefined;
  }
}

/**
 * Every player of the match, or none when the match cannot answer.
 *
 * A match torn down under us leaves nothing to colour, which is the same as an
 * empty roster: the colour table keeps whatever it already holds.
 */
function playersOf(game: GameView): readonly PlayerView[] {
  try {
    return game.players();
  } catch (error) {
    logError("could not read the players, so the map keeps its colours", error);
    return [];
  }
}

/** The rule the game uses itself, so a key typed into chat stays in chat. */
function typingSomewhere(): boolean {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement)) return false;
  return (
    focused.tagName === "INPUT" ||
    focused.tagName === "TEXTAREA" ||
    focused.isContentEditable
  );
}
