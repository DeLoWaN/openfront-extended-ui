// ==UserScript==
// @name         OpenFront Extended UI
// @namespace    https://github.com/DeLoWaN/openfront-extended-ui
// @version      0.1.0
// @author       DeLoWaN
// @description  Adds readouts to the OpenFront.io game view. Changes nothing in the game.
// @license      MIT
// @homepage     https://github.com/DeLoWaN/openfront-extended-ui
// @homepageURL  https://github.com/DeLoWaN/openfront-extended-ui
// @supportURL   https://github.com/DeLoWaN/openfront-extended-ui/issues
// @downloadURL  https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist/openfront-extended-ui.user.js
// @updateURL    https://raw.githubusercontent.com/DeLoWaN/openfront-extended-ui/main/dist/openfront-extended-ui.meta.js
// @match        https://openfront.io/*
// @match        https://*.openfront.io/*
// @match        http://localhost:9000/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
	//#region \0./main-Cm99ev9u.js
	var package_default = ".ofx-tick-marker{color:#fff;white-space:nowrap;pointer-events:none;background:#000;border-radius:2px;margin-bottom:2px;padding:1px 4px;font:10px/1.4 system-ui,sans-serif;position:absolute;bottom:100%;left:0}";
	/**
	* Whether a live local player is on the board, with numbers worth a read.
	*
	* This is the test the game's own `<control-panel>` uses to decide whether to
	* show itself, so a feature that follows it appears and disappears with the
	* game's HUD.
	*
	* It is false in four cases: during the spawn phase, before the first game
	* update arrives, for the whole of a replay, and after the player dies. It says
	* nothing about whether the match has ended. The game offers no such test, and
	* the package works that out from the match boundary instead.
	*/
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
	/**
	* One node per host, drawn inside it.
	*
	* A host is `position: static`, so this sets `position: relative` on it. That
	* is the only change the package makes to one of the game's own elements, and
	* `remove` undoes it exactly. Without it a node inside the host cannot place
	* itself against the host.
	*/
	function injectedNodes(deps) {
		const drawn = /* @__PURE__ */ new Map();
		/** What each host's own inline `position` was, so it can go back. */
		const priorPosition = /* @__PURE__ */ new Map();
		/** Hosts that had no `style` attribute at all until the package wrote one. */
		const styleAttributeAdded = /* @__PURE__ */ new Set();
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
	/**
	* Where the game draws its troop bars.
	*
	* Every selector here reads the game's own markup, which the game can rename at
	* any time. When that happens these return nothing and the package draws
	* nothing, which is the loud failure rather than the quiet one.
	*
	* This belongs to the throwaway marker and goes when the marker goes. The troop
	* bar readout writes its own placement.
	*/
	/** The blue fill inside the troop bar. */
	var TROOP_FILL = ".bg-malibu-blue";
	/** The bar itself, which is the fill's grandparent. */
	var BAR_CLIPS = "overflow-hidden";
	/**
	* The cells that hold the troop bars, one per bar.
	*
	* The game keeps a desktop bar and a mobile bar in the page at all times and
	* hides one of them, so this normally returns two cells.
	*/
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
	/**
	* THROWAWAY. A badge above the troop bar that shows the game's tick count.
	*
	* It proves the skeleton works with no feature in it: the package finds the
	* HUD, draws in it, follows the tick, and takes everything away again. The
	* troop bar readout replaces this whole folder.
	*
	* It carries no visual language. The package's colours and shapes belong to
	* the troop bar readout, and nothing here should be copied into it.
	*/
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
	/**
	* Every feature the package ships, in the order they attach.
	*
	* Six belong here in the end. The only entry now is a throwaway that proves the
	* skeleton works, and the troop bar readout replaces it.
	*/
	var FEATURES = [tickMarker];
	/**
	* How often the package looks for a match boundary.
	*
	* Nothing in the game reacts within half a second of a match boundary, and the
	* check costs one identity comparison on one property.
	*/
	var BOUNDARY_POLL_MS = 500;
	/**
	* Follows the game from one match to the next.
	*
	* The `<control-panel>` element lives for the whole page and is never rebuilt.
	* Each match assigns a new object to its `.game` property, so that object's
	* identity is the only thing that separates two matches. `.eventBus` is the
	* same object for every match, so it can never separate them.
	*/
	function startLifecycle(deps) {
		const { panel, handlers } = deps;
		/**
		* The last match the poll saw on the panel, followed or not.
		*
		* A return to the lobby without a page reload leaves the finished match on
		* `.game`. Without this field, the next poll reads that dead match as a new
		* one.
		*/
		let seenGame = null;
		/** The match the package follows now. */
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
		/**
		* Shadows the panel's own `tick` with an own property.
		*
		* The game's controller loop calls `tick` on each controller and has no
		* try/catch. An error here skips every controller after `control-panel` and
		* breaks the game's own HUD. So the game's own tick runs first, and the
		* package's work is wrapped.
		*/
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
		/** `tick` is a prototype method, so `delete` restores the game's own one. */
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
					bus.on(type, handler);
					cleanups.push(() => bus.off(type, handler));
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
		const attached = /* @__PURE__ */ new Map();
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
				settings.setEnabled(id, enabled);
				if (enabled) {
					const feature = features.find((candidate) => candidate.id === id);
					if (feature && currentMatch) attach(feature, currentMatch);
				} else detach(id);
			}
		};
	}
	/**
	* The package's own stylesheet, and the roots it has been put into.
	*
	* The package never uses one of the game's CSS classes, because `<build-menu>`
	* keeps its shadow DOM and the game's utility classes do not reach inside it.
	* So the stylesheet has to go into a shadow root as well as into the page.
	* See docs/adr/0001.
	*/
	var MARKER = "data-openfront-extended-ui";
	function createStyleSheet(css) {
		const injected = /* @__PURE__ */ new Map();
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
	/** A document holds its stylesheets in `<head>`. A shadow root holds its own. */
	function styleHostOf(root) {
		return root.nodeType === Node.DOCUMENT_NODE ? root.head : root;
	}
	/**
	* Wires the package to a `<control-panel>` element that is already upgraded.
	*
	* Everything the package does to the page happens below this call, and `stop`
	* undoes all of it.
	*/
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
	/** Reads `localStorage`, which throws when the browser has storage switched off. */
	function localStorageStore(key = STORAGE_KEY) {
		return {
			read: () => localStorage.getItem(key),
			write: (value) => localStorage.setItem(key, value)
		};
	}
	/**
	* Anything that is not an object of booleans is treated as absent, so a value
	* left by an older version of the package can never switch a feature off.
	*/
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
	/**
	* The userscript entry point.
	*
	* The script takes no grants, so this runs in the page's own context and
	* `window` is the page's window. See docs/adr/0005.
	*/
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
	//#endregion
})();