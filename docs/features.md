# Features in detail

This page says exactly what each feature shows, and when. The [README](../README.md) has the short version, with screenshots.

The **HUD** is the always-visible panel at the bottom of the game screen. It shows troops, gold and the attack slider. The vocabulary this project uses is in [CONTEXT.md](../CONTEXT.md).

## Spawn markers

The **spawn phase** is the opening of a match, while every player picks where to start. The markers help you find your own spawn and, in a team game, each of your teammates on the map.

Your own **spawn** and each human teammate's spawn carry a ring with the player's name above it. The ring is in that player's own territory colour. The name is in the same colour, except your own name, which is white. Your marker is drawn over the others. A dark outline keeps the ring readable on land of the same colour. The ring grows and shrinks with the zoom, and it breathes a little. The name stays still above it. The markers sit over the game's own pulse, and they never change a colour of the game's.

A marker that is off screen gets a chevron on the edge of the screen, pointing at it. A teammate's chevron is in the teammate's colour, and yours is white. Teammates' chevrons that land close together become one chevron with a count, such as `×3`. Your chevron never joins them. The chevrons stay clear of the bottom row of the HUD.

When a player picks another spawn, the marker glides to it. When the spawn phase ends, the markers fade over about a second and go. A game without teams draws your marker alone. A replay draws nothing.

The game draws its own pulse for you and for human teammates only, and so do the markers. A solo game has one human, so it shows your marker alone. [Development](development.md#spawn-markers-in-a-solo-game) explains how to see teammates' markers in a solo game.

The markers were checked in a solo game with Nation teammates. They have not yet been checked in a game with several real humans.

## Best troop level

**Regeneration** is the troops the game gives you each tick for free. How fast they arrive depends on how full your army already is. The rate rises, peaks near 42% full, and falls to zero once your army is full. So a full army grows at nothing, and an army held near 42% grows fastest.

The readout adds two things inside the troop bar.

- A violet strip along the bar's bottom edge. It covers **the plateau**, meaning every troop level where regeneration stays within 5% of the best rate you could reach at any level. That runs from 30.6% to 54.3% full, about a quarter of the bar.
- Your **share of best rate** at the bar's far right, as a percentage. It reads 100% at the peak and 0% at a full army. The game shows this figure nowhere else.

Nothing marks the 42.2% level itself, and nothing changes colour when you cross it. The top of the curve is flat, so there is no cliff to draw. [ADR-0004](adr/0004-the-optimal-troop-level-is-drawn-as-a-band.md) holds the reasoning and the numbers, and two drawings that were built and turned down first.

The percentage can be switched off on its own, in the settings panel. The strip stays. The percentage is hidden on screens narrower than 64rem.

## Cheap building alerts

The **hotbar** is the row of ten build icons at the bottom of the HUD. A city, a port and a factory each pass through three prices before the price stops rising: 125,000, then 250,000, then 500,000. The fourth price is one million, and it never changes again. The part of a match where the next one still costs less than a million is **the cheap window**. It is short, it falls at the start, and missing it is what this readout prevents.

### Marks and light

The readout adds two things to three of the ten icons. The other seven are left alone.

- Three **step marks** under the icon. The number of lit marks is the price of the next one: one mark for 125,000, two for 250,000, three for 500,000. They are amber while you can afford it and light grey while you cannot, so you can read the price with or without the gold. They disappear once the price reaches one million, and that absence is what tells you the cheap window is over.
- A **light**, meaning an amber ring around the icon's box. It appears the moment you can afford the thing. It pulses three times quickly, then twice more slowly, and settles into a slow steady pulse, which is called **the breathing pulse**. It goes out when you build the thing, or spend the gold elsewhere.

The light appears again at each of the three prices. With 900,000 in hand you can build three cities in a row, and it lights for each one. A port and a factory are counted together, so building either one raises the price of both, and the marks move on their own. Losing a structure lowers the price, and both the marks and the light come back.

The readout is amber rather than the violet the rest of the package uses. The hotbar boxes are small, and amber reads brighter at that size.

The breathing pulse can be switched off on its own, in the settings panel. The three quick pulses and the marks stay.

### The reminder under the mouse

The light sits about 600 pixels from where your eyes are in the opening minutes, so it also comes to the cursor. The moment a city, a factory or a port becomes affordable, a **badge** appears. The badge is a small amber panel with the icon of that building. An arrow under it points down to the building's own icon in the hotbar.

- The badge is centred under the cursor, 50 pixels below it. It is never beside the cursor or above it, because that is where you are about to click.
- It stays where it appeared, pulses about once a second, and fades after 3.5 seconds. It takes no clicks.
- The arrow never leans more than 55 degrees from straight down.
- A port and a factory share one price, so they often become affordable together. They get one badge with two icons and one arrow between them.
- The badge stays away while the game draws its own red crosshair, which is while a warship is selected and while Shift is held. It also stays away when the cursor is too close to the bottom of the screen to leave room below it.

The badge belongs to the hotbar readout, so switching the readout off removes it. The settings panel sets how long it stays, from 0.5 to 30 seconds.

The game removes the hotbar below 64rem, and the readout and the badge go with it.

## Alliance timers

The panel lists your own alliances in the top right corner of the HUD, under the game's own buttons. Each row holds the partner's name and the time that alliance has left, written `2:07`. The game already shows an alliance's time in other places, but only one alliance at a time. This is the one place that shows all of them together.

### Order and kinds of row

The list runs downward in time. The alliance with the most time left is at the top, and the one nearest its end is at the bottom. That looks upside down at first. It is right because the list also holds the past: an alliance that just ended stays at the bottom for 15 seconds, and the clock beside it counts up. Finished rows on top would push the one alliance you can still save down the list.

There are three kinds of row. Two of them carry a word, so you can tell them apart.

- An alliance you are in. It has no word.
- An **alliance request** aimed at you, marked `asks you`. Its clock is the time you have left to answer. The game refuses a request by itself after 20 seconds.
- An alliance that **ended** because the two partners did not renew it, marked `ended`. It is grey.

A broken alliance is not in the list. A betrayal is not a renewal you forgot, and the game already announces it.

### The bar

Each row is also a **bar** that empties as the time runs out. A full bar is a whole alliance, and an empty one is the end. For a request, the whole is the 20 seconds you have to answer. An ended alliance has an empty bar.

The bar turns red once the game offers to renew that alliance, which is the last 30 seconds by default. It goes back to blue when you agree, because the game stops offering after that. It stays red if only your partner agreed.

### Pointing and clicking

Rest the cursor on a row and the map shows that player on their own. It is the alliance map's grey map with one player left in their own colours. It shows no ally and no clock, only that player. Allies are usually far away, so when that player is off screen a **pointer** appears: an arrow in that player's own colour, turned toward them, with their name under it. The pointer keeps clear of the bottom of the screen, where the game's own bars sit. It goes when the player is on screen, because their colour already shows. Move the cursor off the panel and the map goes back.

- A short rest is needed first, so a cursor that only crosses the panel does nothing.
- The hold key of the alliance map wins while you hold it.
- This needs the alliance map to be switched on. The panel itself works without it.

A click on a row moves the camera to that player. That is all a click does. There is no renew button, because the package never sends a message to the game on your behalf. [ADR-0009](adr/0009-the-package-changes-your-view-never-the-game.md) holds the reasoning. Renew from the game's own menu.

### When the panel is empty

The panel is not on the screen when it has no row. It never scrolls, because a scrolling list would hide the row closest to its end. It draws nothing before you spawn, after you die, or in a replay. It reads what the game sends each tick, so a request that arrived before you switched the panel on is not shown.

## Alliance map

Hold the backquote key, which is the key it comes with. The whole map turns grey, except one player, everyone they are allied with, and their teammates in a team match. Those keep their own colours.

### The subject

That player is the **subject**. The cursor picks it, and it sticks: it changes only when the cursor reaches another player. So sweeping across ocean does not throw it away. The first press has no subject, so the map greys and nothing is coloured until the cursor finds someone. Let go and the subject is forgotten, so the next press is a fresh look.

Only the subject's own alliance partners and teammates are coloured. An ally's own allies get nothing.

### The grey and the clocks

Every other player turns a dark grey of their own. Each grey keeps a faint trace of that player's colour, so the border between two greyed neighbours stays visible. The land and the sea turn grey as well. Late in a match you may be allied to everyone, and nobody is left to grey. The grey terrain still tells you the mode is on.

Each ally carries a clock under their name, saying how long that alliance has left. It turns red once the game starts offering to renew that alliance. The subject carries no clock, and that is the only thing that tells the two apart. A teammate has no alliance, so it carries no clock either. The mode never marks a player's colour to say something, because a player is known on the map by that colour. [ADR-0008](adr/0008-information-by-position-and-text-never-by-changing-a-real-colour.md) holds the reasoning.

The player names on the map lose their coloured outline while the key is down, because the game draws that outline from the same colours the mode rewrites. The letters keep their own colour, and the outline comes back when you let go.

### When the mode stands down

- While one of the game's own pop-up panels is open, such as the chat or the leaderboard, because the game dims the map behind those.
- While you hold the game's own view key, normally space. Under that view the game draws no territory at all, so there is nothing left to colour.

### Changing the key

The hold key is yours to change in the settings panel. Click the key, then press the new one. The panel refuses a key the game already uses, and names the game action that holds it.

If you later give the game that key in the game's own settings, the mode refuses to run on it and says so in the console, and the settings panel shows the clash in red. Stealing a key you configured yourself is worse than not running at all.

## Nation stripes

The game has three kinds of player. A **human** is a person at a keyboard. A **nation** is a player the game controls, which plays like a country. Its name and its start point come from the map, so it often carries a real country's name. A **bot** is a small player the game controls, which the game already draws in grey.

A human may take a country's name, so a name alone never proves that a player is a nation. The game knows each player's kind from the first moment of the match. The stripes show that kind on the map.

Thin diagonal stripes cover each living nation's territory, for the whole match. Each stripe is a dark line with a light line beside it, so the stripes show on a light territory and on a dark one. The stripes are laid on the screen, not on the map, so their spacing stays the same at every zoom. The territory's own colour stays visible between them. When a nation dies, its stripes go with its territory. The stripes follow the territory about twice a second.

The stripes are hidden in three cases:

- In a Humans vs Nations game. The team colour already shows which players are nations.
- While the alliance map is on. The grey map is there to show alliances.
- While the game's own alternate view is on, from its key or from its settings menu. That view draws each territory in a colour that shows your relation to its owner, and the stripes would cover it.

The stripes sit under the spawn markers and the alliance clocks. They also sit over everything the game draws on a nation's land: its name, its borders, its buildings and its units. The game draws all of these and the territory on one canvas, so the stripes cannot slide between them.

## Settings panel

Click **Extended UI** to open the **settings panel**. The row is in two places:

- Outside a match, at the top of the game's settings page, which **SETTINGS** in the top bar opens.
- In a match, in the game's settings menu, which the gear in the top right corner opens. In a solo game this menu pauses the game, so a readout redraws only after you close it.

The panel works this way:

- Each feature has a row with a switch. Its options sit under it, and they grey out while the feature is off.
- A change applies at once, without waiting for the next match. There is no Save button.
- **Reset to defaults** puts every feature and every option back, including the options the panel does not show. It asks for a second click within 3 seconds.
- Escape, the × button, or a click outside the panel closes it.

Choices are kept in the browser's `localStorage` and survive a reload. The browser console does the same as the panel. [Development](development.md#the-browser-console) lists its commands.
