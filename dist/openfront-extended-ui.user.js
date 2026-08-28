// ==UserScript==
// @name         OpenFront Extended UI
// @namespace    https://github.com/DeLoWaN/openfront-extended-ui
// @version      0.1.1
// @author       DeLoWaN
// @description  Adds readouts to the OpenFront.io game view. Changes nothing in the game.
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
	var package_default = ":root,:host{--ofx-mark:#9d93f5;--ofx-figure:#c9c4ff;--ofx-shadow-figure:0 1px 1px #000000e6;--ofx-shadow-mark:0 0 2px #000000e6;--ofx-figure-size:13px}.ofx-hidden{display:none!important}.ofx-troop-strip{background:var(--ofx-mark);height:3px;box-shadow:var(--ofx-shadow-mark);pointer-events:none;position:absolute;bottom:0}.ofx-troop-share{color:var(--ofx-figure);font-size:var(--ofx-figure-size);font-variant-numeric:tabular-nums;text-shadow:var(--ofx-shadow-figure);pointer-events:none;align-items:center;font-weight:700;line-height:1;display:flex;position:absolute;top:0;bottom:0;right:5px}@media (width<64rem){.ofx-troop-share{display:none}}";
	function isMatchLive(game) {
		if (game.inSpawnPhase()) return false;
		const me = game.myPlayer();
		return me !== null && me.isAlive();
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
	var PREFIX = "[openfront-extended-ui]";
	function logInfo(message, ...details) {
		console.info(PREFIX, message, ...details);
	}
	function logError(message, ...details) {
		console.error(PREFIX, message, ...details);
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
	var FEATURES = [troopBar];
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
				isOptionEnabled: (option) => deps.isOptionEnabled(option),
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
				isOptionEnabled: (key) => {
					const option = optionOf(feature, key);
					if (!option) {
						logError(`the ${feature.id} feature asked for the option ${key}, which it does not declare`);
						return false;
					}
					return settings.isOptionEnabled(feature.id, key, option.whenUnset);
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
					enabled: settings.isOptionEnabled(id, option.key, option.whenUnset)
				}));
			},
			setOptionEnabled(id, option, enabled) {
				const feature = featureOf(id);
				if (!feature || !optionOf(feature, option)) return;
				settings.setOptionEnabled(id, option, enabled);
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
					enabled: option.enabled
				}))
			})),
			enable: (id) => deps.registry.setEnabled(id, true),
			disable: (id) => deps.registry.setEnabled(id, false),
			setOption: (id, option, enabled) => deps.registry.setOptionEnabled(id, option, enabled),
			stop: () => deps.stop()
		};
	}
	var STORAGE_KEY = "openfront-extended-ui:features";
	function optionKey(id, option) {
		return `${id}:${option}`;
	}
	function createSettings(store) {
		const enabled = readEnabled(store);
		function save() {
			try {
				store.write(JSON.stringify(enabled));
			} catch (error) {
				logError("could not save the settings", error);
			}
		}
		return {
			isEnabled(id) {
				return enabled[id] ?? true;
			},
			setEnabled(id, value) {
				enabled[id] = value;
				save();
			},
			isOptionEnabled(id, option, whenUnset) {
				return enabled[optionKey(id, option)] ?? whenUnset;
			},
			setOptionEnabled(id, option, value) {
				enabled[optionKey(id, option)] = value;
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
	function readEnabled(store) {
		let stored;
		try {
			stored = store.read();
		} catch (error) {
			logError("could not read the settings", error);
			return {};
		}
		if (stored === null) return {};
		let parsed;
		try {
			parsed = JSON.parse(stored);
		} catch {
			logError("the stored settings are not valid JSON, using the defaults");
			return {};
		}
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			logError("the stored settings are not an object, using the defaults");
			return {};
		}
		const enabled = {};
		for (const [id, value] of Object.entries(parsed)) if (typeof value === "boolean") enabled[id] = value;
		return enabled;
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
