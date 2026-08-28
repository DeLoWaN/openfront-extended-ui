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
	var package_default = ".ofx-tick-marker{color:#fff;white-space:nowrap;pointer-events:none;background:#000;border-radius:2px;margin-bottom:2px;padding:1px 4px;font:10px/1.4 system-ui,sans-serif;position:absolute;bottom:100%;left:0}";
	function isMatchLive(game) {
		if (game.inSpawnPhase()) return false;
		const me = game.myPlayer();
		return me !== null && me.isAlive();
	}
	var PREFIX = "[openfront-extended-ui]";
	function logInfo(message, ...details) {
		console.info(PREFIX, message, ...details);
	}
	function logError(message, ...details) {
		console.error(PREFIX, message, ...details);
	}
	function injectedNodes(deps) {
		const drawn = new Map();
		const priorPosition = new Map();
		const styleAttributeAdded = new Set();
		return {
			sync() {
				let hosts;
				try {
					hosts = deps.findHosts();
				} catch (error) {
					logError("could not look for a place to draw", error);
					return [...drawn.values()];
				}
				for (const host of hosts) {
					if (drawn.get(host)?.isConnected) continue;
					if (!priorPosition.has(host)) {
						if (!host.hasAttribute("style")) styleAttributeAdded.add(host);
						priorPosition.set(host, host.style.position || null);
					}
					host.style.position = "relative";
					const node = deps.build();
					host.append(node);
					drawn.set(host, node);
				}
				return [...drawn.values()];
			},
			remove() {
				for (const node of drawn.values()) node.remove();
				drawn.clear();
				for (const [host, position] of priorPosition) {
					if (position === null) host.style.removeProperty("position");
					else host.style.position = position;
					if (styleAttributeAdded.has(host) && host.style.length === 0) host.removeAttribute("style");
				}
				priorPosition.clear();
				styleAttributeAdded.clear();
			}
		};
	}
	var TROOP_FILL = ".bg-malibu-blue";
	var BAR_CLIPS = "overflow-hidden";
	function findTroopBarCells(panel) {
		const cells = [];
		for (const fill of panel.querySelectorAll(TROOP_FILL)) {
			const bar = fill.parentElement?.parentElement;
			if (!bar?.classList.contains(BAR_CLIPS)) continue;
			const cell = bar.parentElement;
			if (cell instanceof HTMLElement) cells.push(cell);
		}
		return cells;
	}
	var CLASS = "ofx-tick-marker";
	var tickMarker = {
		id: "tick-marker",
		name: "Tick counter (throwaway)",
		attach(context) {
			const badges = injectedNodes({
				findHosts: () => findTroopBarCells(context.panel),
				build: buildBadge
			});
			context.onDetach(() => badges.remove());
			return { tick() {
				if (!isMatchLive(context.game)) {
					badges.remove();
					return;
				}
				const label = `tick ${context.game.ticks()}`;
				for (const badge of badges.sync()) badge.textContent = label;
			} };
		}
	};
	function buildBadge() {
		const badge = document.createElement("div");
		badge.className = CLASS;
		return badge;
	}
	var FEATURES = [tickMarker];
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
		function attach(feature, match) {
			if (attached.has(feature.id)) return;
			const context = createFeatureContext({
				panel: match.panel,
				game: match.game
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
			setEnabled(id, enabled) {
				const feature = features.find((candidate) => candidate.id === id);
				if (!feature) return;
				settings.setEnabled(id, enabled);
				if (enabled) {
					if (currentMatch) attach(feature, currentMatch);
				} else detach(id);
			}
		};
	}
	var MARKER = "data-openfront-extended-ui";
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
				enabled: deps.registry.isEnabled(feature.id)
			})),
			enable: (id) => deps.registry.setEnabled(id, true),
			disable: (id) => deps.registry.setEnabled(id, false),
			stop: () => deps.stop()
		};
	}
	var STORAGE_KEY = "openfront-extended-ui:features";
	function createSettings(store) {
		const enabled = readEnabled(store);
		return {
			isEnabled(id) {
				return enabled[id] ?? true;
			},
			setEnabled(id, value) {
				enabled[id] = value;
				try {
					store.write(JSON.stringify(enabled));
				} catch (error) {
					logError("could not save the settings", error);
				}
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
