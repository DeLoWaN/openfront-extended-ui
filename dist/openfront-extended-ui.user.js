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
	var package_default = ":root,:host{--ofx-mark:#9d93f5;--ofx-figure:#c9c4ff;--ofx-shadow-figure:0 1px 1px #000000e6;--ofx-shadow-mark:0 0 2px #000000e6;--ofx-figure-size:13px;--ofx-cue:#fbbf24;--ofx-cue-wash:#fbbf242e;--ofx-cue-glow:#fbbf248c;--ofx-cue-waiting:#9ca3af;--ofx-cue-rail:#374151;--ofx-hotbar-marks-height:7px}.ofx-hidden{display:none!important}.ofx-troop-strip{background:var(--ofx-mark);height:3px;box-shadow:var(--ofx-shadow-mark);pointer-events:none;position:absolute;bottom:0}.ofx-troop-share{color:var(--ofx-figure);font-size:var(--ofx-figure-size);font-variant-numeric:tabular-nums;text-shadow:var(--ofx-shadow-figure);pointer-events:none;align-items:center;font-weight:700;line-height:1;display:flex;position:absolute;top:0;bottom:0;right:5px}@media (width<64rem){.ofx-troop-share{display:none}}.ofx-alliance-clocks{z-index:50;pointer-events:none;position:fixed;inset:0;overflow:hidden}.ofx-spawn-marks{z-index:50;pointer-events:none;width:100vw;height:100vh;position:fixed;inset:0}.ofx-alliance-clock{color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 0 3px #000000f2,0 0 3px #000000f2,0 0 3px #000000f2;pointer-events:none;font-weight:700;line-height:1;position:absolute;transform:translate(-50%)}.ofx-alliance-clock-urgent{color:#ff4d4d}.ofx-hotbar-marks{height:var(--ofx-hotbar-marks-height);pointer-events:none;justify-content:center;align-items:center;gap:2px;display:flex}.ofx-hotbar-marks-off{visibility:hidden}.ofx-hotbar-mark{background:var(--ofx-cue-rail);border-radius:1px;width:7px;height:3px}.ofx-hotbar-mark-lit{background:var(--ofx-cue-waiting)}.ofx-hotbar-marks-ready .ofx-hotbar-mark-lit{background:var(--ofx-cue)}.ofx-hotbar-light{top:0;right:0;bottom:var(--ofx-hotbar-marks-height);background:var(--ofx-cue-wash);box-shadow:inset 0 0 0 1px var(--ofx-cue), 0 0 6px var(--ofx-cue-glow);opacity:0;pointer-events:none;border-radius:2px;position:absolute;left:0}@keyframes ofx-hotbar-onset{0%{opacity:1}6%{opacity:.3}12%{opacity:1}18%{opacity:.3}24%{opacity:1}30%{opacity:.3}36%{opacity:.92}48%{opacity:.28}61%{opacity:.8}80%{opacity:.26}to{opacity:.7}}@keyframes ofx-hotbar-breathe{0%,to{opacity:.7}50%{opacity:.25}}.ofx-hotbar-light-breathing{animation:3.3s ease-in-out both ofx-hotbar-onset,2s ease-in-out 3.3s infinite ofx-hotbar-breathe}.ofx-hotbar-light-steady{animation:3.3s ease-in-out forwards ofx-hotbar-onset}@media (prefers-reduced-motion:reduce){.ofx-hotbar-light-breathing{animation:3.3s ease-in-out forwards ofx-hotbar-onset}}";
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
		const coloured = new Set([subjectID, ...readTeammates$1(game, subject)]);
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
	function readTeammates$1(game, subject) {
		let players;
		try {
			players = game.players();
		} catch {
			return [];
		}
		const teammates = [];
		for (const player of players) try {
			if (subject.isOnSameTeam(player)) teammates.push(player.smallID());
		} catch {
			continue;
		}
		return teammates;
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
	var LAYER$1 = "ofx-alliance-clocks";
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
		root.className = LAYER$1;
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
	var OWN_SATURATION = .25;
	var FILL_LIGHTNESS = {
		base: .14,
		range: .22
	};
	var BORDER_LIGHTNESS = {
		base: .34,
		range: .22
	};
	var SHARED_GREY_SHARE = .5;
	function createPalette() {
		return new Float32Array(PALETTE_SIZE * 2 * 4);
	}
	function paintReal(palette, players) {
		palette.fill(0);
		for (const player of players) writeOwn(palette, player);
	}
	function paintAlliance(palette, players, coloured) {
		palette.fill(0);
		for (const player of players) {
			if (coloured.has(player.smallID())) {
				writeOwn(palette, player);
				continue;
			}
			const grey = greyOf(player.territoryColor());
			writeSlot(palette, player.smallID(), grey.fill, grey.border);
		}
	}
	function greyOf(colour) {
		const [hue, saturation, lightness] = toHsl(toUnit(colour));
		const ownSaturation = saturation * OWN_SATURATION;
		const greyBorder = .493;
		const ownFill = fromHsl(hue, ownSaturation, FILL_LIGHTNESS.base + FILL_LIGHTNESS.range * lightness);
		const ownBorder = fromHsl(hue, ownSaturation, BORDER_LIGHTNESS.base + BORDER_LIGHTNESS.range * lightness);
		return {
			fill: towards(ownFill, GREY, SHARED_GREY_SHARE),
			border: towards(ownBorder, greyBorder, SHARED_GREY_SHARE)
		};
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
	function towards(rgb, grey, share) {
		return [
			rgb[0] + (grey - rgb[0]) * share,
			rgb[1] + (grey - rgb[1]) * share,
			rgb[2] + (grey - rgb[2]) * share
		];
	}
	function toHsl([r, g, b]) {
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const lightness = (max + min) / 2;
		const chroma = max - min;
		if (chroma === 0) return [
			0,
			0,
			lightness
		];
		const saturation = chroma / (1 - Math.abs(2 * lightness - 1));
		let hue;
		if (max === r) hue = (g - b) / chroma % 6;
		else if (max === g) hue = (b - r) / chroma + 2;
		else hue = (r - g) / chroma + 4;
		hue *= 60;
		return [
			hue < 0 ? hue + 360 : hue,
			saturation,
			lightness
		];
	}
	function fromHsl(hue, saturation, lightness) {
		const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
		const x = chroma * (1 - Math.abs(hue / 60 % 2 - 1));
		const m = lightness - chroma / 2;
		const sector = Math.floor(hue / 60) % 6;
		const [r, g, b] = [
			[
				chroma,
				x,
				0
			],
			[
				x,
				chroma,
				0
			],
			[
				0,
				chroma,
				x
			],
			[
				0,
				x,
				chroma
			],
			[
				x,
				0,
				chroma
			],
			[
				chroma,
				0,
				x
			]
		][sector];
		return [
			r + m,
			g + m,
			b + m
		];
	}
	var TERRAIN_KEYS = [
		"oceanColor",
		"sandColor",
		"plainsColor",
		"highlandColor",
		"mountainColor"
	];
	var OWN_COLOUR_SHARE = .15;
	var GREY_BRIGHTNESS = .42;
	var BLUE_LIFT = 1.08;
	function createTerrainShade() {
		let dimmedView = null;
		let original = null;
		let written = null;
		return {
			dim(view) {
				const terrain = view.getSettings().terrain;
				if (!terrain) return;
				if (dimmedView === view && written && sameColours(terrain, written)) return;
				original = copyColours(terrain);
				written = greyTerrain(original);
				Object.assign(terrain, written);
				dimmedView = view;
				view.rebuildTerrain();
			},
			restore() {
				if (!dimmedView || !original || !written) return;
				const terrain = dimmedView.getSettings().terrain;
				if (terrain && sameColours(terrain, written)) {
					Object.assign(terrain, original);
					dimmedView.rebuildTerrain();
				}
				dimmedView = null;
				original = null;
				written = null;
			}
		};
	}
	function greyTerrain(colours) {
		const grey = copyColours(colours);
		for (const key of TERRAIN_KEYS) {
			const rgb = parseHex(colours[key]);
			if (!rgb) continue;
			const level = (.299 * rgb[0] + .587 * rgb[1] + .114 * rgb[2]) * GREY_BRIGHTNESS;
			const target = [
				level,
				level,
				Math.min(255, level * BLUE_LIFT)
			];
			grey[key] = toHex(rgb.map((channel, i) => channel * OWN_COLOUR_SHARE + target[i] * .85));
		}
		return grey;
	}
	function copyColours(colours) {
		return {
			oceanColor: colours.oceanColor,
			sandColor: colours.sandColor,
			plainsColor: colours.plainsColor,
			highlandColor: colours.highlandColor,
			mountainColor: colours.mountainColor
		};
	}
	function sameColours(a, b) {
		return TERRAIN_KEYS.every((key) => a[key] === b[key]);
	}
	function parseHex(value) {
		const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
		if (!match) return null;
		return [
			parseInt(match[1], 16),
			parseInt(match[2], 16),
			parseInt(match[3], 16)
		];
	}
	function toHex(rgb) {
		return `#${rgb.map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("")}`;
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
			const terrain = createTerrainShade();
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
				terrain.dim(hooks.view);
				clocks.place(clocksOf(web), hooks.camera);
			}
			function standDown(hooks) {
				clocks.hide();
				terrain.restore();
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
				terrain.restore();
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
	var HOTBAR = "unit-display";
	var ITEM_IS_POSITIONED = "relative";
	var CUED_ICONS = [
		{
			type: "City",
			icon: "city"
		},
		{
			type: "Factory",
			icon: "factory"
		},
		{
			type: "Port",
			icon: "port"
		}
	];
	function findHotbars() {
		return [...document.querySelectorAll(HOTBAR)];
	}
	function findIconItem(hotbar, icon) {
		const item = hotbar.querySelector(`img[alt="${icon}"]`)?.parentElement?.parentElement?.parentElement;
		if (!item?.classList.contains(ITEM_IS_POSITIONED)) return null;
		return item;
	}
	function readCost(hotbar, type) {
		const priced = hotbar.playerBuildables?.find((item) => item.type === type);
		if (typeof priced?.cost !== "bigint") return null;
		return priced.cost;
	}
	var FIRST_PRICE = 125e3;
	function priceStep(cost) {
		const price = Number(cost);
		if (price < FIRST_PRICE || price >= Number(1000000n)) return null;
		const step = 1 + Math.log2(price / FIRST_PRICE);
		return Number.isInteger(step) ? step : null;
	}
	var LIGHT = "ofx-hotbar-light";
	var LIGHT_BREATHING = "ofx-hotbar-light-breathing";
	var LIGHT_STEADY = "ofx-hotbar-light-steady";
	var MARKS = "ofx-hotbar-marks";
	var MARKS_OFF = "ofx-hotbar-marks-off";
	var MARKS_READY = "ofx-hotbar-marks-ready";
	var MARK = "ofx-hotbar-mark";
	var MARK_LIT = "ofx-hotbar-mark-lit";
	var BREATHING_OPTION = "breathing";
	var hotbarReadout = {
		id: "hotbar",
		name: "Hotbar cheap window",
		options: [{
			key: BREATHING_OPTION,
			name: "Breathing pulse",
			whenUnset: true
		}],
		attach(context) {
			const readouts = injectedNodes({
				findHosts: findHotbars,
				draw: draw$1,
				nodesOf: (readout) => readout.nodes
			});
			context.onDetach(() => readouts.remove());
			return { tick() {
				const me = context.game.myPlayer();
				if (!isMatchLive(context.game) || !me) {
					readouts.remove();
					return;
				}
				const gold = me.gold();
				const breathing = context.isOptionEnabled(BREATHING_OPTION);
				for (const readout of readouts.sync()) for (const cue of readout.cues) update$1(cue, readout.hotbar, gold, breathing);
			} };
		}
	};
	function draw$1(hotbar) {
		const cues = [];
		const nodes = [];
		for (const cued of CUED_ICONS) {
			const item = findIconItem(hotbar, cued.icon);
			if (!item) continue;
			const light = document.createElement("div");
			light.className = LIGHT;
			const marks = document.createElement("div");
			marks.className = `${MARKS} ${MARKS_OFF}`;
			const steps = [];
			for (let step = 0; step < 3; step++) {
				const mark = document.createElement("div");
				mark.className = MARK;
				marks.append(mark);
				steps.push(mark);
			}
			item.append(light, marks);
			cues.push({
				type: cued.type,
				light,
				marks,
				steps
			});
			nodes.push(light, marks);
		}
		if (cues.length === 0) return null;
		return {
			hotbar,
			cues,
			nodes
		};
	}
	function update$1(cue, hotbar, gold, breathing) {
		const cost = readCost(hotbar, cue.type);
		const step = cost === null ? null : priceStep(cost);
		const ready = step !== null && cost !== null && cost <= gold;
		cue.marks.classList.toggle(MARKS_OFF, step === null);
		cue.marks.classList.toggle(MARKS_READY, ready);
		cue.steps.forEach((mark, index) => {
			mark.classList.toggle(MARK_LIT, step !== null && index < step);
		});
		setLight(cue.light, ready ? step : null, breathing);
	}
	function setLight(light, step, breathing) {
		const wanted = breathing ? LIGHT_BREATHING : LIGHT_STEADY;
		if (step === null) {
			delete light.dataset.ofxLit;
			light.classList.remove(LIGHT_BREATHING, LIGHT_STEADY);
			return;
		}
		const lit = String(step);
		if (light.dataset.ofxLit === lit && light.classList.contains(wanted)) return;
		light.dataset.ofxLit = lit;
		light.classList.remove(LIGHT_BREATHING, LIGHT_STEADY);
		light.offsetWidth;
		light.classList.add(wanted);
	}
	var REFERENCE_SCALE = .864;
	var MIN_UNIT = .35;
	var RING_RADIUS_PX = 16;
	var BREATH_PX = 2;
	var BREATH_SPEED = .006;
	var NAME_FONT_PX = 12;
	var NAME_FONT_FLOOR_PX = 11;
	var NAME_GAP_PX = 8;
	var RING_STROKE_PX = 3;
	var EDGE_MARGIN_PX = {
		left: 60,
		right: 60,
		top: 60,
		bottom: 150
	};
	function markUnit(cameraScale) {
		return Math.max(MIN_UNIT, Math.min(4, cameraScale / REFERENCE_SCALE));
	}
	function ringRadius(unit) {
		return RING_RADIUS_PX * unit;
	}
	function breathOffset(nowMs) {
		return BREATH_PX * Math.sin(nowMs * BREATH_SPEED);
	}
	function ringStrokePx(unit) {
		return RING_STROKE_PX * Math.max(1, unit * .8);
	}
	function nameFontPx(unit) {
		return Math.max(NAME_FONT_FLOOR_PX, NAME_FONT_PX * unit);
	}
	function nameBaseline(unit) {
		return ringRadius(unit) + NAME_GAP_PX;
	}
	function placePointers(offScreen, view) {
		const left = EDGE_MARGIN_PX.left;
		const top = EDGE_MARGIN_PX.top;
		const right = Math.max(left, view.width - EDGE_MARGIN_PX.right);
		const bottom = Math.max(top, view.height - EDGE_MARGIN_PX.bottom);
		const centreX = view.width / 2;
		const centreY = view.height / 2;
		const pointers = [];
		for (const mark of offScreen) {
			const dx = mark.x - centreX;
			const dy = mark.y - centreY;
			const reach = Math.min(dx > 0 ? (right - centreX) / dx : dx < 0 ? (left - centreX) / dx : Infinity, dy > 0 ? (bottom - centreY) / dy : dy < 0 ? (top - centreY) / dy : Infinity);
			const k = Number.isFinite(reach) ? Math.max(0, reach) : 0;
			const x = centreX + dx * k;
			const y = centreY + dy * k;
			const near = pointers.find((pointer) => Math.hypot(pointer.x - x, pointer.y - y) < 70);
			if (near) near.count++;
			else pointers.push({
				x,
				y,
				angle: Math.atan2(dy, dx),
				count: 1,
				colour: mark.colour
			});
		}
		return pointers;
	}
	var LAYER = "ofx-spawn-marks";
	var OUTLINE = "rgba(0,0,0,0.85)";
	var TEXT_OUTLINE = "rgba(0,0,0,0.9)";
	var OUTLINE_EXTRA_PX = 4;
	var CHEVRON_SCALE = 2.4;
	var CHEVRON = [
		[14, 0],
		[-8, -11],
		[-3, 0],
		[-8, 11]
	];
	var COUNT_BACK = 22;
	var COUNT_FONT = 13;
	var FONT_FAMILY = "system-ui, sans-serif";
	function createMarkLayer(host = document.body) {
		const canvas = document.createElement("canvas");
		canvas.className = LAYER;
		host.append(canvas);
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("the page gave no 2D canvas for the spawn marks");
		function fit() {
			const width = window.innerWidth;
			const height = window.innerHeight;
			const ratio = window.devicePixelRatio || 1;
			const pixelWidth = Math.round(width * ratio);
			const pixelHeight = Math.round(height * ratio);
			if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
				canvas.width = pixelWidth;
				canvas.height = pixelHeight;
			}
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
			return {
				width,
				height
			};
		}
		function wipe() {
			const { width, height } = fit();
			ctx.clearRect(0, 0, width, height);
		}
		function drawRing(ring, unit, nowMs) {
			const radius = ringRadius(unit) + breathOffset(nowMs);
			const width = ringStrokePx(unit);
			ctx.beginPath();
			ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
			ctx.lineWidth = width + OUTLINE_EXTRA_PX;
			ctx.strokeStyle = OUTLINE;
			ctx.stroke();
			ctx.lineWidth = width;
			ctx.strokeStyle = ring.colour;
			ctx.stroke();
			drawText(ring.name, ring.x, ring.y - nameBaseline(unit), nameFontPx(unit), ring.colour);
		}
		function drawText(text, x, y, fontPx, colour) {
			ctx.font = `700 ${fontPx}px ${FONT_FAMILY}`;
			ctx.textAlign = "center";
			ctx.textBaseline = "bottom";
			ctx.lineWidth = OUTLINE_EXTRA_PX;
			ctx.strokeStyle = TEXT_OUTLINE;
			ctx.strokeText(text, x, y);
			ctx.fillStyle = colour;
			ctx.fillText(text, x, y);
		}
		function drawPointer(pointer) {
			ctx.save();
			ctx.translate(pointer.x, pointer.y);
			ctx.rotate(pointer.angle);
			ctx.beginPath();
			CHEVRON.forEach(([along, across], index) => {
				const x = along * CHEVRON_SCALE;
				const y = across * CHEVRON_SCALE;
				if (index === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			});
			ctx.closePath();
			ctx.lineWidth = OUTLINE_EXTRA_PX;
			ctx.strokeStyle = OUTLINE;
			ctx.stroke();
			ctx.fillStyle = pointer.colour;
			ctx.fill();
			ctx.restore();
			if (pointer.count < 2) return;
			const back = COUNT_BACK * CHEVRON_SCALE;
			drawText(`×${pointer.count}`, pointer.x - Math.cos(pointer.angle) * back, pointer.y - Math.sin(pointer.angle) * back, COUNT_FONT * CHEVRON_SCALE, pointer.colour);
		}
		return {
			draw(scene) {
				wipe();
				ctx.globalAlpha = scene.alpha;
				ctx.lineJoin = "round";
				ctx.lineCap = "round";
				for (const ring of scene.rings) drawRing(ring, scene.unit, scene.nowMs);
				for (const pointer of scene.pointers) drawPointer(pointer);
				ctx.globalAlpha = 1;
			},
			clear: wipe,
			remove() {
				canvas.remove();
			}
		};
	}
	var FADE_MS = 1200;
	function createMarkTracker() {
		const tracked = new Map();
		function place(mark, nowMs) {
			const progress = Math.min(1, Math.max(0, (nowMs - mark.startedAt) / 350));
			const eased = 1 - (1 - progress) * (1 - progress);
			return {
				x: mark.fromX + (mark.toX - mark.fromX) * eased,
				y: mark.fromY + (mark.toY - mark.fromY) * eased
			};
		}
		return {
			update(teammates, nowMs) {
				const live = new Set();
				for (const mate of teammates) {
					live.add(mate.id);
					const known = tracked.get(mate.id);
					if (!known) {
						tracked.set(mate.id, {
							name: mate.name,
							colour: mate.colour,
							fromX: mate.x,
							fromY: mate.y,
							toX: mate.x,
							toY: mate.y,
							startedAt: nowMs
						});
						continue;
					}
					known.name = mate.name;
					known.colour = mate.colour;
					if (known.toX !== mate.x || known.toY !== mate.y) {
						const here = place(known, nowMs);
						known.fromX = here.x;
						known.fromY = here.y;
						known.toX = mate.x;
						known.toY = mate.y;
						known.startedAt = nowMs;
					}
				}
				for (const id of [...tracked.keys()]) if (!live.has(id)) tracked.delete(id);
			},
			marks(nowMs) {
				return [...tracked.entries()].map(([id, mark]) => ({
					id,
					name: mark.name,
					colour: mark.colour,
					...place(mark, nowMs)
				}));
			},
			clear: () => tracked.clear()
		};
	}
	function fadeAlpha(endedAtMs, nowMs) {
		return Math.min(1, Math.max(0, 1 - (nowMs - endedAtMs) / FADE_MS));
	}
	function readTeammates(game, includeNations) {
		const me = game.myPlayer();
		if (!me) return [];
		const teammates = [];
		for (const player of game.players()) {
			if (player.id() === me.id() || !player.isOnSameTeam(me)) continue;
			if (!isMarked(player, includeNations)) continue;
			const tile = player.state.spawnTile;
			if (tile === void 0) continue;
			const { r, g, b } = player.territoryColor().toRgb();
			teammates.push({
				id: player.id(),
				name: player.displayName(),
				x: game.x(tile),
				y: game.y(tile),
				colour: `rgb(${r},${g},${b})`
			});
		}
		return teammates;
	}
	function isMarked(player, includeNations) {
		const type = player.type();
		return type === "HUMAN" || includeNations && type === "NATION";
	}
	var NATION_TEAMMATES_OPTION = "nation-teammates";
	var spawnMarks = {
		id: "spawn-marks",
		name: "Spawn marks",
		options: [{
			key: NATION_TEAMMATES_OPTION,
			name: "Mark Nation teammates too",
			whenUnset: false
		}],
		attach(context) {
			const readHooks = mapHooksReader();
			const layer = createMarkLayer();
			const tracker = createMarkTracker();
			let frame = 0;
			let phaseEndedAt = null;
			function draw(now) {
				const game = context.game;
				let alpha = 1;
				if (game.inSpawnPhase()) {
					phaseEndedAt = null;
					tracker.update(readTeammates(game, context.isOptionEnabled(NATION_TEAMMATES_OPTION)), now);
				} else {
					if (tracker.marks(now).length === 0) return false;
					phaseEndedAt ??= now;
					alpha = fadeAlpha(phaseEndedAt, now);
					if (alpha === 0) return false;
				}
				const hooks = readHooks();
				if (!hooks) return true;
				const width = window.innerWidth;
				const height = window.innerHeight;
				const rings = [];
				const offScreen = [];
				for (const mark of tracker.marks(now)) {
					const at = hooks.camera.worldToScreenCoordinates(mark);
					if (at.x > 0 && at.y > 0 && at.x < width && at.y < height) rings.push({
						...at,
						name: mark.name,
						colour: mark.colour
					});
					else offScreen.push({
						...at,
						colour: mark.colour
					});
				}
				layer.draw({
					rings,
					pointers: placePointers(offScreen, {
						width,
						height
					}),
					unit: markUnit(hooks.camera.scale),
					nowMs: now,
					alpha
				});
				return true;
			}
			function finish() {
				stopLoop();
				tracker.clear();
				layer.clear();
			}
			function step(now) {
				frame = requestAnimationFrame(step);
				try {
					if (!draw(now)) finish();
				} catch (error) {
					logError("the spawn marks failed on a frame", error);
					finish();
				}
			}
			function stopLoop() {
				if (frame === 0) return;
				cancelAnimationFrame(frame);
				frame = 0;
			}
			frame = requestAnimationFrame(step);
			context.onDetach(() => {
				stopLoop();
				layer.remove();
			});
		}
	};
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
	var FEATURES = [
		troopBar,
		hotbarReadout,
		allianceView,
		spawnMarks
	];
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
