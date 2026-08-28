# openfront-extended-ui

A userscript that adds readouts to the OpenFront.io game view from outside the game. It changes nothing in the game. It runs beside it and reformats numbers the game already shows somewhere.

## Language

### What the package adds

**Feature**:
Any one of the six things the package adds, whether it is a readout or the view mode. It is the word the code uses, because both kinds register the same way and both can be switched off on their own.
_Avoid_: addition, module, plugin

**Readout**:
One of the package's features that reformats numbers the game already shows, drawn in the HUD. There are five.
_Avoid_: widget, panel, overlay, module

**View mode**:
A feature that changes how the map is coloured instead of reporting a number. There is one, the alliance view mode. It is not a readout.

**Surface**:
Where a feature draws. There are two, the HUD and the map. A decision about one carries nothing to the other.

**Signature colour**:
Violet. It marks a figure the package worked out itself. The game's own colours keep the game's meanings, so gold stays yellow and troops stay blue.
The game does use a little purple, so violet is not unused: `PlayerPanel.ts` marks a Nation with indigo and a Bot with purple, and two modals use `bg-indigo-600` for their primary button. None of it appears on the HUD's bottom row, which is the only place these readouts draw, so violet still reads as foreign there.
_Avoid_: accent, brand colour, highlight

### The game's own furniture

**HUD**:
The always-visible panel at the bottom of the game showing troops, gold and the attack slider.
_Avoid_: toolbar, interface, control panel (`control-panel` names one element inside the HUD, not the HUD)

**Troop bar**:
The bar in the HUD that fills as your army grows, drawing your troops against your maximum.

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

### Gold

**Flat income**:
The gold every player receives each tick whatever they own. A lobby setting scales it.
_Avoid_: base income, passive income

**Trade income**:
Gold from a trade ship arriving at your port.
_Avoid_: trade gold, port income

**Captured ship**:
A trade ship taken by another player before it reached its destination, so its gold goes to the captor instead.
