// ==UserScript==
// @name         PROTOTYPE — OpenFront regeneration gradient (issue #21)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Colours the troop bar with the regeneration rate instead of a curve above it.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #21, then dies. Do not import, do not extend.
//
// The regeneration rate as colour across the troop bar, instead of a curve drawn
// above it. Colour costs no vertical space, which was the curve's real problem.
//
//   G  the gradient replaces the troop fill, clipped to your level
//   T  the gradient sits behind the game's fills, which stay blue
//   V  T again in violet, which carries no meaning of the game's own
//
// The colour is not a plain ramp between the two ends. Every stop is the same
// `shareOfBest` the curve used, so the colour at any point on the bar is that
// level's share of your best rate. Green sits at the 42.2% level because that is
// where the share reads 1.
//
// `G` is the ask on the ticket. `T` and `V` test one objection each, and the
// README records both.
//
// The debug bar is magenta on purpose. The colours under judgement are the game's
// green and orange, so nothing that is not under judgement may be either.
//
// Arrow keys belong to the game, so this binds no keys. A reload drops you out of
// the match, so every choice lives in localStorage.

(() => {
  "use strict";

  // ---------------------------------------------------------------- the curve

  // The same path issue #21 gave for the curve. `x` is troops / maxTroops, which is
  // also the troop bar's fill fraction. M is the internal troop count at x = 1. The
  // game keeps that count ten times larger than the number it prints.
  const M = 1_000_000;
  const rate = (x) => (10 + Math.pow(x * M, 0.73) / 4) * (1 - x);
  let best = 0;
  for (let i = 1; i < 1000; i++) best = Math.max(best, rate(i / 1000));

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  // Share of best rate. Reads 1 at the peak and 0 at your maximum.
  function shareOfBest(x) {
    return rate(clamp01(x)) / best;
  }

  // ---------------------------------------------------------------- the colours

  // The game's own rate colours, read from Tailwind 4 at commit 332e5410e. The pill
  // to the left of the bar draws `+380/s` in one of these two.
  const ORANGE_400 = { l: 75, c: 0.183, h: 55.934 };
  const GREEN_400 = { l: 79.2, c: 0.209, h: 151.711 };

  // Our signature violet at two weights, on one hue.
  //
  // Hue 300 rather than the 285 of `#7f77dd`. The gradient has to sit next to the
  // bar's own blue fill, and 285 is only 40 degrees off that blue, which reads as
  // one muddy band at the join. 300 leans far enough towards magenta to separate.
  //
  // The dim end stops at 38% lightness, not near black. The bar's track is already
  // dark, so a dim end any lower reads as an empty bar rather than a low rate.
  const VIOLET_DIM = { l: 38, c: 0.06, h: 300 };
  const VIOLET_BRIGHT = { l: 72, c: 0.17, h: 300 };

  const PEAK = 0.422;
  const DROP_WIDTH = 2;
  const VIOLET_DROP = "#5b53a8";
  const SHADOW_LINE = "0 0 2px rgba(0,0,0,0.9)";

  // Enough stops that the browser's own interpolation between two of them cannot be
  // seen. The bar is about 700 px wide, so this puts one every 11 px.
  const STOPS = 64;

  // OKLCH keeps the ramp perceptually even. Between the game's orange and green it
  // passes through yellow without the muddy band an sRGB blend would give.
  function mix(from, to, t) {
    return {
      l: from.l + (to.l - from.l) * t,
      c: from.c + (to.c - from.c) * t,
      h: from.h + (to.h - from.h) * t,
    };
  }

  function css(colour) {
    return `oklch(${colour.l.toFixed(2)}% ${colour.c.toFixed(4)} ${colour.h.toFixed(3)})`;
  }

  // One stop per sample, placed at that troop level, coloured by its share of best.
  function gradient(low, high) {
    const stops = [];
    for (let i = 0; i <= STOPS; i++) {
      const x = i / STOPS;
      stops.push(`${css(mix(low, high, shareOfBest(x)))} ${(x * 100).toFixed(2)}%`);
    }
    return `linear-gradient(to right, ${stops.join(",")})`;
  }

  const RAMPS = {
    G: gradient(ORANGE_400, GREEN_400),
    T: gradient(ORANGE_400, GREEN_400),
    V: gradient(VIOLET_DIM, VIOLET_BRIGHT),
  };

  const VARIANTS = ["G", "T", "V"];
  const VARIANT_LABELS = {
    G: "G — replaces the fill",
    T: "T — behind the fills",
    V: "V — behind, in violet",
  };

  // `G` covers the game's troop fill, so it goes after the fills and before the
  // numbers. The other two sit behind everything.
  const OVER_THE_FILL = { G: true, T: false, V: false };

  const STORE = {
    variant: "ofx-proto-issue21g-variant",
    dropLine: "ofx-proto-issue21g-drop-line",
  };

  if (window.__ofxProto21g) {
    window.__ofxProto21g.destroy();
  }

  // ---------------------------------------------------------------- the game's bar

  // The troop bar is the grandparent of the first blue fill. The game keeps a wide
  // copy and a narrow copy in the page at all times and hides one with CSS, so the
  // hidden one measures 0 by 0.
  function findTroopBars() {
    const panel = document.querySelector("control-panel");
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(".bg-malibu-blue"))
      .map((fill) => fill.parentElement?.parentElement)
      .filter(
        (bar) =>
          bar instanceof HTMLElement && bar.classList.contains("overflow-hidden"),
      );
  }

  // The first fill holds your troops. The second holds committed troops, which no
  // longer feed regeneration, so the clip reads the first fill alone.
  function fillFraction(bar) {
    const fill = bar.querySelector(".bg-malibu-blue");
    if (!fill) return null;
    const match = /scaleX\(\s*([-\d.e+]+)\s*\)/i.exec(fill.style.transform);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? clamp01(value) : null;
  }

  // ---------------------------------------------------------------- one readout

  // Everything goes inside the bar as our own children. The bar is already
  // `position: relative` and it already clips its overflow, so this needs no
  // measurement and changes no property of the game's own elements.
  function mount(bar, variant, options) {
    const fills = bar.querySelector(".bg-malibu-blue")?.parentElement;
    if (!fills) return null;

    const band = document.createElement("div");
    band.className = "ofx-proto21g-band";
    band.style.cssText = [
      "position:absolute",
      "inset:0",
      "pointer-events:none",
      `background:${RAMPS[variant]}`,
    ].join(";");

    // `G` reveals the gradient only up to your level, so the dark track still shows
    // your headroom. The clip animates on the same curve as the game's own fill, so
    // the two edges never part company.
    if (OVER_THE_FILL[variant]) {
      band.style.transition = "clip-path 200ms ease-out";
      fills.after(band);
    } else {
      bar.prepend(band);
    }

    // The 42.2% level, in case the colour alone does not place it.
    const dropLine = document.createElement("div");
    dropLine.className = "ofx-proto21g-drop";
    dropLine.style.cssText = [
      "position:absolute",
      "top:0",
      "bottom:0",
      `left:${PEAK * 100}%`,
      `width:${DROP_WIDTH}px`,
      `margin-left:${-DROP_WIDTH / 2}px`,
      `background:${VIOLET_DROP}`,
      `box-shadow:${SHADOW_LINE}`,
      "pointer-events:none",
    ].join(";");
    bar.append(dropLine);

    let observer = null;

    const readout = {
      bar,
      band,
      dropLine,
      lastFraction: null,

      // Only `G` has anything to update. The other two are drawn once and then cost
      // nothing for the rest of the match.
      update(fraction, force) {
        if (!OVER_THE_FILL[variant]) return;
        if (!force && fraction === this.lastFraction) return;
        this.lastFraction = fraction;
        this.band.style.clipPath =
          fraction === null
            ? "inset(0 100% 0 0)"
            : `inset(0 ${((1 - fraction) * 100).toFixed(3)}% 0 0)`;
      },

      // Reads the fill fraction off the inline style the game already wrote, so it
      // forces no layout of its own.
      refresh() {
        const fraction = fillFraction(this.bar);
        this.update(fraction, false);
        options.onFraction(fraction);
      },

      applyOptions() {
        this.dropLine.style.display = options.dropLine() ? "block" : "none";
      },

      destroy() {
        observer?.disconnect();
        this.band.remove();
        this.dropLine.remove();
      },
    };

    // The game rewrites the fill's inline transform on every tick. Only `G` follows
    // it, but the switcher's report needs it for all three. The watch is on the
    // element that holds the two fills, never on the bar, so it never sees our own
    // nodes move.
    observer = new MutationObserver(() => readout.refresh());
    observer.observe(fills, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });

    readout.applyOptions();
    readout.update(null, true);
    readout.refresh();
    return readout;
  }

  // ---------------------------------------------------------------- the loop

  const readouts = new Map();
  let variant = read(STORE.variant, VARIANTS[0]);
  if (!VARIANTS.includes(variant)) variant = VARIANTS[0];

  const options = {
    dropLine: () => read(STORE.dropLine, "on") === "on",
    onFraction: (fraction) => stats.render(fraction),
  };

  function read(key, fallback) {
    return localStorage.getItem(key) ?? fallback;
  }

  // The game rebuilds its own nodes, so a readout can disappear under us. This puts
  // it back and drops the readouts whose bar has left the page.
  function sync() {
    const live = findTroopBars();
    for (const [bar, readout] of readouts) {
      if (live.includes(bar) && readout.band.isConnected) continue;
      readout.destroy();
      readouts.delete(bar);
    }
    for (const bar of live) {
      if (readouts.has(bar)) continue;
      const readout = mount(bar, variant, options);
      if (readout) readouts.set(bar, readout);
    }
    for (const readout of readouts.values()) readout.refresh();
    // Nothing calls the switcher's report while no bar exists, so say so here.
    if (readouts.size === 0) stats.render(null);
  }

  function remount() {
    for (const readout of readouts.values()) readout.destroy();
    readouts.clear();
    sync();
  }

  // ---------------------------------------------------------------- the switcher

  // Top of the screen on purpose. The bar under judgement sits at the bottom.
  const switcher = document.createElement("div");
  switcher.style.cssText = [
    "position:fixed",
    "top:8px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:2147483600",
    "display:flex",
    "align-items:center",
    "gap:6px",
    "padding:6px 8px",
    "border-radius:999px",
    "background:#111",
    "border:2px solid #ff2bd1",
    "box-shadow:0 4px 14px rgba(0,0,0,.6)",
    "font:12px/1.2 system-ui,sans-serif",
    "color:#fff",
    "white-space:nowrap",
    "user-select:none",
  ].join(";");

  function button(label, onClick) {
    const el = document.createElement("button");
    el.textContent = label;
    el.style.cssText =
      "all:unset;cursor:pointer;padding:3px 8px;border-radius:999px;background:#333;color:#fff;font:12px system-ui";
    el.addEventListener("click", onClick);
    return el;
  }

  const variantLabel = document.createElement("span");
  variantLabel.style.cssText = "min-width:150px;text-align:center;font-weight:700";

  const dropToggle = button("", () => {
    localStorage.setItem(STORE.dropLine, options.dropLine() ? "off" : "on");
    paint();
    for (const readout of readouts.values()) readout.applyOptions();
  });

  const stats = {
    el: document.createElement("span"),
    last: "",
    render(fraction) {
      const text =
        fraction === null
          ? "no troop bar found"
          : `fill ${(fraction * 100).toFixed(1)}% · share ${(
              shareOfBest(fraction) * 100
            ).toFixed(1)}% · pill is ${fraction < PEAK ? "green" : "orange"}`;
      if (text === this.last) return;
      this.last = text;
      this.el.textContent = text;
    },
  };
  stats.el.style.cssText =
    "opacity:.6;font-size:11px;min-width:260px;font-variant-numeric:tabular-nums";

  switcher.append(
    button("◀", () => step(-1)),
    variantLabel,
    button("▶", () => step(1)),
    dropToggle,
    stats.el,
  );

  function paint() {
    variantLabel.textContent = VARIANT_LABELS[variant];
    const on = options.dropLine();
    dropToggle.textContent = `42.2% line: ${on ? "on" : "off"}`;
    dropToggle.style.background = on ? "#ff2bd1" : "#333";
    dropToggle.style.color = on ? "#111" : "#fff";
  }

  function step(delta) {
    const index = VARIANTS.indexOf(variant);
    variant = VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length];
    localStorage.setItem(STORE.variant, variant);
    paint();
    remount();
  }

  document.body.appendChild(switcher);
  paint();
  sync();
  const timer = setInterval(sync, 500);

  window.__ofxProto21g = {
    step,
    destroy() {
      clearInterval(timer);
      for (const readout of readouts.values()) readout.destroy();
      readouts.clear();
      switcher.remove();
      delete window.__ofxProto21g;
    },
  };

  console.log("[ofx proto #21 gradient] loaded. window.__ofxProto21g.destroy() removes it.");
})();
