// ==UserScript==
// @name         PROTOTYPE — OpenFront alliance view (issue #14)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Greys the map and colours a hovered player's allies, with every knob the ticket asks about.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #14, then dies. Do not import, do not extend.
//
// The question: is the alliance view mode worth the work, and what does it feel like?
//
// Issue #12 settled the mechanism, and this script does not reopen it. Grey every
// player's palette slot, write a colour into the slots of the player under the
// cursor and everyone in their allies() list, then call view.updatePalette() once.
//
// This script puts every open question on screen at the same time, so one match
// answers all of them. A bar at the top switches:
//
//   trigger   hover / click / hold    does the subject follow the cursor or stick?
//   scheme    one / two / own / web   is one colour for every ally enough?
//   grey      slider                  how dark does the rest of the map go?
//   alpha     slider                  territoryAlpha, 0.588 default toward 1
//   names     on / off                the names lose their colour; does that help?
//
// The ticket says two things that the code contradicts. Both are worth a look on
// screen rather than a read here:
//
//   1. The ticket says the player names go grey. What goes grey is the name
//      OUTLINE. name.outlineUsePlayerColor is true and name.fillUsePlayerColor
//      is false, so the letters keep their own fill and lose their coloured edge.
//      Judge the real thing, not the description.
//   2. The names can go off outright. settings.passEnabled.name is read on
//      every draw, so the `names` button hides them live. That is a third answer
//      to "does it help or hurt" that the ticket did not have.
//
// Persistence: state lives in localStorage, not memory. A reload drops you out of
// the match, so an in-memory choice would die every time you wanted to compare.
// The issue #5 prototype settled this the same way.
//
// window.__ofxProto14.destroy() puts the map back and removes everything.

(() => {
  "use strict";

  // --------------------------------------------------------------- game constants

  // src/client/render/gl/utils/ColorUtils.ts:14
  const PALETTE_SIZE = 4096;
  // src/client/render/gl/utils/TileCodec.ts:9
  const OWNER_MASK = 0xfff;
  // src/client/render/gl/render-settings.json:81
  const DEFAULT_TERRITORY_ALPHA = 0.588;
  // The game writes this into every fill slot. The territory shader ignores it and
  // uses uTerritoryAlpha, but the SAM radius pass reads the palette directly.
  const FILL_ALPHA = 150 / 255;

  // The game divides by a fixed ten to turn ticks into seconds, at
  // PlayerPanel.ts:150 and PlayerInfoOverlay.ts:233. Singleplayer scales the real
  // rate with its speed setting, so both the game's countdown and this one run
  // wrong under fast forward. Copy the game rather than correct it: two clocks that
  // disagree read as a bug, and this one exists to match what the game shows.
  const TICKS_PER_SECOND = 10;

  const STORE_KEY = "ofx-proto-issue14";
  const HOLD_CODE = "Backquote";
  // The re-assert only repairs a palette the game overwrote. Both causes are rare,
  // so a slow beat is enough and it keeps the upload counter honest.
  const REASSERT_MS = 4000;
  // A fade has to redraw as the clock runs, so it needs a faster beat than repair.
  const FADE_MS = 2000;
  // The countdown text costs nothing to redraw, so it runs at one second.
  const CLOCK_MS = 1000;
  // A long ally list must not stretch the bar off screen.
  const MAX_NAMES_SHOWN = 8;

  // --------------------------------------------------------------- colours

  const SUBJECT = [1.0, 1.0, 1.0];
  const ALLY = [0.498, 0.467, 0.867]; // #7f77dd, the package's signature violet
  const ALLY_OF_ALLY = [0.29, 0.271, 0.522];
  // Where the fade lands when an alliance is nearly over. It keeps the violet hue,
  // because the grey has none. An ally about to lapse must still read as an ally,
  // so the fade stops here instead of going all the way to the grey.
  const ALLY_EXPIRING = [0.25, 0.22, 0.42];

  const TRIGGERS = ["hover", "click", "hold"];
  const TRIGGER_NAMES = {
    hover: "Hover — follows the cursor",
    click: "Click — middle click or ` to lock",
    hold: "Hold — active while ` is down",
  };

  const SCHEMES = ["one", "two", "own", "web"];
  const SCHEME_NAMES = {
    one: "One colour for the whole web",
    two: "Subject white, allies violet",
    own: "Subject and allies keep their own colours",
    web: "Allies violet, allies-of-allies dim",
  };

  const EXPIRIES = ["fade", "off"];
  const EXPIRY_NAMES = {
    fade: "Ally brightness carries the time left",
    off: "Flat ally colour, time only in the readout",
  };

  if (window.__ofxProto14) {
    window.__ofxProto14.destroy();
  }

  // --------------------------------------------------------------- stored state

  const DEFAULTS = {
    on: true,
    trigger: "hover",
    scheme: "two",
    expiry: "fade",
    grey: 0.22,
    alpha: DEFAULT_TERRITORY_ALPHA,
    names: true,
  };

  const state = loadState();

  // A stored value of the wrong type reaches toFixed() and kills every repaint, and
  // a reload does not clear it. Check each field against its default instead.
  function loadState() {
    const stored = readStore();
    const s = Object.assign({}, DEFAULTS);
    if (typeof stored.on === "boolean") s.on = stored.on;
    if (typeof stored.names === "boolean") s.names = stored.names;
    if (TRIGGERS.includes(stored.trigger)) s.trigger = stored.trigger;
    if (SCHEMES.includes(stored.scheme)) s.scheme = stored.scheme;
    if (EXPIRIES.includes(stored.expiry)) s.expiry = stored.expiry;
    if (Number.isFinite(stored.grey)) s.grey = clamp(stored.grey, 0.05, 0.6);
    if (Number.isFinite(stored.alpha)) s.alpha = clamp(stored.alpha, 0.3, 1);
    return s;
  }

  function readStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch {
      return {};
    }
  }

  function writeStore() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* a full quota is not worth failure of the prototype */
    }
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  // --------------------------------------------------------------- the game hooks

  // Two hooks, both settled by issue #12. `view` is the map renderer and is a real
  // global with no development-only guard. `game` is a new object every match.
  //
  // This caches the elements, because it runs on every mousemove. Both elements are
  // static markup that lives for the whole page, so the cache misses only before the
  // first match. `.game` and `.transformHandler` are read fresh, because the game
  // replaces `.game` on every new match.
  let cachedPanel = null;
  let cachedBuildMenu = null;

  function hooks() {
    const view = window.__webglView;
    if (!view) return null;
    if (!cachedPanel || !cachedPanel.isConnected) {
      cachedPanel = document.querySelector("control-panel");
    }
    if (!cachedBuildMenu || !cachedBuildMenu.isConnected) {
      cachedBuildMenu = document.querySelector("build-menu");
    }
    if (!cachedPanel || !cachedBuildMenu) return null;
    const game = cachedPanel.game;
    const transform = cachedBuildMenu.transformHandler;
    if (!game || !transform) return null;
    return { view, game, transform };
  }

  // playerBySmallID throws for an id it does not know, and 0 is TerraNullius.
  function playerOrNull(game, smallID) {
    if (!smallID) return null;
    try {
      const p = game.playerBySmallID(smallID);
      return p && p.isPlayer && p.isPlayer() ? p : null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------- the palette

  // One buffer, reused. updatePalette copies what it is given, so the same array
  // serves every upload. A fresh 128 KB array per hover would churn the collector
  // during the exact judgement this prototype exists to make.
  const scratch = new Float32Array(PALETTE_SIZE * 2 * 4);

  function writeSlot(arr, smallID, fill, border) {
    const f = smallID * 4;
    arr[f] = fill[0];
    arr[f + 1] = fill[1];
    arr[f + 2] = fill[2];
    arr[f + 3] = FILL_ALPHA;

    const b = PALETTE_SIZE * 4 + smallID * 4;
    arr[b] = border[0];
    arr[b + 1] = border[1];
    arr[b + 2] = border[2];
    arr[b + 3] = 1.0;
  }

  function lighten(c, amount) {
    return [
      c[0] + (1 - c[0]) * amount,
      c[1] + (1 - c[1]) * amount,
      c[2] + (1 - c[2]) * amount,
    ];
  }

  function darken(c, amount) {
    return [c[0] * amount, c[1] * amount, c[2] * amount];
  }

  // t of 0 gives a, t of 1 gives b.
  function mix(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
  }

  function toUnit(colord) {
    const rgb = colord.toRgb();
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  }

  // This rebuilds the game's own palette from the two accessors the game uses
  // itself. It is the restore path, and it is current on every call, so a player who
  // spawned while the mode was on gets the real colour back.
  function realPalette(game) {
    scratch.fill(0);
    for (const p of game.players()) {
      writeSlot(
        scratch,
        p.smallID(),
        toUnit(p.territoryColor()),
        toUnit(p.borderColor()),
      );
    }
    return scratch;
  }

  // allies() resolves every id through playerBySmallID, which throws for an id it
  // does not know. One unknown ally must not take the whole repaint down.
  function alliesOf(player) {
    try {
      return player.allies().filter((p) => p && p.smallID);
    } catch {
      return [];
    }
  }

  // Every alliance ends. alliances() carries the tick each one expires at, and the
  // game builds it for every player rather than only the local one, so a hovered
  // stranger's clocks are readable too.
  //
  // The game shows this figure only for an alliance you are in, at
  // PlayerInfoOverlay.ts:394. Reading it for somebody else is the same move the
  // colouring already makes: the reference point shifts from you to whoever you
  // point at, and nothing is shown that the game does not draw for one player.
  function expiryBySmallID(game, subject, allies) {
    const out = new Map();
    let views = [];
    try {
      views = subject.alliances() ?? [];
    } catch {
      return out;
    }
    // AllianceView.other is a PlayerID string, so the allies are keyed by that.
    const byPlayerID = new Map();
    for (const a of allies) {
      try {
        byPlayerID.set(a.id(), a.smallID());
      } catch {
        /* a player the view cannot resolve simply gets no clock */
      }
    }

    const now = game.ticks();
    const duration = Math.max(1, game.config().allianceDuration());
    for (const v of views) {
      const smallID = byPlayerID.get(v.other);
      if (smallID === undefined) continue;
      const remaining = Math.max(0, v.expiresAt - now);
      out.set(smallID, {
        remainingTicks: remaining,
        // The same ratio the game's own on-map alliance icon uses, at
        // PlayerStatus.ts:168.
        fraction: Math.max(0, Math.min(1, remaining / duration)),
      });
    }
    return out;
  }

  // This finds the hovered player, the players allied with them, and the players
  // allied with those. Only the `web` scheme draws the third ring.
  function alliance(game, subjectID) {
    const subject = playerOrNull(game, subjectID);
    if (!subject) return null;

    const direct = alliesOf(subject);
    const directIDs = new Set(direct.map((p) => p.smallID()));
    directIDs.delete(subjectID);

    const secondIDs = new Set();
    for (const ally of direct) {
      for (const far of alliesOf(ally)) {
        const id = far.smallID();
        if (id === subjectID || directIDs.has(id)) continue;
        secondIDs.add(id);
      }
    }
    const expiry = expiryBySmallID(game, subject, direct);
    return { subject, direct, directIDs, secondIDs, expiry };
  }

  function alliancePalette(game, subjectID) {
    scratch.fill(0);
    const grey = [state.grey, state.grey, state.grey];
    const greyBorder = lighten(grey, 0.35);

    const real = state.scheme === "own" ? new Map() : null;
    for (const p of game.players()) {
      writeSlot(scratch, p.smallID(), grey, greyBorder);
      if (real) real.set(p.smallID(), p);
    }

    const web = alliance(game, subjectID);
    if (!web) return { arr: scratch, web: null };

    const colour = (smallID, fill) => {
      writeSlot(scratch, smallID, fill, lighten(fill, 0.4));
    };

    // A full alliance draws at `full`. One about to lapse draws at `spent`. Only the
    // direct ring fades: the second ring is already dim, and the subject is not in
    // an alliance with itself.
    const fadeFor = (smallID, full, spent) => {
      if (state.expiry !== "fade") return full;
      const clock = web.expiry.get(smallID);
      if (!clock) return full;
      return mix(spent, full, clock.fraction);
    };

    const ally = (id) => colour(id, fadeFor(id, ALLY, ALLY_EXPIRING));

    if (state.scheme === "one") {
      colour(subjectID, ALLY);
      for (const id of web.directIDs) ally(id);
    } else if (state.scheme === "two") {
      colour(subjectID, SUBJECT);
      for (const id of web.directIDs) ally(id);
    } else if (state.scheme === "own") {
      const keepOwn = (id, fade) => {
        const p = real.get(id);
        if (!p) return;
        const own = toUnit(p.territoryColor());
        const fill = fade ? fadeFor(id, own, darken(own, 0.45)) : own;
        writeSlot(scratch, id, fill, toUnit(p.borderColor()));
      };
      keepOwn(subjectID, false);
      for (const id of web.directIDs) keepOwn(id, true);
    } else {
      colour(subjectID, SUBJECT);
      for (const id of web.directIDs) ally(id);
      for (const id of web.secondIDs) colour(id, ALLY_OF_ALLY);
    }

    return { arr: scratch, web };
  }

  // --------------------------------------------------------------- the mode

  const mode = {
    // The player the map is drawn around. 0 means nobody, so the map stays normal.
    subjectID: 0,
    // In `click` trigger, this holds the locked player. It survives when the cursor
    // moves away.
    lockedID: 0,
    // In `hold` trigger, this is true while the key is down.
    holding: false,
    // Whatever the cursor sits over, whether or not it is the subject.
    hoveredID: 0,
    // Where the cursor sits. A wheel zoom changes the tile under it without a
    // mousemove, so the position has to outlive the event that reported it.
    cursorX: 0,
    cursorY: 0,
    // True while the mode paints. The timer re-asserts only then.
    active: false,
    // The web from the last paint. The clock re-renders its text every second
    // without a palette upload.
    lastWeb: null,
    game: null,
    settings: null,
    savedAlpha: DEFAULT_TERRITORY_ALPHA,
    savedNames: true,
    // Uploads the user caused, and uploads the keep-alive caused. They are counted
    // apart, because the first is the cost of the feature and the second is not.
    uploads: 0,
    keepAlives: 0,
  };

  // The settings object is live and shared, so a write to it lands on the next
  // frame. Save what we found, so destroy() can put it back.
  function captureSettings(view) {
    if (mode.settings) return;
    const s = view.getSettings();
    if (!s || !s.mapOverlay || !s.passEnabled) return;
    mode.settings = s;
    mode.savedAlpha = s.mapOverlay.territoryAlpha;
    mode.savedNames = s.passEnabled.name;
  }

  function applySettings() {
    if (!mode.settings) return;
    mode.settings.mapOverlay.territoryAlpha = state.on
      ? state.alpha
      : mode.savedAlpha;
    mode.settings.passEnabled.name = state.on ? state.names : mode.savedNames;
  }

  function restoreSettings() {
    if (!mode.settings) return;
    mode.settings.mapOverlay.territoryAlpha = mode.savedAlpha;
    mode.settings.passEnabled.name = mode.savedNames;
  }

  // This makes the one call that does the work. Every function above builds its
  // argument. `keepAlive` marks a repaint the timer asked for, not the user.
  function paint(force, keepAlive) {
    const h = hooks();
    if (!h) return;

    if (mode.game !== h.game) {
      // A new match. Every smallID means somebody else now.
      mode.game = h.game;
      mode.subjectID = 0;
      mode.lockedID = 0;
      mode.active = false;
      mode.settings = null;
    }
    captureSettings(h.view);

    const wanted = wantedSubject();
    if (wanted === mode.subjectID && !force) return;
    mode.subjectID = wanted;

    applySettings();

    if (keepAlive) mode.keepAlives++;
    else mode.uploads++;

    if (!state.on || wanted === 0) {
      h.view.updatePalette(realPalette(h.game));
      mode.active = false;
      mode.lastWeb = null;
      bar.render(null);
      return;
    }

    const { arr, web } = alliancePalette(h.game, wanted);
    h.view.updatePalette(arr);
    mode.active = true;
    mode.lastWeb = web;
    bar.render(web);
  }

  function wantedSubject() {
    if (!state.on) return 0;
    if (state.trigger === "click") return mode.lockedID;
    if (state.trigger === "hold") return mode.holding ? mode.hoveredID : 0;
    return mode.hoveredID;
  }

  // --------------------------------------------------------------- the cursor

  // This uses the same chain as HoverHighlightController. Water reads as nobody, so
  // the map clears when the cursor leaves the land.
  function ownerUnderCursor(clientX, clientY) {
    const h = hooks();
    if (!h) return 0;
    const cell = h.transform.screenToWorldCoordinates(clientX, clientY);
    if (!h.game.isValidCoord(cell.x, cell.y)) return 0;
    const ref = h.game.ref(cell.x, cell.y);
    if (!h.game.isLand(ref)) return 0;
    return h.game.tileState(ref) & OWNER_MASK;
  }

  // contains() throws on anything that is not a Node, and a synthetic event
  // dispatched on window has window as its target.
  function overTheBar(target) {
    return !!bar.root && target instanceof Node && bar.root.contains(target);
  }

  function onMouseMove(e) {
    if (overTheBar(e.target)) return;
    mode.cursorX = e.clientX;
    mode.cursorY = e.clientY;
    mode.hoveredID = ownerUnderCursor(e.clientX, e.clientY);
    paint(false);
  }

  // A wheel zoom moves the map under a still cursor, so a different player is now
  // under it and no mousemove says so. Without this the map keeps the old subject,
  // and the next click in `click` trigger locks the wrong player.
  //
  // This listens in the capture phase, which runs before the game's own handler, so
  // the new scale is not readable yet. A timer of 0 ms reads it on the next turn of
  // the event loop. A timer rather than a frame, because a background tab pauses
  // frames but still has to be correct when it comes back.
  let wheelTimer = 0;

  function onWheel() {
    if (wheelTimer) return;
    wheelTimer = setTimeout(() => {
      wheelTimer = 0;
      mode.hoveredID = ownerUnderCursor(mode.cursorX, mode.cursorY);
      paint(false);
    }, 0);
  }

  // This uses the middle click, because left click attacks and right click opens the
  // game's own player panel. A tap of the hold key does the same, for a trackpad.
  function onMouseDown(e) {
    if (state.trigger !== "click" || e.button !== 1) return;
    // Without this the browser starts its autoscroll mode.
    e.preventDefault();
    // The cursor may have moved or the map may have zoomed since the last read.
    mode.cursorX = e.clientX;
    mode.cursorY = e.clientY;
    mode.hoveredID = ownerUnderCursor(e.clientX, e.clientY);
    toggleLock();
  }

  function toggleLock() {
    const under = mode.hoveredID;
    mode.lockedID = mode.lockedID === under ? 0 : under;
    paint(false);
  }

  // The game has a chat box. A backquote typed into it must not flip the map.
  function typingSomewhere() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
  }

  function onKeyDown(e) {
    if (e.code !== HOLD_CODE || e.repeat || typingSomewhere()) return;
    if (state.trigger === "hold") {
      mode.holding = true;
      paint(false);
    } else if (state.trigger === "click") {
      toggleLock();
    }
  }

  function onKeyUp(e) {
    if (e.code !== HOLD_CODE || state.trigger !== "hold") return;
    mode.holding = false;
    paint(false);
  }

  // --------------------------------------------------------------- the control bar

  const bar = {
    root: null,
    readout: null,
    buttons: {},

    build() {
      const root = document.createElement("div");
      root.style.cssText = css(
        "position:fixed",
        "top:8px",
        "left:50%",
        "transform:translateX(-50%)",
        "max-width:96vw",
        "box-sizing:border-box",
        "z-index:2147483647",
        "display:flex",
        "align-items:center",
        "gap:8px",
        "padding:6px 10px",
        "background:rgba(12,12,16,.92)",
        "border:1px solid #7f77dd",
        "border-radius:6px",
        "font:12px/1.4 ui-monospace,Menlo,Consolas,monospace",
        "color:#e8e8f0",
        "user-select:none",
      );

      root.appendChild(
        this.button("on", () => {
          state.on = !state.on;
          commit(true);
        }),
      );
      root.appendChild(
        this.button("trigger", () => {
          state.trigger = next(TRIGGERS, state.trigger);
          mode.lockedID = 0;
          mode.holding = false;
          commit(true);
        }),
      );
      root.appendChild(
        this.button("scheme", () => {
          state.scheme = next(SCHEMES, state.scheme);
          commit(true);
        }),
      );
      root.appendChild(
        this.button("expiry", () => {
          state.expiry = next(EXPIRIES, state.expiry);
          commit(true);
        }),
      );
      root.appendChild(
        this.button("names", () => {
          state.names = !state.names;
          commit(true);
        }),
      );
      root.appendChild(
        this.slider("grey", 0.05, 0.6, (v) => {
          state.grey = v;
          commit(true);
        }),
      );
      root.appendChild(
        this.slider("alpha", 0.3, 1, (v) => {
          state.alpha = v;
          commit(true);
        }),
      );

      const readout = document.createElement("div");
      readout.style.cssText = css(
        "flex:1 1 auto",
        "min-width:240px",
        "padding-left:8px",
        "border-left:1px solid #444",
        // pre-wrap keeps the newlines and still wraps a long ally list, so the bar
        // cannot grow past the window and carry its own buttons off screen.
        "white-space:pre-wrap",
        "overflow-wrap:anywhere",
      );
      root.appendChild(readout);

      this.root = root;
      this.readout = readout;
      document.body.appendChild(root);
    },

    button(name, onClick) {
      const el = document.createElement("button");
      el.type = "button";
      el.style.cssText = css(
        "cursor:pointer",
        "flex:0 0 auto",
        "padding:4px 8px",
        "background:#1c1c26",
        "color:#e8e8f0",
        "border:1px solid #555",
        "border-radius:4px",
        "font:inherit",
      );
      el.addEventListener("click", onClick);
      this.buttons[name] = el;
      return el;
    },

    slider(name, min, max, onInput) {
      const wrap = document.createElement("label");
      wrap.style.cssText = css(
        "display:flex",
        "flex:0 0 auto",
        "align-items:center",
        "gap:4px",
      );
      const label = document.createElement("span");
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = "0.01";
      input.value = String(state[name]);
      input.style.cssText = css("width:70px");
      input.addEventListener("input", () => onInput(Number(input.value)));
      wrap.appendChild(label);
      wrap.appendChild(input);
      this.buttons[name] = label;
      return wrap;
    },

    // Every repaint calls this. It shows the whole state, so a reader can compare
    // the map against the game without the console.
    render(web) {
      if (!this.root) return;
      this.buttons.on.textContent = state.on ? "ON" : "off";
      this.buttons.on.style.borderColor = state.on ? "#7f77dd" : "#555";
      this.buttons.trigger.textContent = state.trigger;
      this.buttons.trigger.title = TRIGGER_NAMES[state.trigger];
      this.buttons.scheme.textContent = state.scheme;
      this.buttons.scheme.title = SCHEME_NAMES[state.scheme];
      this.buttons.expiry.textContent =
        state.expiry === "fade" ? "fade" : "no fade";
      this.buttons.expiry.title = EXPIRY_NAMES[state.expiry];
      this.buttons.names.textContent = state.names ? "names" : "no names";
      this.buttons.grey.textContent = "grey " + state.grey.toFixed(2);
      this.buttons.alpha.textContent = "alpha " + state.alpha.toFixed(2);

      this.readout.textContent = describe(web);
    },
  };

  // The game divides ticks by a fixed ten, so this does too. See TICKS_PER_SECOND.
  function mmss(remainingTicks) {
    const total = Math.max(0, Math.floor(remainingTicks / TICKS_PER_SECOND));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function counts() {
    return mode.uploads + " uploads, " + mode.keepAlives + " keep-alive";
  }

  function describe(web) {
    if (!state.on) return "off — the game's own colours";
    if (!web) {
      const hint =
        state.trigger === "hold"
          ? "hold ` over a player"
          : state.trigger === "click"
            ? "middle click or ` over a player"
            : "point at a player";
      return hint + "\n" + counts();
    }
    // Soonest to lapse first. Which alliance breaks next is the useful order, and
    // alphabetical order buries it.
    const all = web.direct
      .map((p) => {
        const clock = web.expiry.get(p.smallID());
        return {
          name: p.displayName(),
          ticks: clock ? clock.remainingTicks : Infinity,
          label: clock ? " " + mmss(clock.remainingTicks) : " —",
        };
      })
      .sort((a, b) => a.ticks - b.ticks || a.name.localeCompare(b.name));
    const shown = all
      .slice(0, MAX_NAMES_SHOWN)
      .map((a) => a.name + a.label)
      .join(", ");
    const rest =
      all.length > MAX_NAMES_SHOWN
        ? " and " + (all.length - MAX_NAMES_SHOWN) + " more"
        : "";
    return (
      web.subject.displayName() +
      "  —  " +
      web.direct.length +
      " allies" +
      (state.scheme === "web"
        ? ", " + web.secondIDs.size + " once removed"
        : "") +
      "\n" +
      (shown ? shown + rest : "no allies") +
      "\n" +
      counts()
    );
  }

  function css(...parts) {
    return parts.join(";") + ";";
  }

  function next(list, current) {
    return list[(list.indexOf(current) + 1) % list.length];
  }

  function commit(force) {
    writeStore();
    paint(force);
  }

  // --------------------------------------------------------------- keep it applied

  // The game rewrites the whole palette on a theme change, and again when it sees a
  // player for the first time. Both are rare. But if a bot spawns and quietly
  // restores every colour, the match is wasted, so re-assert.
  //
  // This rebuilds the palette. A replay of the last upload would draw a player who
  // spawned since then in black, because nothing wrote their slot.
  //
  // The beat is a self-scheduled timer rather than an interval, because the fade has
  // to redraw as the clock runs and repair alone does not.
  let reassert = 0;

  function scheduleReassert() {
    const delay = state.expiry === "fade" ? FADE_MS : REASSERT_MS;
    reassert = setTimeout(() => {
      if (state.on && mode.active) paint(true, true);
      scheduleReassert();
    }, delay);
  }

  // The countdown is text, so it redraws without a palette upload. It has to
  // recompute the clocks: the numbers on the cached web were read at paint time and
  // do not move on their own.
  const clock = setInterval(() => {
    const web = mode.lastWeb;
    if (!state.on || !mode.active || !web) return;
    const h = hooks();
    if (!h) return;
    web.expiry = expiryBySmallID(h.game, web.subject, web.direct);
    bar.render(web);
  }, CLOCK_MS);

  // --------------------------------------------------------------- wire it up

  window.addEventListener("mousemove", onMouseMove, true);
  window.addEventListener("mousedown", onMouseDown, true);
  window.addEventListener("wheel", onWheel, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);

  bar.build();
  // paint() gives up when no match is running, so label the bar first. Otherwise it
  // loads on the main menu as a row of empty buttons.
  bar.render(null);
  paint(true);
  scheduleReassert();

  window.__ofxProto14 = {
    state,
    mode,
    repaint: () => paint(true),
    destroy() {
      clearTimeout(reassert);
      clearInterval(clock);
      if (wheelTimer) clearTimeout(wheelTimer);
      window.removeEventListener("mousemove", onMouseMove, true);
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      restoreSettings();
      const h = hooks();
      if (h) h.view.updatePalette(realPalette(h.game));
      if (bar.root) bar.root.remove();
      delete window.__ofxProto14;
    },
  };

  console.log(
    "[ofx proto 14] alliance view. Bar at the top. window.__ofxProto14.destroy() to remove.",
  );
})();
