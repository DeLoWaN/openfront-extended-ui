// ==UserScript==
// @name         PROTOTYPE — OpenFront spawn mark (issue #35)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Five marks for a teammate's spawn, plus knobs for colour, size, pointer and life.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #35, then dies. Do not import, do not extend.
//
// The question: which mark of our own, drawn over the game's spawn pulse, lets a
// player find every teammate fastest during the spawn phase?
//
// Test bed (research/spawn-test-bed): solo game, map World, mode Teams, Quads,
// Bots 0, then do NOT click the map. The spawn phase lasts until the click and
// three Nations join your team. The "teammates" knob adds more stand-ins.
//
// Five marks, structurally different:
//
//   A ring      hollow ring around the spawn, with the name above. Never covers the spawn itself.
//   B pin       a map pin whose tip sits on the spawn, with the name above it.
//   C reticle   four corner brackets that turn slowly, plus four ticks.
//   D arrow     a large arrow above the spawn that bobs, pointing down at it.
//   E pulse     the game's own pulse made bigger, drawn here as a stand-in
//               because the game draws a pulse for humans only. It also writes
//               the real teammate radii, so a game with humans shows the real one.
//
// Knobs on the bar at the bottom:
//
//   colour      white / violet / amber / team, over a dark outline. E always uses team colour.
//   size        A-D: fixed, fixed large, grows with the zoom. E: 14 / 30 / 60 tiles.
//   pointer     a chevron at the screen edge for a teammate who is off screen.
//   teammates   3 real, then stand-ins up to 8, 16, 32 (other Nations).
//   end         vanish with the spawn phase, or fade over 1.2 s.
//   move        jump when a Nation re-picks its spawn, or glide.
//
// Keys: [ and ] switch the mark. The arrow keys move the game's camera, so they
// are not used.
//
// Persistence: localStorage, because a reload drops you out of the match.
//
// window.__ofxProto35.destroy() removes everything and restores the game's radii.

(() => {
  "use strict";
  if (window.__ofxProto35) window.__ofxProto35.destroy();

  // --------------------------------------------------------------- constants

  const STORE_KEY = "ofx-proto-issue35";
  const VARIANTS = ["A", "B", "C", "D", "E"];
  const VARIANT_NAMES = {
    A: "Ring with name",
    B: "Pin with name",
    C: "Reticle",
    D: "Bobbing arrow",
    E: "Game pulse, bigger",
  };
  const COLOURS = ["white", "violet", "amber", "team"];
  const COLOUR_HEX = { white: "#ffffff", violet: "#7f77dd", amber: "#fbbf24" };
  // "team" paints the mark in the teammate's own territory colour.
  const markColour = (m) =>
    state.colour === "team" ? `rgb(${m.rgb})` : COLOUR_HEX[state.colour];
  const TEAMMATE_COUNTS = [0, 8, 16, 32]; // 0 means the real teammates only
  const FADE_MS = 1200;
  const GLIDE_MS = 350;
  // The scale the game starts at on World at 1920 wide. Grows-with-zoom is
  // relative to it, so the mark is its nominal size there.
  const REFERENCE_SCALE = 0.864;
  // The game's own defaults, src/client/render/gl/render-settings.json:325.
  const GAME_MATE_MIN = 5;
  const GAME_MATE_MAX = 14;
  const E_TILES = [14, 30, 60];
  // The edge pointer stays out of the bottom row of the HUD (z-200).
  const EDGE = { left: 60, right: 60, top: 60, bottom: 150 };
  // Multiplies the edge chevron's drawing, which is 25 px long at 1.
  const POINTER_SCALE = 2.4;
  const POINTER_MERGE_PX = 70;

  // --------------------------------------------------------------- state

  const defaults = {
    variant: "A",
    colour: "white",
    size: 0,
    pointer: true,
    count: 0,
    end: "fade",
    move: "jump",
  };
  let state = { ...defaults };
  try {
    Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || "{}"));
  } catch {
    // Start from defaults.
  }
  const save = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      // Not worth a message.
    }
  };

  // --------------------------------------------------------------- game access

  const getGame = () => document.querySelector("control-panel")?.game ?? null;
  const getCamera = () =>
    document.querySelector("build-menu")?.transformHandler ?? null;
  const getSpawnSettings = () => {
    try {
      return window.__webglView?.getSettings?.()?.spawnOverlay ?? null;
    } catch {
      return null;
    }
  };

  // Marks keyed by player id. Each keeps a smoothed world position so a glide
  // and a fade-out both work after the game stops reporting spawns.
  const marks = new Map();
  let phaseEndedAt = null;
  let lastReport = { found: 0, onScreen: 0, off: 0, why: "no game" };

  function collect(game) {
    const me = game.myPlayer();
    if (!me) {
      lastReport.why = "myPlayer() is null";
      return [];
    }
    const found = [];
    const seen = new Set();
    for (const p of game.players()) {
      if (p === me || !p.isOnSameTeam(me)) continue;
      found.push(p);
      seen.add(p.id());
    }
    const real = found.length;
    if (state.count > real) {
      for (const p of game.players()) {
        if (found.length >= state.count) break;
        if (p === me || seen.has(p.id()) || p.type() !== "NATION") continue;
        found.push(p);
        seen.add(p.id());
      }
    }
    lastReport.why = `${real} real teammate(s)`;
    return found;
  }

  function refresh(game, now) {
    const players = collect(game);
    const live = new Set();
    for (const p of players) {
      const tile = p.state?.spawnTile;
      if (tile === undefined) continue;
      const wx = game.x(tile);
      const wy = game.y(tile);
      const id = p.id();
      live.add(id);
      let m = marks.get(id);
      if (!m) {
        m = { id, name: p.displayName(), x: wx, y: wy, from: null, t0: 0 };
        marks.set(id, m);
      }
      if (m.tx !== wx || m.ty !== wy) {
        m.from = { x: m.x, y: m.y };
        m.t0 = now;
        m.tx = wx;
        m.ty = wy;
      }
      const c = p.territoryColor().toRgb();
      m.rgb = `${c.r},${c.g},${c.b}`;
      m.name = p.displayName();
    }
    for (const id of [...marks.keys()]) if (!live.has(id)) marks.delete(id);

    for (const m of marks.values()) {
      if (state.move === "glide" && m.from) {
        const k = Math.min(1, (now - m.t0) / GLIDE_MS);
        const e = 1 - (1 - k) * (1 - k);
        m.x = m.from.x + (m.tx - m.from.x) * e;
        m.y = m.from.y + (m.ty - m.from.y) * e;
      } else {
        m.x = m.tx;
        m.y = m.ty;
      }
    }
  }

  // --------------------------------------------------------------- drawing

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:100;";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");

  function fit() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener("resize", fit);

  const rgba = (rgb, a) => `rgba(${rgb},${a})`;

  function stroked(draw, colour, width) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = width + 4;
    draw();
    ctx.stroke();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    draw();
    ctx.stroke();
  }

  // One unit in pixels for marks A to D.
  function unit(scale) {
    if (state.size === 0) return 1;
    if (state.size === 1) return 1.6;
    return Math.max(0.35, Math.min(4, scale / REFERENCE_SCALE));
  }

  // The teammate's name, centred on x with its bottom edge at bottomY.
  function drawName(x, bottomY, u, colour, name) {
    const size = Math.max(11, 12 * u);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.strokeText(name, x, bottomY);
    ctx.fillStyle = colour;
    ctx.fillText(name, x, bottomY);
  }

  function drawRing(x, y, u, colour, t, name) {
    const r = 16 * u + 2 * Math.sin(t * 0.006);
    stroked(() => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }, colour, 3 * Math.max(1, u * 0.8));
    // The name sits above the ring at rest, so it stays still while the ring pulses.
    drawName(x, y - 16 * u - 8, u, colour, name);
  }

  function drawPin(x, y, u, colour, t, name) {
    const bob = 2 * Math.sin(t * 0.005);
    const r = 11 * u;
    const cy = y - 30 * u + bob;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x, y + bob);
      ctx.lineTo(x - r * 0.8, cy + r * 0.6);
      ctx.arc(x, cy, r, Math.PI * 0.8, Math.PI * 0.2, false);
      ctx.closePath();
    };
    ctx.fillStyle = colour;
    path();
    ctx.fill();
    stroked(path, "rgba(0,0,0,0.0)", 1);
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.arc(x, cy, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    drawName(x, y - 30 * u - r - 4, u, colour, name);
  }

  function drawReticle(x, y, u, colour, t) {
    const a = (t * 0.00035) % (Math.PI * 2);
    const h = 18 * u;
    const arm = 8 * u;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    stroked(() => {
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.moveTo(sx * h, sy * (h - arm));
        ctx.lineTo(sx * h, sy * h);
        ctx.lineTo(sx * (h - arm), sy * h);
      }
    }, colour, 3 * Math.max(1, u * 0.8));
    ctx.restore();
    stroked(() => {
      ctx.beginPath();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        ctx.moveTo(x + dx * 24 * u, y + dy * 24 * u);
        ctx.lineTo(x + dx * 34 * u, y + dy * 34 * u);
      }
    }, colour, 3 * Math.max(1, u * 0.8));
  }

  function drawArrow(x, y, u, colour, t) {
    const bob = 6 * u * Math.abs(Math.sin(t * 0.004));
    const tipY = y - 6 * u - bob;
    const w = 13 * u;
    const len = 38 * u;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x, tipY);
      ctx.lineTo(x - w, tipY - len * 0.45);
      ctx.lineTo(x - w * 0.42, tipY - len * 0.45);
      ctx.lineTo(x - w * 0.42, tipY - len);
      ctx.lineTo(x + w * 0.42, tipY - len);
      ctx.lineTo(x + w * 0.42, tipY - len * 0.45);
      ctx.lineTo(x + w, tipY - len * 0.45);
      ctx.closePath();
    };
    ctx.fillStyle = colour;
    path();
    ctx.fill();
    stroked(path, "rgba(0,0,0,0)", 1);
  }

  // A stand-in for the game's own teammate ring. Radii are in tiles, so the
  // ring shrinks with the zoom, which is the weak point the ticket names.
  function drawPulse(x, y, scale, m, t) {
    const maxRad = E_TILES[state.size];
    const minRad = (maxRad * GAME_MATE_MIN) / GAME_MATE_MAX;
    const breath = 0.5 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.008));
    const alpha = 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.008));
    const outer = Math.max(1, maxRad * breath * scale);
    const inner = Math.max(0.5, minRad * breath * scale);
    const solid = inner + (outer - inner) * 0.1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, outer);
    g.addColorStop(0, rgba(m.rgb, 0));
    g.addColorStop(Math.min(0.99, inner / outer), rgba(m.rgb, alpha));
    g.addColorStop(Math.min(0.99, solid / outer), rgba(m.rgb, alpha));
    g.addColorStop(1, rgba(m.rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMark(m, p, scale, colour, t, alpha) {
    ctx.globalAlpha = alpha;
    const u = unit(scale);
    switch (state.variant) {
      case "A": drawRing(p.x, p.y, u, colour, t, m.name); break;
      case "B": drawPin(p.x, p.y, u, colour, t, m.name); break;
      case "C": drawReticle(p.x, p.y, u, colour, t); break;
      case "D": drawArrow(p.x, p.y, u, colour, t); break;
      case "E": drawPulse(p.x, p.y, scale, m, t); break;
    }
    ctx.globalAlpha = 1;
  }

  // A chevron on the screen edge pointing at a teammate who is off screen.
  // Chevrons that land within 34 px of each other merge into one with a count.
  function drawPointers(offscreen, alpha) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const L = EDGE.left, R = w - EDGE.right, T = EDGE.top, B = h - EDGE.bottom;
    const spots = [];
    for (const p of offscreen) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const k = Math.min(
        dx > 0 ? (R - cx) / dx : dx < 0 ? (L - cx) / dx : Infinity,
        dy > 0 ? (B - cy) / dy : dy < 0 ? (T - cy) / dy : Infinity,
      );
      const x = cx + dx * k;
      const y = cy + dy * k;
      const spot = spots.find((s) => Math.hypot(s.x - x, s.y - y) < POINTER_MERGE_PX);
      if (spot) spot.n++;
      else spots.push({ x, y, n: 1, ang: Math.atan2(dy, dx), colour: p.colour });
    }
    ctx.globalAlpha = alpha;
    for (const s of spots) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.ang);
      ctx.fillStyle = s.colour;
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(POINTER_SCALE * 14, 0);
        ctx.lineTo(POINTER_SCALE * -8, POINTER_SCALE * -11);
        ctx.lineTo(POINTER_SCALE * -3, 0);
        ctx.lineTo(POINTER_SCALE * -8, POINTER_SCALE * 11);
        ctx.closePath();
      };
      path();
      ctx.fill();
      stroked(path, "rgba(0,0,0,0)", 1);
      ctx.restore();
      if (s.n > 1) {
        const at = POINTER_SCALE * 22;
        ctx.font = `700 ${POINTER_SCALE * 13}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(`×${s.n}`, s.x - Math.cos(s.ang) * at, s.y - Math.sin(s.ang) * at);
        ctx.fillStyle = s.colour;
        ctx.fillText(`×${s.n}`, s.x - Math.cos(s.ang) * at, s.y - Math.sin(s.ang) * at);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --------------------------------------------------------------- frame loop

  let raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const game = getGame();
    const camera = getCamera();
    if (!game || !camera) {
      lastReport = { found: 0, onScreen: 0, off: 0, why: "no game or camera yet" };
      return;
    }

    const inPhase = game.inSpawnPhase();
    if (inPhase) {
      phaseEndedAt = null;
      refresh(game, now);
    } else if (marks.size && phaseEndedAt === null) {
      phaseEndedAt = now;
    }

    let alpha = 1;
    if (!inPhase) {
      if (state.end === "vanish") alpha = 0;
      else if (phaseEndedAt !== null) {
        alpha = Math.max(0, 1 - (now - phaseEndedAt) / FADE_MS);
      }
      if (alpha === 0) {
        marks.clear();
        syncGameRadii(false);
        return;
      }
    }

    syncGameRadii(state.variant === "E");

    const w = window.innerWidth;
    const h = window.innerHeight;
    const off = [];
    let on = 0;
    for (const m of marks.values()) {
      const p = camera.worldToScreenCoordinates({ x: m.x, y: m.y });
      const visible = p.x > 0 && p.y > 0 && p.x < w && p.y < h;
      if (visible) {
        on++;
        drawMark(m, p, camera.scale, markColour(m), now, alpha);
      } else {
        off.push({ x: p.x, y: p.y, colour: markColour(m) });
      }
    }
    if (state.pointer && off.length) drawPointers(off, alpha);

    lastReport.found = marks.size;
    lastReport.onScreen = on;
    lastReport.off = off.length;
    lastReport.scale = camera.scale;
    lastReport.phase = inPhase;
  }

  // Writes the teammate radii the game's own pulse reads, so a game with real
  // humans shows the real ring at the size picked here. Written every frame
  // because any graphics setting change resets them.
  function syncGameRadii(on) {
    const s = getSpawnSettings();
    lastReport.settings = !!s;
    if (!s) return;
    const max = on ? E_TILES[state.size] : GAME_MATE_MAX;
    const min = on ? (max * GAME_MATE_MIN) / GAME_MATE_MAX : GAME_MATE_MIN;
    if (s.mateMaxRad !== max) s.mateMaxRad = max;
    if (s.mateMinRad !== min) s.mateMinRad = min;
  }

  // --------------------------------------------------------------- the bar

  const bar = document.createElement("div");
  bar.style.cssText =
    "position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:2147483647;" +
    "display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;max-width:96vw;" +
    "padding:8px 12px;border-radius:14px;background:#111c;color:#fff;" +
    "font:600 12px system-ui,sans-serif;box-shadow:0 4px 20px #0008;backdrop-filter:blur(6px);";
  document.body.append(bar);

  const btn = (key, label) =>
    `<button data-k="${key}" style="all:unset;cursor:pointer;padding:4px 9px;border-radius:8px;background:#fff2;white-space:nowrap">${label}</button>`;

  function sizeLabel() {
    if (state.variant === "E") return `${E_TILES[state.size]} tiles`;
    return ["fixed", "fixed ×1.6", "grows with zoom"][state.size];
  }

  function render() {
    const r = lastReport;
    bar.innerHTML =
      btn("prev", "‹") +
      `<span style="min-width:150px;text-align:center">${state.variant} · ${VARIANT_NAMES[state.variant]}</span>` +
      btn("next", "›") +
      "<span style='opacity:.4'>|</span>" +
      btn("colour", `colour: ${state.variant === "E" ? "team (fixed)" : state.colour}`) +
      btn("size", `size: ${sizeLabel()}`) +
      btn("pointer", `edge pointer: ${state.pointer ? "on" : "off"}`) +
      btn("count", `teammates: ${state.count === 0 ? "real" : state.count}`) +
      btn("end", `end: ${state.end}`) +
      btn("move", `move: ${state.move}`) +
      `<div style="flex-basis:100%;text-align:center;opacity:.75;font-weight:500">` +
      `${r.found ?? 0} marked · ${r.onScreen ?? 0} on screen · ${r.off ?? 0} off screen · ` +
      `${r.why ?? ""} · scale ${r.scale ? r.scale.toFixed(2) : "?"} · ` +
      `${r.phase ? "spawn phase" : "not in spawn phase"} · game radii ${r.settings ? "writable" : "unreachable"}` +
      `</div>`;
  }

  const cycle = (list, v, d = 1) => list[(list.indexOf(v) + d + list.length) % list.length];

  function act(key) {
    if (key === "prev") state.variant = cycle(VARIANTS, state.variant, -1);
    if (key === "next") state.variant = cycle(VARIANTS, state.variant, 1);
    if (key === "colour") state.colour = cycle(COLOURS, state.colour);
    if (key === "size") state.size = (state.size + 1) % 3;
    if (key === "pointer") state.pointer = !state.pointer;
    if (key === "count") state.count = cycle(TEAMMATE_COUNTS, state.count);
    if (key === "end") state.end = state.end === "fade" ? "vanish" : "fade";
    if (key === "move") state.move = state.move === "jump" ? "glide" : "jump";
    save();
    render();
  }

  bar.addEventListener("click", (e) => {
    const k = e.target?.closest?.("[data-k]")?.dataset.k;
    if (k) act(k);
  });

  const onKey = (e) => {
    const tag = (e.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
    if (e.key === "[") act("prev");
    if (e.key === "]") act("next");
  };
  window.addEventListener("keydown", onKey);

  render();
  const barTimer = setInterval(render, 300);
  raf = requestAnimationFrame(frame);

  window.__ofxProto35 = {
    state: () => ({ ...state }),
    marks: () => [...marks.values()],
    destroy() {
      cancelAnimationFrame(raf);
      clearInterval(barTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fit);
      syncGameRadii(false);
      canvas.remove();
      bar.remove();
      delete window.__ofxProto35;
    },
  };
})();
