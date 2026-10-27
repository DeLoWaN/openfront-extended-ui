# openfront-extended-ui

A userscript that adds readouts to the OpenFront.io game view from outside the game. It changes nothing in the game. It runs beside it and reformats numbers the game already shows somewhere.

## Language

### What the package adds

**Feature**:
Any one of the five things the package adds, whether it is a readout, the view mode or a locator. It is the word the code uses, because all three kinds register the same way and each can be switched off on its own.
_Avoid_: addition, module, plugin

**Readout**:
One of the package's features that reformats numbers the game already shows, drawn in the HUD. There are three.
_Avoid_: widget, panel, overlay, module

**View mode**:
A feature that changes how the map is coloured instead of reporting a number. There is one, the alliance view mode. It is not a readout.

**Locator**:
A feature that draws a mark on the map, at a place the game already knows, so a player can find that place. It reports no number and recolours nothing, so it is neither a readout nor a view mode. There is one, the spawn marks.
_Avoid_: marker, pin, annotation, overlay

**Subject**:
The player the alliance view mode draws its map around. The cursor picks it, and it stays until the cursor reaches another player, so the subject is not always the player under the cursor.
_Avoid_: hovered player, target, focus

**Alliance panel**:
The readout in the top right corner of the HUD that lists your alliances, with the time each one has left. It also lists the alliance requests aimed at you, and the alliances that just ran out. Each row is a bar that empties as the time runs out. It sends nothing, and a click on a row only moves the camera.
_Avoid_: alliance list, alliance tracker

**Spotlight**:
One player the alliance view mode shows on its own, with no key held. The map greys and only that player keeps their colour. The alliance panel sets it while the cursor rests on a row. It is the alliance view mode with no allies and no clocks. When that player is off screen, an arrow at the screen's edge points to them.
_Avoid_: highlight, hover mode, focus

**Surface**:
Where a feature draws. There are two, the HUD and the map. A decision about one carries nothing to the other.

**Signature colour**:
Violet. It marks a figure the package worked out itself. The game's own colours keep the game's meanings, so gold stays yellow and troops stay blue.
The game does use a little purple, so violet is not unused: `PlayerPanel.ts` marks a Nation with indigo and a Bot with purple, and two modals use `bg-indigo-600` for their primary button. None of it appears on the HUD's bottom row or in its top right corner, which are the places these readouts draw, so violet still reads as foreign there.
The rule covers figures. A mark that carries no figure picks its own colour, from what it has to cut through rather than from this entry. The step marks are amber for that reason.
_Avoid_: accent, brand colour, highlight

**Step marks**:
The three short marks the package draws under a hotbar icon. The number of lit marks is the price step of the next city, port or factory. They are amber while you can build it and light grey while you cannot.
_Avoid_: chip, pips, dots, progress bar

**Badge**:
The small amber panel the hotbar readout draws under the cursor when a city, a factory or a port becomes affordable. It carries that building's icon, and an arrow under it points to the icon in the hotbar. It stays where it appeared and fades after 3.5 seconds.
_Avoid_: toast, popup, tooltip, notification

**Settings panel**:
The package's own panel, opened from an Extended UI row: in the game's in-match settings menu, or at the top of the game's settings page outside a match. In it a player switches each feature on or off and sets its options. It is not a feature, because nothing switches it off.
_Avoid_: settings modal (that is the game's own menu), options menu

### The game's own furniture

**HUD**:
The game's own panels that stay on screen for a whole match, around the edges of the map. The bottom row holds troops, gold and the attack slider. The top right corner holds the game's own buttons, such as settings and leaderboard.
_Avoid_: toolbar, interface, control panel (`control-panel` names one element inside the HUD, not the HUD)

**Bottom row**:
The part of the HUD along the bottom of the screen. Two of the three readouts draw there.
_Avoid_: bottom bar, main HUD

**Troop bar**:
The bar in the HUD that fills as your army grows, drawing your troops against your maximum.

**Hotbar**:
The row of ten build icons under the control panel, which the game names in `HotbarIcons.ts` and builds in `UnitDisplay.ts`. One click on an icon starts placement. The game removes it below 64rem.
_Avoid_: unit display, build bar, toolbar

**Build menu**:
The grid of ten build buttons that opens on Ctrl and click. It is one of three build surfaces, with the hotbar and the radial menu, and it is the only one that keeps shadow DOM.

### Troops

**Troops**:
Soldiers available to you now. Excludes soldiers already sent into an attack.
_Avoid_: army, population, soldiers

**Committed troops**:
Soldiers sent into an outgoing attack. They leave your troops the moment the attack launches, so they stop feeding regeneration.
_Avoid_: attacking troops, troops in flight

**Displayed troops**:
A troop count as the game prints it on screen. The game's internal count is ten times larger, so every troop figure has to say which of the two it is.
_Avoid_: real troops, actual troops

**Regeneration**:
The troops the game gives you each tick for free. The rate depends on how full your army already is.
_Avoid_: troop growth, troop income, regen (income means gold)

**Regeneration curve**:
The shape of the regeneration rate across every troop level. It rises, peaks near 42% full, and falls to zero at your maximum.

**Share of best rate**:
Your regeneration now, as a fraction of the most you could get at any troop level. 100% at the peak, 0% at your maximum. The game shows this figure nowhere.
_Avoid_: efficiency, regen percentage

**The 42.2% level**:
The troop level where regeneration peaks. It is a limit the game approaches as your army grows rather than an exact point, and the true peak sits slightly below it.
_Avoid_: the optimum, the sweet spot, the threshold

**The plateau**:
The flat top of the regeneration curve. Every level from 30.6% to 54.3% full stays within 5% of your best rate. This is why the 42.2% level is not a cliff, and it is the thing the troop bar readout draws.
_Avoid_: the optimal zone, the sweet spot, the band (say "the plateau", and "the strip" for the mark that draws it)

**Crossing**:
Passing the 42.2% level from below. It is the signal to spend troops, because troops above the level are unspent, not because regeneration collapsed.

### Building prices

**Price step**:
One of the three prices a city, a port or a factory passes through before the price stops rising: 125,000, then 250,000, then 500,000. The fourth price is one million and it never changes again.
_Avoid_: tier, level, bracket

**Price pool**:
The count a price is worked out from. A port and a factory share one pool, so building either one raises the price of both. A city has a pool of its own. Losing a structure lowers the pool, so the next one gets cheaper.

**The cheap window**:
The part of a match where the next city, port or factory still costs less than one million. It is short, it falls at the start, and missing it is what the hotbar readout exists to prevent.
_Avoid_: early game, opening
### Alliances

**Alliance**:
An agreement between two players that ends by itself. It runs five minutes by default, and a lobby setting takes that from one minute to fifteen. Being on the same team is a different relation, and a teammate is not an alliance partner.
_Avoid_: pact, treaty, truce

**Renewal window**:
The last 30 seconds of an alliance. It is the only time the game lets a partner agree to renew, and both partners have to agree before the alliance runs on. The game marks the window: the alliance icon beside the player's name on the map flashes, and a prompt appears in the events display.
_Avoid_: extension window, expiry window, grace period

**Expired alliance**:
An alliance that reached its end because the two partners did not both renew it. The game reports it separately from one a player ended early, so the two never have to be told apart by guesswork.
_Avoid_: lapsed alliance, lost alliance, dead alliance

**Broken alliance**:
An alliance a player ended early. The game calls that player a traitor and makes them pay for it.
_Avoid_: cancelled alliance, betrayed alliance

**Alliance request**:
One player's offer of an alliance to another. It refuses itself after 20 seconds if the other player does not answer. It is not a renewal, which only exists between two players who are already partners.
_Avoid_: alliance invite, alliance proposal

### The start of a match

**Spawn phase**:
The opening of a match, while every player picks where to start. A player may change their pick until it ends, except in a random-spawn game.
_Avoid_: lobby, pre-game, setup

**Spawn**:
The place a player has picked to start from. It is a small patch of land, and the player's territory grows from it.
_Avoid_: start point, start position

**Teammate**:
A player on your own team in a team game. A teammate is not an alliance partner.
_Avoid_: ally (the alliance view mode uses it for an alliance partner), friend

**Spawn pulse**:
The breathing glow the game draws on your own spawn and on each human teammate's spawn during the spawn phase. A teammate's glow is in that teammate's own colour. Yours is larger and goes from white to your colour, or to gold when you have no team.
_Avoid_: ally pulse, highlight, beacon

**Spawn mark**:
What the spawn marks feature draws on your own spawn and on each teammate's spawn during the spawn phase: a ring in that player's own territory colour, with the player's name above it. Your own name is white, so your mark stands apart from your teammates' marks. Your mark also shows in a game without teams. It sits over the spawn pulse and does not replace it. It ends with the spawn phase.
_Avoid_: beacon, ping, ally marker

**Edge pointer**:
A chevron on the edge of the screen that points at a spawn mark that is off screen. A teammate's pointer takes the teammate's colour, and yours is white. Several teammates' pointers that land close together become one pointer with a count. Yours never joins them.
_Avoid_: arrow, off-screen indicator, compass
