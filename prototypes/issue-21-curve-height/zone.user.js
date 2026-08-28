// ==UserScript==
// @name         PROTOTYPE — OpenFront optimal regeneration zone (issue #21)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Marks the band of troop levels where regeneration is near its best, and prints your share of that best.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #21, then dies. Do not import, do not extend.
//
// The third direction. A curve above the bar and a colour gradient across it were both
// turned down. This marks a band instead.
//
// The band covers every troop level whose regeneration is close to your best. The
// number to its right is your share of that best, so 100% is as fast as you can go and
// 50% means troops arrive at half speed.
//
// The width of "close to your best" is the open question, so it cycles:
//
//   99   36.9% to 47.5% full   the narrow reading
//   95   30.6% to 54.3% full   the middle reading
//   90   26.0% to 59.5% full   the wide reading
//
// No mark at 42.2%. The middle of the band already reads as the peak, and the two
// agree to within 0.6 of a percentage point at every width above.
//
// A solid strip along the bar's bottom edge marks the band. It stays clear of the
// game's troop numbers, which sit on the middle line of the bar.
//
// Two full-height lines can mark the band's ends as well. They are off by default,
// because a strip with a start and a stop already has ends, and the lines cross the
// troop numbers to say the same thing twice.
//
// Everything also draws under those numbers, not only below them. The bar lists its
// fills first and its numbers second, and none of them sets a z-index, so a node
// inserted between the two lands in that order.
//
// The debug bar is magenta on purpose. Violet is under judgement here, so nothing
// that is not under judgement may be violet.
//
// Arrow keys belong to the game, so this binds no keys. A reload drops you out of the
// match, so every choice lives in localStorage.

(() => {
  "use strict";

  // ---------------------------------------------------------------- the curve

  // The path issue #21 gave. `x` is troops / maxTroops, which is also the troop bar's
  // fill fraction. M is the internal troop count at x = 1. The game keeps that count
  // ten times larger than the number it prints.
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

  // The troop levels whose share reaches `limit`. Solved once, at load.
  function bandFor(limit) {
    let lo = null;
    let hi = null;
    for (let i = 0; i <= 20000; i++) {
      const x = i / 20000;
      if (shareOfBest(x) < limit) continue;
      if (lo === null) lo = x;
      hi = x;
    }
    return { lo, hi };
  }

  // ---------------------------------------------------------------- constants

  const WIDTHS = [99, 95, 90];
  const BANDS = {
    99: bandFor(0.99),
    95: bandFor(0.95),
    90: bandFor(0.9),
  };

  const VIOLET_EDGE = "#d5cfff";
  const VIOLET_STRIP = "#9d93f5";
  const VIOLET_TEXT = "#c9c4ff";

  const SHADOW_TEXT = "0 1px 1px rgba(0,0,0,0.9)";
  const SHADOW_LINE = "0 0 2px rgba(0,0,0,0.9)";
  const EDGE_WIDTH = 2;

  // The strip runs along the bar's bottom edge, clear of the game's troop numbers.
  // How tall it is, in pixels. `0` leaves the band marked by its two ends alone.
  const STRIPS = [5, 8, 3, 0];

  const STORE = {
    width: "ofx-proto-issue21z-width",
    strip: "ofx-proto-issue21z-strip",
    ends: "ofx-proto-issue21z-ends",
    percentage: "ofx-proto-issue21z-percentage",
  };

  if (window.__ofxProto21z) {
    window.__ofxProto21z.destroy();
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
  // longer feed regeneration, so the share reads the first fill alone.
  function fillFraction(bar) {
    const fill = bar.querySelector(".bg-malibu-blue");
    if (!fill) return null;
    const match = /scaleX\(\s*([-\d.e+]+)\s*\)/i.exec(fill.style.transform);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? clamp01(value) : null;
  }

  // ---------------------------------------------------------------- one readout

  // Everything goes inside the bar. The bar is already `position: relative` and it
  // already clips its overflow, so this needs no measurement and changes no property
  // of the game's own elements.
  function mount(bar, options) {
    const fills = bar.querySelector(".bg-malibu-blue")?.parentElement;
    if (!fills) return null;

    const band = document.createElement("div");
    band.className = "ofx-proto21z-band";
    band.style.cssText = [
      "position:absolute",
      "top:0",
      "bottom:0",
      "pointer-events:none",
    ].join(";");

    // The two ends are their own lines rather than borders on the band. A border needs
    // a shadow to survive on the bar's blue, and a shadow on the band draws a dark halo
    // round the whole width instead of sharpening the two ends.
    //
    // Each line is built from its own list. Reading `cssText` back and patching the
    // string does not work: the browser returns its own serialisation, so `left:0`
    // comes back as `left: 0px` and a search for the original text finds nothing.
    const edge = (side) => {
      const el = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        "top:0",
        "bottom:0",
        `${side}:0`,
        `width:${EDGE_WIDTH}px`,
        `background:${VIOLET_EDGE}`,
        `box-shadow:${SHADOW_LINE}`,
      ].join(";");
      return el;
    };
    const edges = [edge("left"), edge("right")];

    // The strip is solid, not translucent. It sits below the game's troop numbers and
    // it covers only the bottom of the fill, which is a flat colour, so nothing is
    // hidden by it. A veil across the whole height had to stay translucent to keep the
    // fill's own edge visible, and that is what made it too faint to read.
    const strip = document.createElement("div");
    strip.style.cssText = [
      "position:absolute",
      "left:0",
      "right:0",
      "bottom:0",
      `background:${VIOLET_STRIP}`,
      `box-shadow:${SHADOW_LINE}`,
    ].join(";");

    band.append(strip, ...edges);

    // The number sits at the bar's far right, which the game leaves empty. Its own
    // troop figures are centred, and its soldier icon stops well short of the end.
    const percentage = document.createElement("div");
    percentage.className = "ofx-proto21z-percentage";
    percentage.style.cssText = [
      "position:absolute",
      "top:0",
      "bottom:0",
      "right:5px",
      "display:flex",
      "align-items:center",
      "font-weight:700",
      "font-size:13px",
      "line-height:1",
      "font-variant-numeric:tabular-nums",
      `color:${VIOLET_TEXT}`,
      `text-shadow:${SHADOW_TEXT}`,
      "pointer-events:none",
    ].join(";");

    // Over the fills, under the numbers. The bar lists the fills first, so inserting
    // straight after them puts both of our nodes in exactly that position.
    fills.after(band, percentage);

    let observer = null;

    const readout = {
      bar,
      band,
      strip,
      edges,
      percentage,
      lastFraction: null,

      // The band never moves. Only the number does.
      update(fraction, force) {
        if (!force && fraction === this.lastFraction) return;
        this.lastFraction = fraction;
        this.percentage.textContent =
          fraction === null ? "" : `${Math.round(shareOfBest(fraction) * 100)}%`;
      },

      // Reads the fill fraction off the inline style the game already wrote, so it
      // forces no layout of its own.
      refresh() {
        const fraction = fillFraction(this.bar);
        this.update(fraction, false);
        options.onFraction(fraction);
      },

      applyOptions() {
        const { lo, hi } = BANDS[options.width()];
        this.band.style.left = `${lo * 100}%`;
        this.band.style.width = `${(hi - lo) * 100}%`;

        const height = options.strip();
        this.strip.style.display = height === 0 ? "none" : "block";
        this.strip.style.height = `${height}px`;

        const ends = options.ends();
        for (const edge of this.edges) {
          edge.style.display = ends ? "block" : "none";
        }

        this.percentage.style.display = options.percentage() ? "flex" : "none";
        this.update(this.lastFraction, true);
      },

      destroy() {
        observer?.disconnect();
        this.band.remove();
        this.percentage.remove();
      },
    };

    // The game rewrites the fill's inline transform on every tick, and the number
    // follows it. The watch is on the element that holds the two fills, never on the
    // bar, so it never sees our own nodes change.
    observer = new MutationObserver(() => readout.refresh());
    observer.observe(fills, {
      attributes: true,
      attributeFilter: ["style"],
      subtree: true,
    });

    readout.applyOptions();
    readout.refresh();
    return readout;
  }

  // ---------------------------------------------------------------- the loop

  const readouts = new Map();

  function read(key, fallback) {
    return localStorage.getItem(key) ?? fallback;
  }

  let width = Number(read(STORE.width, "95"));
  if (!WIDTHS.includes(width)) width = 95;

  const options = {
    width: () => width,
    strip: () => {
      const value = Number(read(STORE.strip, String(STRIPS[0])));
      return STRIPS.includes(value) ? value : STRIPS[0];
    },
    ends: () => read(STORE.ends, "off") === "on",
    percentage: () => read(STORE.percentage, "on") === "on",
    onFraction: (fraction) => stats.render(fraction),
  };

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
      const readout = mount(bar, options);
      if (readout) readouts.set(bar, readout);
    }
    for (const readout of readouts.values()) readout.refresh();
    // Nothing calls the switcher's report while no bar exists, so say so here.
    if (readouts.size === 0) stats.render(null);
  }

  function applyAll() {
    for (const readout of readouts.values()) readout.applyOptions();
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

  const widthLabel = document.createElement("span");
  widthLabel.style.cssText = "min-width:190px;text-align:center;font-weight:700";

  const stripToggle = button("", () => {
    const index = STRIPS.indexOf(options.strip());
    localStorage.setItem(STORE.strip, String(STRIPS[(index + 1) % STRIPS.length]));
    paint();
    applyAll();
  });

  const endsToggle = button("", () => {
    localStorage.setItem(STORE.ends, options.ends() ? "off" : "on");
    paint();
    applyAll();
  });

  const percentageToggle = button("", () => {
    localStorage.setItem(STORE.percentage, options.percentage() ? "off" : "on");
    paint();
    applyAll();
  });

  const stats = {
    el: document.createElement("span"),
    last: "",
    render(fraction) {
      const { lo, hi } = BANDS[width];
      const text =
        fraction === null
          ? "no troop bar found"
          : `fill ${(fraction * 100).toFixed(1)}% · ${(
              shareOfBest(fraction) * 100
            ).toFixed(1)}% of best · ${
              fraction < lo ? "below band" : fraction > hi ? "past band" : "in band"
            }`;
      if (text === this.last) return;
      this.last = text;
      this.el.textContent = text;
    },
  };
  stats.el.style.cssText =
    "opacity:.6;font-size:11px;min-width:250px;font-variant-numeric:tabular-nums";

  switcher.append(
    button("◀", () => step(-1)),
    widthLabel,
    button("▶", () => step(1)),
    stripToggle,
    endsToggle,
    percentageToggle,
    stats.el,
  );

  function paint() {
    const { lo, hi } = BANDS[width];
    widthLabel.textContent = `${width}% of best · ${(lo * 100).toFixed(1)}–${(
      hi * 100
    ).toFixed(1)}%`;

    const height = options.strip();
    stripToggle.textContent = `strip: ${height === 0 ? "off" : height + "px"}`;
    const ends = options.ends();
    endsToggle.textContent = `ends: ${ends ? "on" : "off"}`;
    endsToggle.style.background = ends ? "#ff2bd1" : "#333";
    endsToggle.style.color = ends ? "#111" : "#fff";

    const on = options.percentage();
    percentageToggle.textContent = `number: ${on ? "on" : "off"}`;
    percentageToggle.style.background = on ? "#ff2bd1" : "#333";
    percentageToggle.style.color = on ? "#111" : "#fff";
  }

  function step(delta) {
    const index = WIDTHS.indexOf(width);
    width = WIDTHS[(index + delta + WIDTHS.length) % WIDTHS.length];
    localStorage.setItem(STORE.width, String(width));
    paint();
    applyAll();
    stats.last = "";
  }

  document.body.appendChild(switcher);
  paint();
  sync();
  const timer = setInterval(sync, 500);

  window.__ofxProto21z = {
    step,
    destroy() {
      clearInterval(timer);
      for (const readout of readouts.values()) readout.destroy();
      readouts.clear();
      switcher.remove();
      delete window.__ofxProto21z;
    },
  };

  console.log("[ofx proto #21 zone] loaded. window.__ofxProto21z.destroy() removes it.");
})();
