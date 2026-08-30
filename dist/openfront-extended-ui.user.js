// ==UserScript==
// @name         OpenFront Extended UI
// @namespace    https://github.com/DeLoWaN/openfront-extended-ui
// @version      0.1.1
// @author       DeLoWaN
// @description  Adds readouts and an alliance view mode to the OpenFront.io game view. Changes nothing in the game.
// @license      MIT
// @homepage     https://github.com/DeLoWaN/openfront-extended-ui
// @homepageURL  https://github.com/DeLoWaN/openfront-extended-ui
// @supportURL   https://github.com/DeLoWaN/openfront-extended-ui/issues
// @downloadURL  https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist/openfront-extended-ui.user.js
// @updateURL    https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist/openfront-extended-ui.meta.js
// @include      http://localhost:9000/*
// @match        https://openfront.io/*
// @match        https://*.openfront.io/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	"use strict";
	var package_default = ":root,:host{--ofx-mark:#9d93f5;--ofx-figure:#c9c4ff;--ofx-shadow-figure:0 1px 1px #000000e6;--ofx-shadow-mark:0 0 2px #000000e6;--ofx-figure-size:13px}.ofx-hidden{display:none!important}.ofx-troop-strip{background:var(--ofx-mark);height:3px;box-shadow:var(--ofx-shadow-mark);pointer-events:none;position:absolute;bottom:0}.ofx-troop-share{color:var(--ofx-figure);font-size:var(--ofx-figure-size);font-variant-numeric:tabular-nums;text-shadow:var(--ofx-shadow-figure);pointer-events:none;align-items:center;font-weight:700;line-height:1;display:flex;position:absolute;top:0;bottom:0;right:5px}@media (width<64rem){.ofx-troop-share{display:none}}.ofx-alliance-clocks{z-index:50;pointer-events:none;position:fixed;inset:0;overflow:hidden}.ofx-alliance-clock{color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 0 3px #000000f2,0 0 3px #000000f2,0 0 3px #000000f2;pointer-events:none;font-weight:700;line-height:1;position:absolute;transform:translate(-50%)}.ofx-alliance-clock-urgent{color:#ff4d4d}";
	var PREFIX = "[openfront-extended-ui]";
	function logInfo(message, ...details) {
		console.info(PREFIX, message, ...details);
	}
	function logError(message, ...details) {
		console.error(PREFIX, message, ...details);
	}
	function matchesOption(value, whenUnset) {
		return typeof value === typeof whenUnset;
	}
	var STORAGE_KEY = "openfront-extended-ui:features";
	function optionKey(id, option) {
		return `${id}:${option}`;
	}
	function createSettings(store) {
		const stored = readStored(store);
		function save() {
			try {
				store.write(JSON.stringify(stored));
			} catch (error) {
				logError("could not save the settings", error);
			}
		}
		return {
			isEnabled(id) {
				const value = stored[id];
				return typeof value === "boolean" ? value : true;
			},
			setEnabled(id, value) {
				stored[id] = value;
				save();
			},
			optionValue(id, option, whenUnset) {
				const value = stored[optionKey(id, option)];
				return matchesOption(value, whenUnset) ? value : whenUnset;
			},
			setOptionValue(id, option, value) {
				stored[optionKey(id, option)] = value;
				save();
			}
		};
	}
	function localStorageStore(key = STORAGE_KEY) {
		return {
			read: () => localStorage.getItem(key),
			write: (value) => localStorage.setItem(key, value)
		};
	}
	function readStoredObject(store, report = () => {}) {
		let raw;
		try {
			raw = store.read();
		} catch (error) {
			report("could not be read", error);
			return {};
		}
		if (raw === null) return {};
		let parsed;
		try {
			parsed = JSON.parse(raw);
		} catch {
			report("are not valid JSON");
			return {};
		}
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			report("are not an object");
			return {};
		}
		return parsed;
	}
	function readStored(store) {
		const stored = readStoredObject(store, (problem, error) => logError(`the stored settings ${problem}, using the defaults`, error));
		const values = {};
		for (const [id, value] of Object.entries(stored)) if (typeof value === "boolean" || typeof value === "string") values[id] = value;
		return values;
	}
	var TICKS_PER_SECOND = 10;
	var EXTENSION_WINDOW_TICKS = 300;
	function readWeb(game, subjectID) {
		const subject = playerOrNull(game, subjectID);
		if (!subject) return null;
		const allies = readAllies(subject, subjectID);
		const expiry = readExpiry(game, subject);
		const window = renewalWindow(game);
		const coloured = new Set([subjectID]);
		const web = [];
		for (const [smallID, player] of allies) {
			coloured.add(smallID);
			const remainingTicks = expiry.get(player.id()) ?? null;
			web.push({
				player,
				smallID,
				remainingTicks,
				urgent: remainingTicks !== null && remainingTicks <= window
			});
		}
		return {
			subject,
			allies: web,
			coloured
		};
	}
	function formatClock(remainingTicks) {
		const seconds = Math.max(0, Math.floor(remainingTicks / TICKS_PER_SECOND));
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	}
	function readAllies(subject, subjectID) {
		let listed;
		try {
			listed = subject.allies();
		} catch {
			return new Map();
		}
		const allies = new Map();
		for (const ally of listed) {
			let smallID;
			try {
				smallID = ally.smallID();
			} catch {
				continue;
			}
			if (smallID === subjectID) continue;
			allies.set(smallID, ally);
		}
		return allies;
	}
	function readExpiry(game, subject) {
		const remaining = new Map();
		let alliances;
		try {
			alliances = subject.alliances() ?? [];
		} catch {
			return remaining;
		}
		const now = game.ticks();
		for (const alliance of alliances) remaining.set(alliance.other, Math.max(0, alliance.expiresAt - now));
		return remaining;
	}
	function renewalWindow(game) {
		try {
			const window = game.config().allianceExtensionPromptOffset();
			return window > 0 ? window : EXTENSION_WINDOW_TICKS;
		} catch {
			return EXTENSION_WINDOW_TICKS;
		}
	}
	function playerOrNull(game, smallID) {
		if (smallID === 0) return null;
		try {
			const player = game.playerBySmallID(smallID);
			return player.isPlayer() ? player : null;
		} catch {
			return null;
		}
	}
	var MARKER = "data-openfront-extended-ui";
	var HIDDEN = "ofx-hidden";
	function createStyleSheet(css) {
		const injected = new Map();
		return {
			injectInto(root) {
				if (injected.has(root)) return;
				const style = document.createElement("style");
				style.setAttribute(MARKER, "");
				style.textContent = css;
				styleHostOf(root).append(style);
				injected.set(root, style);
			},
			remove() {
				for (const style of injected.values()) style.remove();
				injected.clear();
			}
		};
	}
	function styleHostOf(root) {
		return root.nodeType === Node.DOCUMENT_NODE ? root.head : root;
	}
	var LAYER = "ofx-alliance-clocks";
	var CLOCK = "ofx-alliance-clock";
	var URGENT = "ofx-alliance-clock-urgent";
	var NAME_SCALE_FACTOR = .4;
	var NAME_SCALE_CAP = 3;
	var FONT_SIZE = 48;
	var FONT_BASE = 36;
	var CULL_THRESHOLD = .008;
	var CLOCK_PIXELS_PER_UNIT = 1.2;
	var CLOCK_DROP = .9;
	var OFF_SCREEN_MARGIN_PX = 100;
	function createClockLayer(host = document.body) {
		const root = document.createElement("div");
		root.className = LAYER;
		host.append(root);
		const pool = [];
		function nodeAt(index) {
			let node = pool[index];
			if (!node) {
				node = document.createElement("div");
				node.className = CLOCK;
				root.append(node);
				pool[index] = node;
			}
			return node;
		}
		function hideFrom(index) {
			for (let i = index; i < pool.length; i++) pool[i]?.classList.add(HIDDEN);
		}
		return {
			place(clocks, camera) {
				const viewWidth = window.innerWidth;
				const viewHeight = window.innerHeight;
				let placed = 0;
				for (const clock of clocks) {
					const units = nameUnits(clock.anchor.size);
					if (!isNameDrawn(units, camera.scale, viewWidth)) continue;
					const at = camera.worldToScreenCoordinates(clock.anchor);
					if (at.x < -100 || at.y < -100 || at.x > viewWidth + OFF_SCREEN_MARGIN_PX || at.y > viewHeight + OFF_SCREEN_MARGIN_PX) continue;
					const size = Math.min(28, units * camera.scale * CLOCK_PIXELS_PER_UNIT);
					const node = nodeAt(placed++);
					node.classList.remove(HIDDEN);
					node.classList.toggle(URGENT, clock.urgent);
					node.style.left = `${at.x}px`;
					node.style.top = `${at.y + size * CLOCK_DROP}px`;
					node.style.fontSize = `${size}px`;
					node.textContent = clock.text;
				}
				hideFrom(placed);
			},
			hide: () => hideFrom(0),
			remove() {
				root.remove();
				pool.length = 0;
			}
		};
	}
	function nameUnits(size) {
		const baseSize = Math.max(1, Math.floor(size));
		return Math.max(4, Math.floor(baseSize * NAME_SCALE_FACTOR)) * Math.min(baseSize * .25, NAME_SCALE_CAP);
	}
	function isNameDrawn(units, cameraScale, viewWidth) {
		if (viewWidth <= 0) return false;
		return units * FONT_BASE / FONT_SIZE * (2 * cameraScale / viewWidth) >= CULL_THRESHOLD;
	}
	var OWNER_MASK = 4095;
	function ownerUnderCursor(game, camera, screenX, screenY) {
		try {
			const cell = camera.screenToWorldCoordinates(screenX, screenY);
			if (!game.isValidCoord(cell.x, cell.y)) return 0;
			const tile = game.ref(cell.x, cell.y);
			if (!game.isLand(tile)) return 0;
			return game.tileState(tile) & OWNER_MASK;
		} catch {
			return 0;
		}
	}
	var BUILD_MENU = "build-menu";
	function mapHooksReader() {
		let menu = null;
		return () => {
			const view = window.__webglView;
			if (!view) return null;
			if (!menu?.isConnected) menu = document.querySelector(BUILD_MENU);
			const camera = menu?.transformHandler;
			if (!camera) return null;
			return {
				view,
				camera
			};
		};
	}
	var GAME_KEYBINDS_KEY = "settings.keybinds";
	var UNBOUND = "Null";
	var ALTERNATE_VIEW = "toggleView";
	var DEFAULTS = {
		toggleView: "Space",
		coordinateGrid: "KeyM",
		buildCity: "Digit1",
		buildFactory: "Digit2",
		buildPort: "Digit3",
		buildDefensePost: "Digit4",
		buildMissileSilo: "Digit5",
		buildSamLauncher: "Digit6",
		buildWarship: "Digit7",
		buildAtomBomb: "Digit8",
		buildHydrogenBomb: "Digit9",
		buildMIRV: "Digit0",
		attackRatioDown: "KeyT",
		attackRatioUp: "KeyY",
		boatAttack: "KeyB",
		groundAttack: "KeyG",
		retaliateAttack: "Shift+KeyR",
		requestAlliance: "KeyK",
		breakAlliance: "KeyL",
		swapDirection: "KeyU",
		zoomOut: "KeyQ",
		zoomIn: "KeyE",
		centerCamera: "KeyC",
		moveUp: "KeyW",
		moveLeft: "KeyA",
		moveDown: "KeyS",
		moveRight: "KeyD",
		buildMenuModifier: "ControlLeft",
		emojiMenuModifier: "AltLeft",
		shiftKey: "ShiftLeft",
		resetGfx: "KeyR",
		selectAllWarships: "KeyF",
		pauseGame: "KeyP",
		gameSpeedUp: "Period",
		gameSpeedDown: "Comma",
		altKey: "AltLeft"
	};
	function readGameKeybinds(store) {
		const merged = {
			...DEFAULTS,
			...stored(store)
		};
		for (const [action, binding] of Object.entries(merged)) if (binding === UNBOUND) delete merged[action];
		return {
			isBound(code) {
				if (code === "") return false;
				return Object.values(merged).some((binding) => keyOf(binding) === code);
			},
			alternateViewKey: () => keyOf(merged[ALTERNATE_VIEW] ?? "")
		};
	}
	function stored(store) {
		const bindings = {};
		for (const [action, value] of Object.entries(readStoredObject(store))) {
			const binding = flatten(value);
			if (binding !== null) bindings[action] = binding;
		}
		return bindings;
	}
	function flatten(value) {
		if (typeof value === "string") return value;
		if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
		if (typeof value === "object" && value !== null && "value" in value) return flatten(value.value);
		return null;
	}
	function keyOf(binding) {
		return binding.slice(binding.lastIndexOf("+") + 1);
	}
	var PALETTE_SIZE = 4096;
	var FILL_ALPHA = 150 / 255;
	var GREY = .22;
	function createPalette() {
		return new Float32Array(PALETTE_SIZE * 2 * 4);
	}
	function paintReal(palette, players) {
		palette.fill(0);
		for (const player of players) writeOwn(palette, player);
	}
	function paintAlliance(palette, players, coloured) {
		palette.fill(0);
		const greyBorder = .493;
		for (const player of players) {
			if (coloured.has(player.smallID())) {
				writeOwn(palette, player);
				continue;
			}
			writeSlot(palette, player.smallID(), [
				GREY,
				GREY,
				GREY
			], [
				greyBorder,
				greyBorder,
				greyBorder
			]);
		}
	}
	function writeOwn(palette, player) {
		writeSlot(palette, player.smallID(), toUnit(player.territoryColor()), toUnit(player.borderColor()));
	}
	function writeSlot(palette, smallID, fill, border) {
		const fillOffset = smallID * 4;
		palette[fillOffset] = fill[0];
		palette[fillOffset + 1] = fill[1];
		palette[fillOffset + 2] = fill[2];
		palette[fillOffset + 3] = FILL_ALPHA;
		const borderOffset = PALETTE_SIZE * 4 + smallID * 4;
		palette[borderOffset] = border[0];
		palette[borderOffset + 1] = border[1];
		palette[borderOffset + 2] = border[2];
		palette[borderOffset + 3] = 1;
	}
	function toUnit(colour) {
		const rgb = colour.toRgb();
		return [
			rgb.r / 255,
			rgb.g / 255,
			rgb.b / 255
		];
	}
	var HOLD_KEY_OPTION = "hold-key";
	var DEFAULT_HOLD_KEY = "Backquote";
	var REASSERT_FRAMES = 240;
	var MODAL_OPEN_OVERFLOW = "hidden";
	var NOTHING_COLOURED = new Set();
	var allianceView = {
		id: "alliance-view",
		name: "Alliance view mode",
		options: [{
			key: HOLD_KEY_OPTION,
			name: "Hold key",
			whenUnset: DEFAULT_HOLD_KEY
		}],
		attach(context) {
			const readHooks = mapHooksReader();
			const gameKeybinds = localStorageStore(GAME_KEYBINDS_KEY);
			const palette = createPalette();
			const clocks = createClockLayer();
			let holding = false;
			let alternateViewHeld = false;
			let subjectID = 0;
			let cursorX = 0;
			let cursorY = 0;
			let painted = false;
			let writtenSignature = "";
			let framesSinceWrite = 0;
			let frame = 0;
			let reportedClash = "";
			function engaged() {
				return holding && !alternateViewHeld && !modalOpen();
			}
			function modalOpen() {
				return document.body.style.overflow === MODAL_OPEN_OVERFLOW;
			}
			function holdKey() {
				const chosen = context.optionText(HOLD_KEY_OPTION).trim();
				return chosen === "" ? DEFAULT_HOLD_KEY : chosen;
			}
			function update(rewrite = false) {
				const hooks = readHooks();
				if (!hooks) return;
				if (!engaged()) {
					standDown(hooks);
					return;
				}
				const found = ownerUnderCursor(context.game, hooks.camera, cursorX, cursorY);
				if (found !== 0) subjectID = found;
				const web = subjectID === 0 ? null : readWeb(context.game, subjectID);
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
			function standDown(hooks) {
				clocks.hide();
				if (!painted) return;
				paintReal(palette, playersOf(context.game));
				hooks.view.updatePalette(palette);
				painted = false;
				writtenSignature = "";
			}
			function step() {
				frame = requestAnimationFrame(step);
				try {
					update(++framesSinceWrite >= REASSERT_FRAMES);
				} catch (error) {
					logError("the alliance view mode failed on a frame", error);
					release();
				}
			}
			function startLoop() {
				if (frame !== 0) return;
				frame = requestAnimationFrame(step);
			}
			function stopLoop() {
				if (frame === 0) return;
				cancelAnimationFrame(frame);
				frame = 0;
			}
			function release() {
				holding = false;
				alternateViewHeld = false;
				subjectID = 0;
				stopLoop();
				try {
					update();
				} catch (error) {
					logError("the alliance view mode could not restore the map", error);
				}
			}
			function onKeyDown(event) {
				if (event.repeat) return;
				const keybinds = readGameKeybinds(gameKeybinds);
				if (event.code === keybinds.alternateViewKey()) {
					alternateViewHeld = true;
					update();
					return;
				}
				const key = holdKey();
				if (event.code !== key) return;
				if (typingSomewhere()) return;
				if (keybinds.isBound(key)) {
					reportClash(key);
					return;
				}
				holding = true;
				startLoop();
				update();
			}
			function onKeyUp(event) {
				const keybinds = readGameKeybinds(gameKeybinds);
				if (event.code === keybinds.alternateViewKey()) {
					alternateViewHeld = false;
					update();
					return;
				}
				if (event.code !== holdKey()) return;
				release();
			}
			function onBlur() {
				if (!holding && !alternateViewHeld) return;
				release();
			}
			function onMouseMove(event) {
				cursorX = event.clientX;
				cursorY = event.clientY;
			}
			function reportClash(key) {
				if (reportedClash === key) return;
				reportedClash = key;
				logInfo(`the game binds ${key}, so the alliance view mode stays off. Pick another key with openfrontExtendedUi.setOption("alliance-view", "${HOLD_KEY_OPTION}", "KeyJ").`);
			}
			const capture = { capture: true };
			context.onWindowEvent("keydown", onKeyDown, capture);
			context.onWindowEvent("keyup", onKeyUp, capture);
			context.onWindowEvent("mousemove", onMouseMove, capture);
			context.onWindowEvent("blur", onBlur);
			context.onDetach(() => {
				stopLoop();
				const hooks = readHooks();
				if (hooks) standDown(hooks);
				clocks.remove();
			});
		}
	};
	function signatureOf(coloured) {
		return [...coloured].sort((a, b) => a - b).join(",");
	}
	function clocksOf(web) {
		if (!web) return [];
		const clocks = [];
		for (const ally of web.allies) {
			if (ally.remainingTicks === null) continue;
			const anchor = nameAnchor(ally.player);
			if (!anchor) continue;
			clocks.push({
				anchor,
				text: formatClock(ally.remainingTicks),
				urgent: ally.urgent
			});
		}
		return clocks;
	}
	function nameAnchor(player) {
		try {
			return player.nameLocation();
		} catch {
			return;
		}
	}
	function playersOf(game) {
		try {
			return game.players();
		} catch (error) {
			logError("could not read the players, so the map keeps its colours", error);
			return [];
		}
	}
	function typingSomewhere() {
		const focused = document.activeElement;
		if (!(focused instanceof HTMLElement)) return false;
		return focused.tagName === "INPUT" || focused.tagName === "TEXTAREA" || focused.isContentEditable;
	}
	function isMatchLive(game) {
		if (game.inSpawnPhase()) return false;
		const me = game.myPlayer();
		return me !== null && me.isAlive();
	}
	function injectedNodes(deps) {
		const drawings = new Map();
		function isInPage(drawn) {
			return deps.nodesOf(drawn).every((node) => node.isConnected);
		}
		function erase(drawn) {
			for (const node of deps.nodesOf(drawn)) node.remove();
		}
		return {
			sync() {
				let hosts;
				try {
					hosts = deps.findHosts();
				} catch (error) {
					logError("could not look for a place to draw", error);
					return [...drawings.values()];
				}
				for (const [host, drawn] of drawings) {
					if (hosts.includes(host)) continue;
					erase(drawn);
					drawings.delete(host);
				}
				for (const host of hosts) {
					const existing = drawings.get(host);
					if (existing && isInPage(existing)) continue;
					if (existing) erase(existing);
					const drawn = deps.draw(host);
					if (drawn === null) {
						drawings.delete(host);
						continue;
					}
					drawings.set(host, drawn);
				}
				return [...drawings.values()];
			},
			remove() {
				for (const drawn of drawings.values()) erase(drawn);
				drawings.clear();
			}
		};
	}
	function rate(internalTroops, internalMaxTroops) {
		return (10 + Math.pow(internalTroops, .73) / 4) * (1 - internalTroops / internalMaxTroops);
	}
	var REFERENCE_MAX_TROOPS = 1e6;
	var PLATEAU_SHARE = .95;
	function rateAtLevel(level) {
		return rate(level * REFERENCE_MAX_TROOPS, REFERENCE_MAX_TROOPS);
	}
	function clampToBar(level) {
		return Math.min(1, Math.max(0, level));
	}
	function findPeak() {
		let low = 0;
		let high = 1;
		for (let step = 0; step < 200; step++) {
			const third = (high - low) / 3;
			const left = low + third;
			const right = high - third;
			if (rateAtLevel(left) < rateAtLevel(right)) low = left;
			else high = right;
		}
		return (low + high) / 2;
	}
	var PEAK = findPeak();
	var BEST_RATE = rateAtLevel(PEAK);
	function shareOfBestRate(level) {
		return rateAtLevel(clampToBar(level)) / BEST_RATE;
	}
	function findCrossing(share, side) {
		let reaches = PEAK;
		let fallsShort = side === "below" ? 0 : 1;
		for (let step = 0; step < 100; step++) {
			const middle = (reaches + fallsShort) / 2;
			if (shareOfBestRate(middle) >= share) reaches = middle;
			else fallsShort = middle;
		}
		return (reaches + fallsShort) / 2;
	}
	var PLATEAU = {
		lo: findCrossing(PLATEAU_SHARE, "below"),
		hi: findCrossing(PLATEAU_SHARE, "above")
	};
	var TROOPS_FILL = ".bg-malibu-blue";
	var BAR_CLIPS = "overflow-hidden";
	function findTroopBars(panel) {
		const bars = [];
		for (const troops of panel.querySelectorAll(TROOPS_FILL)) {
			const bar = troops.parentElement?.parentElement;
			if (!bar?.classList.contains(BAR_CLIPS)) continue;
			bars.push(bar);
		}
		return bars;
	}
	function findFills(bar) {
		return bar.querySelector(TROOPS_FILL)?.parentElement ?? null;
	}
	var SCALE_X = /^\s*scaleX\(\s*([-\d.e+]+)\s*\)\s*$/i;
	function readTroopLevel(bar) {
		const troops = bar.querySelector(TROOPS_FILL);
		if (!troops) return null;
		const scale = SCALE_X.exec(troops.style.transform);
		if (!scale) return null;
		const level = Number(scale[1]);
		if (!Number.isFinite(level)) return null;
		return Math.min(1, Math.max(0, level));
	}
	var STRIP = "ofx-troop-strip";
	var SHARE = "ofx-troop-share";
	var PERCENTAGE_OPTION = "percentage";
	var troopBar = {
		id: "troop-bar",
		name: "Troop bar plateau",
		options: [{
			key: PERCENTAGE_OPTION,
			name: "Share of best rate",
			whenUnset: true
		}],
		attach(context) {
			const readouts = injectedNodes({
				findHosts: () => findTroopBars(context.panel),
				draw,
				nodesOf: (readout) => readout.nodes
			});
			context.onDetach(() => readouts.remove());
			return { tick() {
				if (!isMatchLive(context.game)) {
					readouts.remove();
					return;
				}
				const showShare = context.isOptionEnabled(PERCENTAGE_OPTION);
				for (const readout of readouts.sync()) update(readout, showShare);
			} };
		}
	};
	function draw(bar) {
		const fills = findFills(bar);
		if (!fills) return null;
		const strip = document.createElement("div");
		strip.className = STRIP;
		strip.style.left = `${PLATEAU.lo * 100}%`;
		strip.style.width = `${(PLATEAU.hi - PLATEAU.lo) * 100}%`;
		const share = document.createElement("div");
		share.className = SHARE;
		fills.after(strip, share);
		return {
			bar,
			strip,
			share,
			nodes: [strip, share]
		};
	}
	function update(readout, showShare) {
		const level = readTroopLevel(readout.bar);
		readout.share.textContent = level === null ? "" : `${Math.round(shareOfBestRate(level) * 100)}%`;
		readout.share.classList.toggle(HIDDEN, !showShare);
	}
	var FEATURES = [troopBar, allianceView];
	var BOUNDARY_POLL_MS = 500;
	function startLifecycle(deps) {
		const { panel, handlers } = deps;
		let seenGame = null;
		let currentGame = null;
		function checkBoundary() {
			const game = panel.game ?? null;
			if (game === seenGame) return;
			endMatch();
			seenGame = game;
			if (game) startMatch(game);
		}
		function startMatch(game) {
			currentGame = game;
			hookTick();
			handlers.onMatchStart(game);
		}
		function endMatch() {
			if (!currentGame) return;
			currentGame = null;
			unhookTick();
			handlers.onMatchEnd();
		}
		function hookTick() {
			const gameOwnTick = panel.tick;
			if (typeof gameOwnTick !== "function") {
				logError("the panel has no tick method, so no feature can follow a tick");
				return;
			}
			panel.tick = function patchedTick() {
				gameOwnTick.call(this);
				if (!this.game) return;
				try {
					handlers.onTick();
				} catch (error) {
					logError("a tick failed", error);
				}
			};
		}
		function unhookTick() {
			delete panel.tick;
		}
		const poll = setInterval(checkBoundary, BOUNDARY_POLL_MS);
		const onPageHide = () => {
			if (!currentGame) return;
			endMatch();
			seenGame = null;
		};
		const onLeaveLobby = () => endMatch();
		window.addEventListener("pagehide", onPageHide);
		document.addEventListener("leave-lobby", onLeaveLobby);
		return { stop() {
			clearInterval(poll);
			window.removeEventListener("pagehide", onPageHide);
			document.removeEventListener("leave-lobby", onLeaveLobby);
			endMatch();
		} };
	}
	function createFeatureContext(deps) {
		const cleanups = [];
		return {
			context: {
				game: deps.game,
				panel: deps.panel,
				isOptionEnabled: (option) => {
					const value = deps.optionValue(option);
					return typeof value === "boolean" ? value : false;
				},
				optionText: (option) => {
					const value = deps.optionValue(option);
					return typeof value === "string" ? value : "";
				},
				onGameEvent(type, handler) {
					const bus = deps.panel.eventBus;
					if (!bus) {
						logError("no event bus on the panel, so this listener never fires");
						return;
					}
					const guarded = (event) => {
						try {
							handler(event);
						} catch (error) {
							logError("a game event handler failed", error);
						}
					};
					bus.on(type, guarded);
					cleanups.push(() => bus.off(type, guarded));
				},
				onWindowEvent(type, handler, options) {
					const guarded = (event) => {
						try {
							handler(event);
						} catch (error) {
							logError("a window event handler failed", error);
						}
					};
					window.addEventListener(type, guarded, options);
					cleanups.push(() => window.removeEventListener(type, guarded, options));
				},
				onDetach(cleanup) {
					cleanups.push(cleanup);
				}
			},
			detach() {
				while (cleanups.length > 0) {
					const cleanup = cleanups.pop();
					try {
						cleanup?.();
					} catch (error) {
						logError("a cleanup failed on detach", error);
					}
				}
			}
		};
	}
	function createRegistry(deps) {
		const { features, settings } = deps;
		const attached = new Map();
		let currentMatch = null;
		function optionOf(feature, key) {
			return feature.options?.find((option) => option.key === key);
		}
		function featureOf(id) {
			return features.find((candidate) => candidate.id === id);
		}
		function attach(feature, match) {
			if (attached.has(feature.id)) return;
			const context = createFeatureContext({
				panel: match.panel,
				game: match.game,
				optionValue: (key) => {
					const option = optionOf(feature, key);
					if (!option) {
						logError(`the ${feature.id} feature asked for the option ${key}, which it does not declare`);
						return false;
					}
					return settings.optionValue(feature.id, key, option.whenUnset);
				}
			});
			let session = null;
			try {
				session = feature.attach(context.context) ?? null;
			} catch (error) {
				logError(`the ${feature.id} feature failed to start`, error);
				context.detach();
				return;
			}
			attached.set(feature.id, {
				context,
				session
			});
		}
		function detach(id) {
			const attachment = attached.get(id);
			if (!attachment) return;
			attached.delete(id);
			attachment.context.detach();
		}
		return {
			features,
			attachAll(match) {
				currentMatch = match;
				for (const feature of features) if (settings.isEnabled(feature.id)) attach(feature, match);
			},
			detachAll() {
				currentMatch = null;
				for (const id of [...attached.keys()]) detach(id);
			},
			tickAll() {
				for (const feature of features) {
					const session = attached.get(feature.id)?.session;
					if (!session?.tick) continue;
					try {
						session.tick();
					} catch (error) {
						logError(`the ${feature.id} feature failed on a tick`, error);
					}
				}
			},
			isEnabled: (id) => settings.isEnabled(id),
			optionsOf(id) {
				return (featureOf(id)?.options ?? []).map((option) => ({
					...option,
					value: settings.optionValue(id, option.key, option.whenUnset)
				}));
			},
			setOption(id, option, value) {
				const feature = featureOf(id);
				const declared = feature && optionOf(feature, option);
				if (!declared) return;
				if (!matchesOption(value, declared.whenUnset)) {
					logError(`the ${option} option of ${id} takes a ${typeof declared.whenUnset}, not a ${typeof value}`);
					return;
				}
				settings.setOptionValue(id, option, value);
			},
			setEnabled(id, enabled) {
				const feature = featureOf(id);
				if (!feature) return;
				settings.setEnabled(id, enabled);
				if (enabled) {
					if (currentMatch) attach(feature, currentMatch);
				} else detach(id);
			}
		};
	}
	function start(deps) {
		const registry = createRegistry({
			features: deps.features,
			settings: deps.settings
		});
		const styles = createStyleSheet(deps.css);
		styles.injectInto(document);
		const lifecycle = startLifecycle({
			panel: deps.panel,
			handlers: {
				onMatchStart: (game) => registry.attachAll({
					panel: deps.panel,
					game
				}),
				onMatchEnd: () => registry.detachAll(),
				onTick: () => registry.tickAll()
			}
		});
		return {
			registry,
			stop() {
				lifecycle.stop();
				styles.remove();
			}
		};
	}
	function createConsoleHandle(deps) {
		return {
			list: () => deps.registry.features.map((feature) => ({
				id: feature.id,
				name: feature.name,
				enabled: deps.registry.isEnabled(feature.id),
				options: deps.registry.optionsOf(feature.id).map((option) => ({
					key: option.key,
					name: option.name,
					value: option.value
				}))
			})),
			enable: (id) => deps.registry.setEnabled(id, true),
			disable: (id) => deps.registry.setEnabled(id, false),
			setOption: (id, option, value) => deps.registry.setOption(id, option, value),
			stop: () => deps.stop()
		};
	}
	var PANEL = "control-panel";
	var HANDLE = "openfrontExtendedUi";
	async function main() {
		window[HANDLE]?.stop();
		await customElements.whenDefined(PANEL);
		const panel = document.querySelector(PANEL);
		if (!panel) {
			logError(`no <${PANEL}> in the page, so there is nothing to attach to`);
			return;
		}
		const pkg = start({
			panel,
			features: FEATURES,
			settings: createSettings(localStorageStore()),
			css: package_default
		});
		window[HANDLE] = createConsoleHandle({
			registry: pkg.registry,
			stop() {
				pkg.stop();
				delete window[HANDLE];
			}
		});
		logInfo(`ready. window.${HANDLE}.list() shows what can be switched off.`);
	}
	main().catch((error) => logError("could not start", error));
})();
