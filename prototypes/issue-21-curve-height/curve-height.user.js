// ==UserScript==
// @name         PROTOTYPE — OpenFront regeneration curve height (issue #21)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Draws the regeneration curve at four heights so they can be compared on screen.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #21, then dies. Do not import, do not extend.
//
// The same regeneration curve at four heights, switched from a bar at the top of
// the screen:
//
//   A  24 px, in our own node above the troop bar
//   B  inside the troop bar, adds no height
//   C  16 px, above the troop bar
//   D  40 px, above the troop bar
//
// Everything else about the readout is settled on issue #6 and is not a variable
// here: the curve, the drop line at the 42.2% level, the dot above the boundary
// between the bar's two fills, violet at three weights, and the percentage in the
// top-right corner.
//
// Three toggles sit beside the height. The first is the one the ticket asks for.
// The other two exist because the ticket asks whether the drop line and the
// percentage add clutter. Switch them off and look.
//
// The debug chrome is magenta on purpose. Violet is under judgement here, so
// nothing that is not under judgement may be violet.
//
// Arrow keys belong to the game, so this binds no keys. A reload drops you out of
// the match, so every choice lives in localStorage.

(() => {
  "use strict";

  // ---------------------------------------------------------------- the curve

  // The path from issue #21. `x` is troops / maxTroops, which is also the troop
  // bar's fill fraction. M is the internal troop count at x = 1. The game keeps
  // that count ten times larger than the number it prints.
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

  // ---------------------------------------------------------------- constants

  const PEAK = 0.422;

  // One violet at three weights. The curve keeps the signature colour itself.
  const VIOLET_DOT = "#b3adff";
  const VIOLET_CURVE = "#7f77dd";
  const VIOLET_DROP = "#5b53a8";

  // The game's own shadow under light text. A line needs a dark edge all round
  // instead, because it has to survive on the bar's lighter blue.
  const SHADOW_TEXT = "0 1px 1px rgba(0,0,0,0.8)";
  const SHADOW_LINE = "0 0 2px rgba(0,0,0,0.9)";

  const DOT_SIZE = 6;
  const RING_WIDTH = 1.5;

  // The dot has to fit inside the plot, so the curve gives up half a dot at each
  // end. A node H px tall therefore leaves H - DOT_SIZE px of travel.
  const INSET = DOT_SIZE / 2;

  const CURVE_WIDTH = 2;
  const DROP_WIDTH = 2;
  const SAMPLES = 200;

  // The game animates the bar's fill over 200 ms. The dot copies that so it never
  // runs ahead of the boundary it is supposed to sit above.
  const FILL_TRANSITION = "200ms ease-out";

  const VARIANTS = ["A", "B", "C", "D"];
  const VARIANT_LABELS = {
    A: "A — 24 px above",
    B: "B — inside the bar",
    C: "C — 16 px above",
    D: "D — 40 px above",
  };
  const HEIGHTS = { A: 24, C: 16, D: 40 };

  const STORE = {
    variant: "ofx-proto-issue21-variant",
    stateChange: "ofx-proto-issue21-state-change",
    dropLine: "ofx-proto-issue21-drop-line",
    percentage: "ofx-proto-issue21-percentage",
  };

  if (window.__ofxProto21) {
    window.__ofxProto21.destroy();
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
  // longer feed regeneration, so the dot reads the first fill alone.
  function fillFraction(bar) {
    const fill = bar.querySelector(".bg-malibu-blue");
    if (!fill) return null;
    const match = /scaleX\(\s*([-\d.e+]+)\s*\)/i.exec(fill.style.transform);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? clamp01(value) : null;
  }

  // ---------------------------------------------------------------- the drawing

  function plotY(x, plotHeight) {
    return (1 - shareOfBest(x)) * (plotHeight - INSET * 2) + INSET;
  }

  // The y axis is in pixels and the x axis stretches, so the drawing needs no
  // measurement and no resize code. `non-scaling-stroke` keeps the stretch off the
  // stroke width.
  function buildCurve(plotHeight) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 1000 ${plotHeight}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cssText = [
      "position:absolute",
      "inset:0",
      "width:100%",
      "height:100%",
      `filter:drop-shadow(${SHADOW_LINE})`,
    ].join(";");

    const points = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const x = i / SAMPLES;
      points.push(`${(x * 1000).toFixed(2)},${plotY(x, plotHeight).toFixed(2)}`);
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${points.join(" L")}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", VIOLET_CURVE);
    path.setAttribute("stroke-width", String(CURVE_WIDTH));
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(path);
    return svg;
  }

  // ---------------------------------------------------------------- one readout

  // `A`, `C` and `D` hang our own node off the cell that holds the bar. The cell is
  // exactly as wide as the bar, so a percentage left lands on the bar's own x axis.
  // The cell is `position: static`, so this sets `position: relative` on it and puts
  // it back on destroy. That is the one change we make to the game's elements.
  //
  // `B` hangs the same drawing inside the bar, which is already relative. The bar
  // hides its overflow, so nothing can leave it and the percentage has to sit over
  // the bar's own troop numbers.
  function mount(bar, variant, options) {
    const insideBar = variant === "B";
    const host = insideBar ? bar : bar.parentElement;
    if (!host) return null;

    const plotHeight = insideBar ? bar.clientHeight : HEIGHTS[variant];
    if (plotHeight < DOT_SIZE + 2) return null;

    const previousPosition = insideBar ? null : host.style.position;
    if (!insideBar) host.style.position = "relative";

    const root = document.createElement("div");
    root.className = "ofx-proto21-root";
    root.style.cssText = [
      "position:absolute",
      "left:0",
      "right:0",
      insideBar ? "top:0" : `top:${-plotHeight}px`,
      "bottom:0",
      "pointer-events:none",
      "z-index:6",
    ].join(";");

    // The drop line falls from the peak of the curve, through the bar, to its
    // bottom edge. It is the only reference mark on the drawing, and it also proves
    // that the curve and the bar share one x axis.
    const dropLine = document.createElement("div");
    dropLine.style.cssText = [
      "position:absolute",
      "top:0",
      "bottom:0",
      `left:${PEAK * 100}%`,
      `width:${DROP_WIDTH}px`,
      `margin-left:${-DROP_WIDTH / 2}px`,
      `background:${VIOLET_DROP}`,
      `box-shadow:${SHADOW_LINE}`,
    ].join(";");

    const plot = document.createElement("div");
    plot.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      "right:0",
      `height:${plotHeight}px`,
    ].join(";");

    const dot = document.createElement("div");
    dot.style.cssText = [
      "position:absolute",
      "box-sizing:border-box",
      `width:${DOT_SIZE}px`,
      `height:${DOT_SIZE}px`,
      "border-radius:50%",
      "transform:translate(-50%,-50%)",
      `box-shadow:${SHADOW_TEXT}`,
      `transition:left ${FILL_TRANSITION},top ${FILL_TRANSITION}`,
    ].join(";");

    // The measurements are the game's: 14 px, bold, tabular figures.
    const percentage = document.createElement("div");
    percentage.style.cssText = [
      "position:absolute",
      "top:0",
      "right:2px",
      "font-weight:700",
      "font-size:14px",
      "line-height:1",
      "font-variant-numeric:tabular-nums",
      `color:${VIOLET_CURVE}`,
      `text-shadow:${SHADOW_TEXT}`,
    ].join(";");

    plot.append(buildCurve(plotHeight), dot, percentage);
    root.append(dropLine, plot);
    host.appendChild(root);

    let observer = null;

    const readout = {
      bar,
      root,
      dropLine,
      dot,
      percentage,
      plotHeight,
      lastFraction: null,

      // Only the dot and the number move. Everything else is drawn once.
      update(fraction, force) {
        if (!force && fraction === this.lastFraction) return;
        this.lastFraction = fraction;

        const missing = fraction === null;
        this.dot.style.display = missing ? "none" : "block";
        this.percentage.textContent = missing
          ? ""
          : `${Math.round(shareOfBest(fraction) * 100)}%`;
        if (missing) return;

        this.dot.style.left = `${fraction * 100}%`;
        this.dot.style.top = `${plotY(fraction, this.plotHeight)}px`;

        const past = options.stateChange() && fraction > PEAK;
        this.dot.style.background = past ? "transparent" : VIOLET_DOT;
        this.dot.style.border = past ? `${RING_WIDTH}px solid ${VIOLET_DOT}` : "none";
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
        this.percentage.style.display = options.percentage() ? "block" : "none";
        this.update(this.lastFraction, true);
      },

      destroy() {
        observer?.disconnect();
        this.root.remove();
        if (previousPosition !== null) host.style.position = previousPosition;
      },
    };

    // The game rewrites the fill's inline transform on every tick. That write is the
    // only thing the dot has to follow, so an observer does the work of a redraw loop
    // and costs nothing between ticks.
    //
    // It watches the element that holds the two fills, never the bar itself. Variant
    // `B` puts our own dot inside the bar, and a watch on the bar would then see us
    // move the dot and call us again for no reason.
    observer = new MutationObserver(() => readout.refresh());
    observer.observe(bar.querySelector(".bg-malibu-blue")?.parentElement ?? bar, {
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
  let variant = read(STORE.variant, VARIANTS[0]);
  if (!VARIANTS.includes(variant)) variant = VARIANTS[0];

  const options = {
    stateChange: () => read(STORE.stateChange, "off") === "on",
    dropLine: () => read(STORE.dropLine, "on") === "on",
    percentage: () => read(STORE.percentage, "on") === "on",
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
      if (live.includes(bar) && readout.root.isConnected) continue;
      readout.destroy();
      readouts.delete(bar);
    }
    for (const bar of live) {
      if (readouts.has(bar)) continue;
      const readout = mount(bar, variant, options);
      if (readout) readouts.set(bar, readout);
    }
    // A safety net. The observer catches every write the game makes, and this
    // catches a fill the game replaced without a write.
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

  // Top of the screen on purpose. The readout under judgement sits at the bottom.
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

  function toggle(label, key, fallback) {
    const el = button("", () => {
      localStorage.setItem(key, read(key, fallback) === "on" ? "off" : "on");
      paint();
      for (const readout of readouts.values()) readout.applyOptions();
    });
    el.dataset.label = label;
    el.dataset.key = key;
    el.dataset.fallback = fallback;
    return el;
  }

  const variantLabel = document.createElement("span");
  variantLabel.style.cssText = "min-width:130px;text-align:center;font-weight:700";

  const toggles = [
    toggle("state change", STORE.stateChange, "off"),
    toggle("drop line", STORE.dropLine, "on"),
    toggle("percentage", STORE.percentage, "on"),
  ];

  const stats = {
    el: document.createElement("span"),
    last: "",
    render(fraction) {
      const text =
        fraction === null
          ? "no troop bar found"
          : `fill ${(fraction * 100).toFixed(1)}% · share ${(
              shareOfBest(fraction) * 100
            ).toFixed(1)}% · ${fraction > PEAK ? "past" : "below"} 42.2%`;
      if (text === this.last) return;
      this.last = text;
      this.el.textContent = text;
    },
  };
  stats.el.style.cssText =
    "opacity:.6;font-size:11px;min-width:250px;font-variant-numeric:tabular-nums";

  switcher.append(
    button("◀", () => step(-1)),
    variantLabel,
    button("▶", () => step(1)),
    ...toggles,
    stats.el,
  );

  function paint() {
    variantLabel.textContent = VARIANT_LABELS[variant];
    for (const el of toggles) {
      const on = read(el.dataset.key, el.dataset.fallback) === "on";
      el.textContent = `${el.dataset.label}: ${on ? "on" : "off"}`;
      el.style.background = on ? "#ff2bd1" : "#333";
      el.style.color = on ? "#111" : "#fff";
    }
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

  window.__ofxProto21 = {
    step,
    destroy() {
      clearInterval(timer);
      for (const readout of readouts.values()) readout.destroy();
      readouts.clear();
      switcher.remove();
      delete window.__ofxProto21;
    },
  };

  console.log("[ofx proto #21] loaded. window.__ofxProto21.destroy() removes it.");
})();
