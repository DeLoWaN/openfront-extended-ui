// ==UserScript==
// @name         OpenFront Extended UI
// @namespace    https://github.com/DeLoWaN/openfront-extended-ui
// @version      0.2.0
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
	var package_default = ":root,:host{--ofx-mark:#9d93f5;--ofx-figure:#c9c4ff;--ofx-shadow-figure:0 1px 1px #000000e6;--ofx-shadow-mark:0 0 2px #000000e6;--ofx-figure-size:13px;--ofx-cue:#fbbf24;--ofx-cue-wash:#fbbf242e;--ofx-cue-glow:#fbbf248c;--ofx-cue-waiting:#9ca3af;--ofx-cue-rail:#374151;--ofx-hotbar-marks-height:7px}.ofx-hidden{display:none!important}.ofx-troop-strip{background:var(--ofx-mark);height:3px;box-shadow:var(--ofx-shadow-mark);pointer-events:none;position:absolute;bottom:0}.ofx-troop-share{color:var(--ofx-figure);font-size:var(--ofx-figure-size);font-variant-numeric:tabular-nums;text-shadow:var(--ofx-shadow-figure);pointer-events:none;align-items:center;font-weight:700;line-height:1;display:flex;position:absolute;top:0;bottom:0;right:5px}@media (width<64rem){.ofx-troop-share{display:none}}.ofx-alliance-clocks{z-index:50;pointer-events:none;position:fixed;inset:0;overflow:hidden}.ofx-spawn-marks{z-index:50;pointer-events:none;width:100vw;height:100vh;position:fixed;inset:0}.ofx-alliance-clock{color:#fff;white-space:nowrap;font-variant-numeric:tabular-nums;text-shadow:0 0 3px #000000f2,0 0 3px #000000f2,0 0 3px #000000f2;pointer-events:none;font-weight:700;line-height:1;position:absolute;transform:translate(-50%)}.ofx-alliance-clock-urgent{color:#ff4d4d}.ofx-hotbar-marks{height:var(--ofx-hotbar-marks-height);pointer-events:none;justify-content:center;align-items:center;gap:2px;display:flex}.ofx-hotbar-marks-off{visibility:hidden}.ofx-hotbar-mark{background:var(--ofx-cue-rail);border-radius:1px;width:7px;height:3px}.ofx-hotbar-mark-lit{background:var(--ofx-cue-waiting)}.ofx-hotbar-marks-ready .ofx-hotbar-mark-lit{background:var(--ofx-cue)}.ofx-hotbar-light{top:0;right:0;bottom:var(--ofx-hotbar-marks-height);background:var(--ofx-cue-wash);box-shadow:inset 0 0 0 1px var(--ofx-cue), 0 0 6px var(--ofx-cue-glow);opacity:0;pointer-events:none;border-radius:2px;position:absolute;left:0}@keyframes ofx-hotbar-onset{0%{opacity:1}6%{opacity:.3}12%{opacity:1}18%{opacity:.3}24%{opacity:1}30%{opacity:.3}36%{opacity:.92}48%{opacity:.28}61%{opacity:.8}80%{opacity:.26}to{opacity:.7}}@keyframes ofx-hotbar-breathe{0%,to{opacity:.7}50%{opacity:.25}}.ofx-hotbar-light-breathing{animation:3.3s ease-in-out both ofx-hotbar-onset,2s ease-in-out 3.3s infinite ofx-hotbar-breathe}.ofx-hotbar-light-steady{animation:3.3s ease-in-out forwards ofx-hotbar-onset}@media (prefers-reduced-motion:reduce){.ofx-hotbar-light-breathing{animation:3.3s ease-in-out forwards ofx-hotbar-onset}}.ofx-hotbar-badge{z-index:9000;pointer-events:none;position:fixed}.ofx-hotbar-badge[hidden]{display:none}.ofx-hotbar-badge-panel{box-shadow:inset 0 0 0 2px var(--ofx-cue), 0 0 10px var(--ofx-cue-glow);background:#111827eb;border-radius:6px;gap:4px;padding:4px 6px;display:flex}.ofx-hotbar-badge-icon{object-fit:contain;width:28px;height:28px}.ofx-hotbar-badge-arrow{border-left:2px solid var(--ofx-cue);transform-origin:top;filter:drop-shadow(0 0 2px #000000e6);width:0;height:30px;margin-left:-1px;position:absolute;top:100%;left:50%}.ofx-hotbar-badge-arrow:after{content:\"\";border-top:10px solid var(--ofx-cue);border-left:6px solid #0000;border-right:6px solid #0000;position:absolute;bottom:-2px;left:-7px}@keyframes ofx-hotbar-badge-pulse{0%,to{opacity:1}50%{opacity:.55}}.ofx-hotbar-badge-shown{animation:1s ease-in-out infinite ofx-hotbar-badge-pulse}.ofx-hotbar-badge-fading{opacity:0;transition:opacity .4s ease-out;animation:none}@media (prefers-reduced-motion:reduce){.ofx-hotbar-badge-shown{animation:none}}.ofx-alliance-panel{--ofx-bar-track:#0f172af0;--ofx-bar-fill:#3b5b86;--ofx-bar-fill-urgent:#b42323;min-width:14em;max-width:22em;font-size:calc(var(--ofx-figure-size) * 1.6);color:#fff;text-shadow:var(--ofx-shadow-figure);pointer-events:auto;flex-direction:column;gap:.2em;line-height:1.2;display:flex}.ofx-alliance-row{background:linear-gradient(90deg, var(--ofx-bar-fill) var(--ofx-frac,100%), var(--ofx-bar-track) var(--ofx-frac,100%));cursor:pointer;border-radius:.3em;align-items:baseline;gap:.5em;padding:.3em .6em;display:flex;box-shadow:0 0 0 1px #0009}.ofx-alliance-row-urgent{--ofx-bar-fill:var(--ofx-bar-fill-urgent)}.ofx-alliance-row:hover{filter:brightness(1.3)}.ofx-alliance-name{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.ofx-alliance-tag{color:#cbd5e1;white-space:nowrap;flex:none;font-size:.8em}.ofx-alliance-time{font-variant-numeric:tabular-nums;flex:none;font-weight:700}.ofx-alliance-row-expired{color:#cbd5e1}.ofx-spotlight-pointer{z-index:50;pointer-events:none;flex-direction:column;align-items:center;gap:6px;display:flex;position:fixed;transform:translate(-50%,-50%)}.ofx-spotlight-arrow{border-top:16px solid #0000;border-bottom:16px solid #0000;border-left:28px solid var(--ofx-pointer-colour,#fff);filter:drop-shadow(0 0 1px #fff)drop-shadow(0 0 1px #fff)drop-shadow(0 0 3px #000000e6);width:0;height:0}.ofx-spotlight-name{text-overflow:ellipsis;white-space:nowrap;color:#fff;text-shadow:0 0 3px #000000f2,0 0 3px #000000f2,0 0 3px #000000f2;max-width:14em;font-size:18px;font-weight:700;overflow:hidden}";
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
	var TICKS_PER_SECOND = 10;
	var EXTENSION_WINDOW_TICKS = 300;
	function readWeb(game, subjectID) {
		const subject = playerOrNull(game, subjectID);
		if (!subject) return null;
		const allies = readAllies(subject, subjectID);
		const expiry = readExpiry(game, subject);
		const window = renewalWindow(game);
		const coloured = new Set([subjectID, ...readTeammates(game, subject)]);
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
	function readTeammates(game, subject) {
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
	var spotlit = null;
	var listeners = new Set();
	function spotlightedPlayer() {
		return spotlit;
	}
	function setSpotlight(smallID) {
		if (spotlit === smallID) return;
		spotlit = smallID;
		for (const listener of [...listeners]) try {
			listener();
		} catch {
			continue;
		}
	}
	function onSpotlight(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}
	var NONE = {
		requests: [],
		replies: [],
		expired: [],
		extensions: []
	};
	function readAllianceUpdates(game) {
		const lists = game.updatesSinceLastTick();
		if (!lists) return NONE;
		const requests = [];
		const replies = [];
		const expired = [];
		const extensions = [];
		for (const list of Object.values(lists)) {
			if (!list || list.length === 0) continue;
			const first = list[0];
			if (typeof first !== "object" || first === null) continue;
			if (hasNumbers(first, "requestorID", "recipientID", "createdAt")) {
				for (const update of list) if (hasNumbers(update, "requestorID", "recipientID", "createdAt")) requests.push(update);
			} else if (isReply(first)) {
				for (const update of list) if (isReply(update)) replies.push(update.request);
			} else if (hasNumbers(first, "player1ID", "player2ID")) {
				for (const update of list) if (hasNumbers(update, "player1ID", "player2ID")) expired.push(update);
			} else if (hasNumbers(first, "playerID", "allianceID")) {
				for (const update of list) if (hasNumbers(update, "playerID", "allianceID")) extensions.push(update);
			}
		}
		return {
			requests,
			replies,
			expired,
			extensions
		};
	}
	function hasNumbers(value, ...keys) {
		if (typeof value !== "object" || value === null) return false;
		const fields = value;
		return keys.every((key) => typeof fields[key] === "number");
	}
	function isReply(value) {
		if (typeof value !== "object" || value === null) return false;
		const fields = value;
		return typeof fields.accepted === "boolean" && hasNumbers(fields.request, "requestorID", "recipientID");
	}
	function createAlliancePanelRows(game) {
		const requests = new Map();
		const expired = new Map();
		const agreed = new Map();
		return {
			observe(me) {
				const news = readAllianceUpdates(game);
				const now = game.ticks();
				const mine = me.smallID();
				for (const request of news.requests) {
					if (request.recipientID !== mine) continue;
					requests.set(request.requestorID, request.createdAt + game.config().allianceRequestDuration());
				}
				for (const reply of news.replies) if (reply.recipientID === mine) requests.delete(reply.requestorID);
				for (const end of news.expired) {
					const other = end.player1ID === mine ? end.player2ID : end.player2ID === mine ? end.player1ID : null;
					if (other === null) continue;
					const partner = playerOrNull(game, other);
					if (!partner || !partner.isAlive() || !me.isAlive()) continue;
					expired.set(other, now);
				}
				const window = renewalWindow(game);
				for (const extension of news.extensions) {
					if (extension.playerID !== mine) continue;
					const alliance = me.alliances().find((candidate) => candidate.id === extension.allianceID);
					if (!alliance || alliance.expiresAt - now > window) continue;
					agreed.set(alliance.id, alliance.expiresAt);
				}
			},
			rows(me) {
				const now = game.ticks();
				const window = renewalWindow(game);
				const allianceWhole = safely(() => game.config().allianceDuration()) ?? 0;
				const requestWhole = safely(() => game.config().allianceRequestDuration()) ?? 0;
				const listed = [];
				const partners = new Set();
				const live = new Set();
				const byId = new Map();
				for (const player of safely(() => game.players()) ?? []) {
					const id = safely(() => player.id());
					if (id !== void 0) byId.set(id, player);
				}
				for (const alliance of safely(() => me.alliances()) ?? []) {
					live.add(alliance.id);
					const partner = byId.get(alliance.other);
					if (!partner?.isAlive()) continue;
					const row = describe(partner, (smallID, name) => {
						const left = Math.max(0, alliance.expiresAt - now);
						return {
							key: `alliance:${alliance.id}`,
							kind: "alliance",
							smallID,
							name,
							clock: formatClock(left),
							urgent: left <= window && agreed.get(alliance.id) !== alliance.expiresAt,
							fraction: shareOf(left, allianceWhole),
							order: left
						};
					});
					if (!row) continue;
					partners.add(row.smallID);
					listed.push(row);
				}
				for (const smallID of partners) expired.delete(smallID);
				for (const id of agreed.keys()) if (!live.has(id)) agreed.delete(id);
				for (const [requestor, endsAt] of requests) {
					const partner = playerOrNull(game, requestor);
					const left = endsAt - now;
					if (left <= 0 || !partner?.isAlive() || partners.has(requestor)) {
						requests.delete(requestor);
						continue;
					}
					const row = describe(partner, (smallID, name) => ({
						key: `request:${smallID}`,
						kind: "request",
						smallID,
						name,
						clock: formatClock(left),
						urgent: false,
						fraction: shareOf(left, requestWhole),
						order: left
					}));
					if (row) listed.push(row);
				}
				for (const [former, endedAt] of expired) {
					const since = now - endedAt;
					const partner = playerOrNull(game, former);
					if (since >= 150 || !partner) {
						expired.delete(former);
						continue;
					}
					const row = describe(partner, (smallID, name) => ({
						key: `expired:${smallID}`,
						kind: "expired",
						smallID,
						name,
						clock: formatClock(since),
						urgent: false,
						fraction: 0,
						order: -since
					}));
					if (row) listed.push(row);
				}
				listed.sort((a, b) => b.order - a.order || a.smallID - b.smallID);
				return listed.map(({ order: _order, ...row }) => row);
			}
		};
	}
	function describe(player, build) {
		try {
			return build(player.smallID(), player.displayName());
		} catch {
			return null;
		}
	}
	function shareOf(left, whole) {
		if (!(whole > 0)) return 1;
		return Math.max(0, Math.min(1, left / whole));
	}
	function safely(read) {
		try {
			return read();
		} catch {
			return;
		}
	}
	var SIDEBAR = "game-right-sidebar";
	var PANEL$2 = "ofx-alliance-panel";
	var ROW = "ofx-alliance-row";
	var NAME$1 = "ofx-alliance-name";
	var TAG = "ofx-alliance-tag";
	var TIME = "ofx-alliance-time";
	var URGENT_ROW = "ofx-alliance-row-urgent";
	var EXPIRED_ROW = "ofx-alliance-row-expired";
	var FRACTION = "--ofx-frac";
	var HOVER_DELAY_MS = 60;
	var TAGS = {
		alliance: "",
		request: "asks you",
		expired: "ended"
	};
	var BUILD_MENU$1 = "build-menu";
	var alliancePanel = {
		id: "alliance-panel",
		name: "Alliance panel",
		attach(context) {
			const state = createAlliancePanelRows(context.game);
			const panels = injectedNodes({
				findHosts: findSidebars,
				draw: (host) => drawPanel(host, context.game, hover),
				nodesOf: (panel) => [panel.root]
			});
			context.onDetach(() => panels.remove());
			const hover = createHover(context);
			return { tick() {
				const me = context.game.myPlayer();
				if (!isMatchLive(context.game) || !me) {
					hover.leave();
					panels.remove();
					return;
				}
				state.observe(me);
				const rows = state.rows(me);
				for (const panel of panels.sync()) render(panel, rows);
				hover.keepOnlyRowsIn(rows);
			} };
		}
	};
	function findSidebars() {
		const hosts = new Set();
		for (const sidebar of document.querySelectorAll(SIDEBAR)) if (sidebar.parentElement) hosts.add(sidebar.parentElement);
		return [...hosts];
	}
	function createHover(context) {
		let timer = null;
		function cancel() {
			if (timer === null) return;
			window.clearTimeout(timer);
			timer = null;
		}
		context.onDetach(() => {
			cancel();
			setSpotlight(null);
		});
		return {
			over(smallID) {
				cancel();
				if (spotlightedPlayer() === smallID) return;
				timer = window.setTimeout(() => {
					timer = null;
					setSpotlight(smallID);
				}, HOVER_DELAY_MS);
			},
			leave() {
				cancel();
				setSpotlight(null);
			},
			keepOnlyRowsIn(rows) {
				const lit = spotlightedPlayer();
				if (lit !== null && !rows.some((row) => row.smallID === lit)) setSpotlight(null);
			}
		};
	}
	function drawPanel(host, game, hover) {
		const root = document.createElement("div");
		root.className = `${PANEL$2} ${HIDDEN}`;
		root.addEventListener("click", (event) => {
			try {
				const row = event.target?.closest(`.${ROW}`);
				const smallID = Number(row?.dataset.ofxPlayer);
				if (!row || Number.isNaN(smallID)) return;
				moveCameraTo(game, smallID);
			} catch (error) {
				logError("a click on the alliance panel failed", error);
			}
		});
		root.addEventListener("mouseover", (event) => {
			const row = event.target?.closest(`.${ROW}`);
			const smallID = Number(row?.dataset.ofxPlayer);
			if (row && !Number.isNaN(smallID)) hover.over(smallID);
		});
		root.addEventListener("mouseleave", () => hover.leave());
		host.append(root);
		return {
			root,
			drawn: new Map()
		};
	}
	function moveCameraTo(game, smallID) {
		const player = playerOrNull(game, smallID);
		const camera = document.querySelector(BUILD_MENU$1)?.transformHandler;
		if (!player || !camera) {
			logError("no camera or no player to move the camera to");
			return;
		}
		camera.onGoToPlayer({ player });
	}
	function render(panel, rows) {
		const wanted = new Set(rows.map((row) => row.key));
		for (const [key, drawn] of panel.drawn) {
			if (wanted.has(key)) continue;
			drawn.node.remove();
			panel.drawn.delete(key);
		}
		const ordered = [];
		for (const row of rows) {
			let drawn = panel.drawn.get(row.key);
			if (!drawn) {
				drawn = createRow();
				panel.drawn.set(row.key, drawn);
			}
			drawn.node.dataset.ofxPlayer = String(row.smallID);
			setText(drawn.name, row.name);
			setText(drawn.tag, TAGS[row.kind]);
			setText(drawn.time, row.clock);
			drawn.tag.classList.toggle(HIDDEN, TAGS[row.kind] === "");
			drawn.node.classList.toggle(URGENT_ROW, row.urgent);
			drawn.node.classList.toggle(EXPIRED_ROW, row.kind === "expired");
			const bar = `${Math.round(row.fraction * 1e3) / 10}%`;
			if (drawn.node.style.getPropertyValue(FRACTION) !== bar) drawn.node.style.setProperty(FRACTION, bar);
			ordered.push(drawn.node);
		}
		const current = [...panel.root.children];
		if (!(current.length === ordered.length && ordered.every((node, index) => current[index] === node))) panel.root.append(...ordered);
		panel.root.classList.toggle(HIDDEN, rows.length === 0);
	}
	function createRow() {
		const node = document.createElement("div");
		node.className = ROW;
		const name = document.createElement("span");
		name.className = NAME$1;
		const tag = document.createElement("span");
		tag.className = TAG;
		const time = document.createElement("span");
		time.className = TIME;
		node.append(name, tag, time);
		return {
			node,
			name,
			tag,
			time
		};
	}
	function setText(node, text) {
		if (node.textContent !== text) node.textContent = text;
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
	var POINTER = "ofx-spotlight-pointer";
	var ARROW$1 = "ofx-spotlight-arrow";
	var NAME = "ofx-spotlight-name";
	var EDGE_INSETS = {
		top: 72,
		right: 72,
		bottom: 150,
		left: 72
	};
	function edgePoint(target, width, height, insets = EDGE_INSETS) {
		if (target.x >= 0 && target.x <= width && target.y >= 0 && target.y <= height) return null;
		const centreX = width / 2;
		const centreY = height / 2;
		const dx = target.x - centreX;
		const dy = target.y - centreY;
		const reach = (offset, near, far) => {
			if (offset === 0) return Infinity;
			return Math.max(0, (offset > 0 ? far : near) / Math.abs(offset));
		};
		const along = Math.min(reach(dx, centreX - insets.left, centreX - insets.right), reach(dy, centreY - insets.top, centreY - insets.bottom));
		return {
			x: centreX + dx * along,
			y: centreY + dy * along,
			angle: Math.atan2(dy, dx) * 180 / Math.PI
		};
	}
	function createPointer(host = document.body) {
		const root = document.createElement("div");
		root.className = `${POINTER} ${HIDDEN}`;
		const arrow = document.createElement("div");
		arrow.className = ARROW$1;
		const name = document.createElement("div");
		name.className = NAME;
		root.append(arrow, name);
		host.append(root);
		return {
			place(target, camera) {
				if (!target) {
					root.classList.add(HIDDEN);
					return;
				}
				const point = edgePoint(camera.worldToScreenCoordinates(target.anchor), window.innerWidth, window.innerHeight);
				if (!point) {
					root.classList.add(HIDDEN);
					return;
				}
				root.classList.remove(HIDDEN);
				root.style.left = `${point.x}px`;
				root.style.top = `${point.y}px`;
				root.style.setProperty("--ofx-pointer-colour", target.colour);
				arrow.style.transform = `rotate(${point.angle}deg)`;
				if (name.textContent !== target.name) name.textContent = target.name;
			},
			hide() {
				root.classList.add(HIDDEN);
			},
			remove() {
				root.remove();
			}
		};
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
			const pointer = createPointer();
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
				return (holding || spotlightedPlayer() !== null) && !alternateViewHeld && !modalOpen();
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
				const spotlit = holding ? null : spotlightedPlayer();
				let web = null;
				let coloured;
				if (spotlit !== null) {
					coloured = new Set([spotlit]);
					pointer.place(pointerTargetOf(context.game, spotlit), hooks.camera);
				} else {
					const found = ownerUnderCursor(context.game, hooks.camera, cursorX, cursorY);
					if (found !== 0) subjectID = found;
					web = subjectID === 0 ? null : readWeb(context.game, subjectID);
					coloured = web?.coloured ?? NOTHING_COLOURED;
					pointer.hide();
				}
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
				pointer.hide();
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
			function onSpotlightChange() {
				if (spotlightedPlayer() !== null) {
					startLoop();
					update();
					return;
				}
				if (holding) return;
				stopLoop();
				update();
			}
			context.onDetach(onSpotlight(onSpotlightChange));
			context.onDetach(() => {
				stopLoop();
				const hooks = readHooks();
				if (hooks) standDown(hooks);
				terrain.restore();
				clocks.remove();
				pointer.remove();
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
	function pointerTargetOf(game, smallID) {
		const player = playerOrNull(game, smallID);
		if (!player) return null;
		const anchor = nameAnchor(player);
		if (!anchor) return null;
		try {
			const { r, g, b } = player.territoryColor().toRgb();
			return {
				anchor,
				name: player.displayName(),
				colour: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
			};
		} catch {
			return null;
		}
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
	var DEFAULT_SECONDS = 3.5;
	var MIN_SECONDS = .5;
	var MAX_SECONDS = 30;
	function placeBadge(cursor, panel, screen) {
		const top = cursor.y + 50;
		if (top + panel.height > screen.height) return null;
		const wanted = cursor.x - panel.width / 2;
		const left = Math.min(Math.max(wanted, 0), Math.max(screen.width - panel.width, 0));
		return {
			left,
			top,
			tail: {
				x: left + panel.width / 2,
				y: top + panel.height
			}
		};
	}
	function arrowDegrees(tail, target) {
		const across = target.x - tail.x;
		const down = target.y - tail.y;
		const side = across < 0 ? -1 : 1;
		if (down <= 0) return side * 55;
		const degrees = Math.atan(Math.abs(across) / down) * 180 / Math.PI;
		return side * Math.min(degrees, 55);
	}
	function aimPoint(centres) {
		if (centres.length === 0) return null;
		const total = centres.reduce((sum, point) => ({
			x: sum.x + point.x,
			y: sum.y + point.y
		}), {
			x: 0,
			y: 0
		});
		return {
			x: total.x / centres.length,
			y: total.y / centres.length
		};
	}
	function stayMs(text) {
		const seconds = Number(text.trim());
		return (text.trim() !== "" && Number.isFinite(seconds) && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS ? seconds : DEFAULT_SECONDS) * 1e3;
	}
	var BADGE = "ofx-hotbar-badge";
	var BADGE_SHOWN = "ofx-hotbar-badge-shown";
	var PANEL$1 = "ofx-hotbar-badge-panel";
	var ICON = "ofx-hotbar-badge-icon";
	var ARROW = "ofx-hotbar-badge-arrow";
	function createBadgeNode(host = document.body) {
		const root = document.createElement("div");
		root.className = BADGE;
		root.hidden = true;
		const panel = document.createElement("div");
		panel.className = PANEL$1;
		const arrow = document.createElement("div");
		arrow.className = ARROW;
		root.append(panel, arrow);
		host.append(root);
		let fadeTimer;
		function stopFade() {
			clearTimeout(fadeTimer);
			fadeTimer = void 0;
			root.classList.remove("ofx-hotbar-badge-fading");
		}
		function hide() {
			stopFade();
			root.classList.remove(BADGE_SHOWN);
			root.hidden = true;
		}
		return {
			show(icons, cursor, target) {
				stopFade();
				panel.replaceChildren(...icons.map((src) => {
					const image = document.createElement("img");
					image.className = ICON;
					image.src = src;
					image.alt = "";
					return image;
				}));
				root.hidden = false;
				const placed = placeBadge(cursor, {
					width: panel.offsetWidth,
					height: panel.offsetHeight
				}, {
					width: window.innerWidth,
					height: window.innerHeight
				});
				if (!placed) {
					hide();
					return false;
				}
				root.style.left = `${placed.left}px`;
				root.style.top = `${placed.top}px`;
				arrow.style.transform = `rotate(${-arrowDegrees(placed.tail, target)}deg)`;
				root.classList.remove(BADGE_SHOWN);
				root.offsetWidth;
				root.classList.add(BADGE_SHOWN);
				return true;
			},
			fade() {
				if (root.hidden || fadeTimer !== void 0) return;
				root.classList.add("ofx-hotbar-badge-fading");
				fadeTimer = setTimeout(hide, 400);
			},
			hide,
			isShown: () => !root.hidden,
			remove() {
				stopFade();
				root.remove();
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
	var INPUT_OVERLAY = "game-input-overlay";
	function gameOwnsCursor() {
		return document.getElementById(INPUT_OVERLAY)?.style.cursor === "crosshair";
	}
	function iconSource(item, icon) {
		return item.querySelector(`img[alt="${icon}"]`)?.src || null;
	}
	function iconCentre(item) {
		const box = item.getBoundingClientRect();
		if (box.width === 0 || box.height === 0) return null;
		return {
			x: box.left + box.width / 2,
			y: box.top + box.height / 2
		};
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
	var BADGE_SECONDS_OPTION = "badge-seconds";
	var hotbarReadout = {
		id: "hotbar",
		name: "Hotbar cheap window",
		options: [{
			key: BREATHING_OPTION,
			name: "Breathing pulse",
			whenUnset: true
		}, {
			key: BADGE_SECONDS_OPTION,
			name: "Seconds the badge stays",
			whenUnset: "3.5"
		}],
		attach(context) {
			const readouts = injectedNodes({
				findHosts: findHotbars,
				draw: draw$1,
				nodesOf: (readout) => readout.nodes
			});
			context.onDetach(() => readouts.remove());
			const badge = createBadgeNode();
			let fadeTimer;
			let cursor = null;
			let affordable = null;
			function hideBadge() {
				clearTimeout(fadeTimer);
				fadeTimer = void 0;
				badge.hide();
			}
			context.onWindowEvent("mousemove", (event) => {
				cursor = {
					x: event.clientX,
					y: event.clientY
				};
			}, { capture: true });
			context.onDetach(() => {
				hideBadge();
				badge.remove();
			});
			function announce(cues) {
				if (!cursor || gameOwnsCursor()) return;
				const icons = [];
				const centres = [];
				for (const cue of cues) {
					const source = iconSource(cue.item, cue.icon);
					const centre = iconCentre(cue.item);
					if (!source || !centre) continue;
					icons.push(source);
					centres.push(centre);
				}
				const target = aimPoint(centres);
				if (!target) return;
				clearTimeout(fadeTimer);
				if (!badge.show(icons, cursor, target)) return;
				fadeTimer = setTimeout(() => badge.fade(), stayMs(context.optionText(BADGE_SECONDS_OPTION)));
			}
			return { tick() {
				const me = context.game.myPlayer();
				if (!isMatchLive(context.game) || !me) {
					readouts.remove();
					hideBadge();
					affordable = null;
					return;
				}
				const gold = me.gold();
				const breathing = context.isOptionEnabled(BREATHING_OPTION);
				const ready = new Map();
				for (const readout of readouts.sync()) for (const cue of readout.cues) if (update$1(cue, readout.hotbar, gold, breathing)) ready.set(cue.type, cue);
				const before = affordable;
				affordable = new Set(ready.keys());
				if (!before) return;
				if (gameOwnsCursor()) hideBadge();
				const arrived = [...ready].filter(([type]) => !before.has(type));
				if (arrived.length > 0) announce(arrived.map(([, cue]) => cue));
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
				icon: cued.icon,
				item,
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
		return ready;
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
			const near = mark.isYou ? void 0 : pointers.find((pointer) => !pointer.isYou && Math.hypot(pointer.x - x, pointer.y - y) < 70);
			if (near) near.count++;
			else pointers.push({
				x,
				y,
				angle: Math.atan2(dy, dx),
				count: 1,
				colour: mark.colour,
				isYou: mark.isYou
			});
		}
		return pointers;
	}
	var LAYER = "ofx-spawn-marks";
	var OUTLINE = "rgba(0,0,0,0.85)";
	var TEXT_OUTLINE = "rgba(0,0,0,0.9)";
	var YOUR_COLOUR = "#ffffff";
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
			drawText(ring.name, ring.x, ring.y - nameBaseline(unit), nameFontPx(unit), ring.isYou ? YOUR_COLOUR : ring.colour);
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
			const colour = pointer.isYou ? YOUR_COLOUR : pointer.colour;
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
			ctx.fillStyle = colour;
			ctx.fill();
			ctx.restore();
			if (pointer.count < 2) return;
			const back = COUNT_BACK * CHEVRON_SCALE;
			drawText(`×${pointer.count}`, pointer.x - Math.cos(pointer.angle) * back, pointer.y - Math.sin(pointer.angle) * back, COUNT_FONT * CHEVRON_SCALE, colour);
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
			update(players, nowMs) {
				const live = new Set();
				for (const player of players) {
					live.add(player.id);
					const known = tracked.get(player.id);
					if (!known) {
						tracked.set(player.id, {
							name: player.name,
							colour: player.colour,
							isYou: player.isYou,
							fromX: player.x,
							fromY: player.y,
							toX: player.x,
							toY: player.y,
							startedAt: nowMs
						});
						continue;
					}
					known.name = player.name;
					known.colour = player.colour;
					known.isYou = player.isYou;
					if (known.toX !== player.x || known.toY !== player.y) {
						const here = place(known, nowMs);
						known.fromX = here.x;
						known.fromY = here.y;
						known.toX = player.x;
						known.toY = player.y;
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
					isYou: mark.isYou,
					...place(mark, nowMs)
				}));
			},
			clear: () => tracked.clear()
		};
	}
	function fadeAlpha(endedAtMs, nowMs) {
		return Math.min(1, Math.max(0, 1 - (nowMs - endedAtMs) / FADE_MS));
	}
	function readMarkedPlayers(game, includeNations) {
		const me = game.myPlayer();
		if (!me) return [];
		const marked = [];
		for (const player of game.players()) {
			if (player.id() === me.id() || !player.isOnSameTeam(me)) continue;
			if (!isMarkedTeammate(player, includeNations)) continue;
			const mark = readMark(game, player, false);
			if (mark) marked.push(mark);
		}
		const mine = readMark(game, me, true);
		if (mine) marked.push(mine);
		return marked;
	}
	function readMark(game, player, isYou) {
		const tile = player.state.spawnTile;
		if (tile === void 0) return null;
		const { r, g, b } = player.territoryColor().toRgb();
		return {
			id: player.id(),
			name: player.displayName(),
			x: game.x(tile),
			y: game.y(tile),
			colour: `rgb(${r},${g},${b})`,
			isYou
		};
	}
	function isMarkedTeammate(player, includeNations) {
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
					tracker.update(readMarkedPlayers(game, context.isOptionEnabled(NATION_TEAMMATES_OPTION)), now);
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
				const marks = tracker.marks(now).sort((a, b) => Number(a.isYou) - Number(b.isYou));
				for (const mark of marks) {
					const at = hooks.camera.worldToScreenCoordinates(mark);
					const { name, colour, isYou } = mark;
					if (at.x > 0 && at.y > 0 && at.x < width && at.y < height) rings.push({
						...at,
						name,
						colour,
						isYou
					});
					else offScreen.push({
						...at,
						colour,
						isYou
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
		spawnMarks,
		alliancePanel
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
