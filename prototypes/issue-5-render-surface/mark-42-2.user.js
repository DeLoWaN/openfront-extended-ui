// ==UserScript==
// @name         PROTOTYPE — OpenFront 42.2% mark (issue #5)
// @namespace    openfront-extended-ui-prototype
// @version      0.0.1
// @description  Throwaway. Draws the 42.2% troop mark three ways so they can be compared on screen.
// @match        https://openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// THROWAWAY PROTOTYPE — answers issue #5, then dies. Do not import, do not extend.
//
// VERDICT: D. Draw our own nodes inside the game's HUD. See issue #5 for the reasons.
//
// Four variants of the same 42.2% mark on the troop bar, switched from a floating
// bar at the top of the screen:
//
//   A  in place  — the mark is a child of the game's own troop bar element
//   B  overlay   — the mark is an independent layer on the body, placed by measurement
//   C  both      — A in white and B in magenta at once, so drift shows as a gap
//   D  sibling   — our own node one level up from the bar, still inside the HUD
//
// D exists because A and B turned out not to be the real choice. The bar sets
// `overflow: hidden`, so A cannot draw above it. Every ancestor of the bar sets
// `overflow: visible`, so a sibling can. D therefore draws outside the bar without
// leaving the game's HUD, and keeps everything the browser gives A for free.
//
// UI.md asks for a `?variant=` URL parameter. A reload drops you out of the match,
// so the choice lives in localStorage instead and the bar cycles it on click.
// Arrow keys belong to the game, so this binds no keys at all.

(() => {
  "use strict";

  const MARK_RATIO = 0.422;
  const STORE_KEY = "ofx-proto-issue5-variant";
  const VARIANTS = ["A", "B", "C", "D"];
  const VARIANT_NAMES = {
    A: "In place",
    B: "Own layer",
    C: "Both at once",
    D: "Sibling in the HUD",
  };
  const COLOR_IN_PLACE = "#ffffff";
  const COLOR_OVERLAY = "#ff2bd1";
  const COLOR_SIBLING = "#7cfc00";

  if (window.__ofxProto5) {
    window.__ofxProto5.destroy();
  }

  // ---------------------------------------------------------------- finding the bar

  // The troop bar is the grandparent of the blue fill. Both the mobile copy and the
  // desktop copy are always in the page; the hidden one measures 0 by 0.
  function findTroopBars() {
    const panel = document.querySelector("control-panel");
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(".bg-malibu-blue"))
      .map((fill) => fill.parentElement && fill.parentElement.parentElement)
      .filter(
        (bar) => bar instanceof HTMLElement && bar.classList.contains("overflow-hidden"),
      );
  }

  function isOnScreen(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // ---------------------------------------------------------------- A: in place

  // One absolutely positioned child per bar. The bar is already `position: relative`,
  // so a percentage left needs no measurement and no resize handling.
  const inPlace = {
    marks: new Set(),
    timer: null,
    injections: 0,

    start() {
      this.sync();
      this.timer = setInterval(() => this.sync(), 500);
    },

    sync() {
      for (const bar of findTroopBars()) {
        if (bar.querySelector(":scope > .ofx-proto-inplace")) continue;
        const mark = document.createElement("div");
        mark.className = "ofx-proto-inplace";
        mark.style.cssText = [
          "position:absolute",
          "top:0",
          "bottom:0",
          `left:${MARK_RATIO * 100}%`,
          "width:2px",
          `background:${COLOR_IN_PLACE}`,
          "box-shadow:0 0 2px rgba(0,0,0,.9)",
          "pointer-events:none",
          "z-index:5",
        ].join(";");
        bar.appendChild(mark);
        this.marks.add(mark);
        this.injections++;
        stats.render();
      }
    },

    stop() {
      clearInterval(this.timer);
      for (const mark of this.marks) mark.remove();
      this.marks.clear();
    },
  };

  // ---------------------------------------------------------------- B: own layer

  // A fixed layer on the body. The mark's place comes from measuring the bar, so it
  // has to be re-measured whenever anything moves it. A ResizeObserver is not enough:
  // the notification row above the bar shifts the bar without resizing it. So this
  // measures every frame and only writes when the numbers change.
  const overlay = {
    root: null,
    mark: null,
    frame: null,
    last: "",
    measurements: 0,
    writes: 0,

    start() {
      this.root = document.createElement("div");
      this.root.id = "ofx-proto-overlay";
      this.root.style.cssText = [
        "position:fixed",
        "inset:0",
        "pointer-events:none",
        "z-index:2147483000",
      ].join(";");

      this.mark = document.createElement("div");
      this.mark.style.cssText = [
        "position:absolute",
        "width:2px",
        `background:${COLOR_OVERLAY}`,
        "box-shadow:0 0 2px rgba(0,0,0,.9)",
        "display:none",
      ].join(";");

      this.root.appendChild(this.mark);
      document.body.appendChild(this.root);
      this.loop();
    },

    loop() {
      this.frame = requestAnimationFrame(() => this.loop());
      this.measurements++;

      const bar = findTroopBars().find(isOnScreen);
      if (!bar) {
        this.hide();
        return;
      }

      const rect = bar.getBoundingClientRect();
      const key = `${rect.left}|${rect.top}|${rect.width}|${rect.height}`;
      if (key === this.last) return;
      this.last = key;
      this.writes++;

      this.mark.style.display = "block";
      this.mark.style.left = `${rect.left + rect.width * MARK_RATIO}px`;
      this.mark.style.top = `${rect.top}px`;
      this.mark.style.height = `${rect.height}px`;
      stats.render();
    },

    hide() {
      if (this.mark.style.display === "none") return;
      this.mark.style.display = "none";
      this.last = "";
    },

    stop() {
      cancelAnimationFrame(this.frame);
      this.root.remove();
    },
  };

  // ---------------------------------------------------------------- D: sibling in the HUD

  // Our own node, one level above the bar, inside the HUD. The cell that holds the
  // bar is exactly as wide as the bar, so a percentage left lands in the same place
  // as variant A and still needs no measurement. Nothing clips it, so it can carry a
  // label above the bar, which is the one thing variant A cannot do.
  //
  // The cell is `position: static`, so this sets `position: relative` on it. That is
  // a change to one of the game's own elements. It adds no layout of its own.
  const sibling = {
    nodes: new Set(),
    timer: null,
    injections: 0,

    start() {
      this.sync();
      this.timer = setInterval(() => this.sync(), 500);
    },

    sync() {
      for (const bar of findTroopBars()) {
        const cell = bar.parentElement;
        if (!cell || cell.querySelector(":scope > .ofx-proto-sibling")) continue;
        cell.style.position = "relative";

        const group = document.createElement("div");
        group.className = "ofx-proto-sibling";
        group.style.cssText = [
          "position:absolute",
          "top:0",
          "bottom:0",
          `left:${MARK_RATIO * 100}%`,
          "pointer-events:none",
          "z-index:6",
        ].join(";");

        const line = document.createElement("div");
        line.style.cssText = `position:absolute;top:0;bottom:0;width:2px;background:${COLOR_SIBLING};box-shadow:0 0 2px rgba(0,0,0,.9)`;

        const tag = document.createElement("div");
        tag.textContent = "42.2%";
        tag.style.cssText = `position:absolute;bottom:100%;margin-bottom:2px;transform:translateX(-50%);font:10px system-ui;color:#000;background:${COLOR_SIBLING};padding:1px 3px;border-radius:2px;white-space:nowrap`;

        group.append(line, tag);
        cell.appendChild(group);
        this.nodes.add(group);
        this.injections++;
        stats.render();
      }
    },

    stop() {
      clearInterval(this.timer);
      for (const node of this.nodes) node.remove();
      this.nodes.clear();
    },
  };

  // ---------------------------------------------------------------- test harness

  // The game's own notification row pushes the whole panel down. Waiting for one is
  // slow, so this fakes the same shift on demand. It goes into the static wrapper
  // from index.html, never into anything Lit renders.
  let nudge = null;
  function toggleNudge() {
    if (nudge) {
      nudge.remove();
      nudge = null;
      return;
    }
    const panel = document.querySelector("control-panel");
    if (!panel || !panel.parentElement) return;
    nudge = document.createElement("div");
    nudge.textContent = "fake notification row";
    nudge.style.cssText =
      "padding:6px;font:11px system-ui;color:#fca5a5;background:rgba(239,68,68,.15);text-align:center";
    panel.parentElement.insertBefore(nudge, panel);
  }

  // ---------------------------------------------------------------- switcher

  // Top of the screen on purpose. The HUD being judged sits at the bottom.
  const bar = document.createElement("div");
  bar.style.cssText = [
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

  const label = document.createElement("span");
  label.style.cssText = "min-width:150px;text-align:center;font-weight:700";

  const stats = {
    el: document.createElement("span"),
    render() {
      this.el.textContent = `in place: ${inPlace.injections} injected · layer: ${overlay.writes}/${overlay.measurements} frames written`;
    },
  };
  stats.el.style.cssText = "opacity:.6;font-size:11px";

  bar.append(
    button("◀", () => step(-1)),
    label,
    button("▶", () => step(1)),
    button("nudge layout", toggleNudge),
    stats.el,
  );

  let current = localStorage.getItem(STORE_KEY) || "A";
  if (!VARIANTS.includes(current)) current = "A";

  function apply(next) {
    if (inPlace.timer) inPlace.stop();
    if (overlay.root) overlay.stop();
    if (sibling.timer) sibling.stop();
    inPlace.timer = null;
    overlay.root = null;
    sibling.timer = null;

    current = next;
    localStorage.setItem(STORE_KEY, next);
    label.textContent = `${next} — ${VARIANT_NAMES[next]}`;

    if (next === "A" || next === "C") inPlace.start();
    if (next === "B" || next === "C") overlay.start();
    if (next === "D") sibling.start();
    stats.render();
  }

  function step(delta) {
    const index = VARIANTS.indexOf(current);
    apply(VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length]);
  }

  document.body.appendChild(bar);
  apply(current);

  window.__ofxProto5 = {
    apply,
    destroy() {
      if (inPlace.timer) inPlace.stop();
      if (overlay.root) overlay.stop();
      if (sibling.timer) sibling.stop();
      if (nudge) nudge.remove();
      bar.remove();
      delete window.__ofxProto5;
    },
  };

  console.log("[ofx proto #5] loaded. window.__ofxProto5.destroy() removes it.");
})();
