# Throwaway for issue #35: which mark makes a teammate's spawn easy to find?

This is a throwaway. It answers [issue #35](https://github.com/DeLoWaN/openfront-extended-ui/issues/35) and then stays on this branch. Do not import it and do not extend it.

## How to run it

1. Start the game: `zsh -lc 'cd ~/git_perso/OpenFrontIO && npm run dev'`. It serves on `localhost:9000`.
2. Install `spawn-mark.user.js` in the userscript manager, or paste it into the browser console. Its `@match` lines cover `localhost:9000` and `openfront.io`.
3. Open Single Player. Pick map **World**, mode **Teams**, team size **Quads**. Set Tribes (bots) to 0. Leave Nations at 72, which gives 19 teams.
4. Start the game and **do not click the map**. A solo game has no spawn timer, so the spawn phase lasts until the click.

The bar at the bottom of the screen switches the marks. The `[` and `]` keys switch too. The arrow keys move the game's camera, so the script does not use them.

## The five marks

| | Mark | Idea |
| --- | --- | --- |
| A | Ring | A hollow ring around the spawn. It never covers the spawn itself. |
| B | Pin with name | A map pin whose tip is on the spawn, with the teammate's name above it. |
| C | Reticle | Four corner brackets that turn slowly, plus four ticks. |
| D | Bobbing arrow | A large arrow above the spawn that bobs and points down at it. |
| E | Game pulse, bigger | The game's own ring at 14, 30 or 60 tiles, in the team colour. |

E is drawn here as a stand-in, because the game draws a spawn pulse for humans only and a solo game has one human. The script also writes the real teammate radii into `window.__webglView.getSettings().spawnOverlay`, so a game with real humans shows the real ring.

## The knobs

| Knob | Values |
| --- | --- |
| colour | white, violet, amber. Each over a dark outline. E keeps the team colour. |
| size | A to D: fixed, fixed large, grows with the zoom. E: 14, 30, 60 tiles. |
| edge pointer | A chevron at the screen edge for a teammate who is off screen. Chevrons within 34 px merge into one with a count. The pointer stays 130 px above the bottom edge, to stay clear of the game's bottom row. |
| teammates | The 3 real ones, then stand-ins taken from the other Nations: 8, 16, 32. |
| end | `fade` over 1.2 s after the spawn phase ends, or `vanish`. |
| move | `jump` when a Nation re-picks its spawn, or `glide` over 350 ms. |

## What to judge

- Can you find every teammate at the default zoom?
- Can you find every teammate with the whole map in view? A spawn is about 5 px wide there.
- Does the edge pointer earn its place when you zoom in? Test it with 8, 16 and 32 teammates.
- Does a mark cover a neighbour's mark or the game's own text?
- Does `fade` or `vanish` read better when you click a spawn?
- Does `glide` or `jump` read better when a Nation re-picks its spawn?

## Checked while building

- With Quads on World, `myPlayer()` is non-null in the spawn phase and `players()` gives the 3 Nation teammates, each with a `spawnTile`.
- `window.__webglView` and `build-menu.transformHandler` both exist during the spawn phase, and `getSettings().spawnOverlay` is writable.
- All five marks draw. The edge pointer was not yet judged.

## Verdict

Chosen by the player on screen, in a solo Quads game on World with 72 Nations:

| Knob | Value |
| --- | --- |
| Mark | A, ring with name |
| colour | team (the teammate's own territory colour, over a dark outline) |
| size | grows with zoom |
| edge pointer | on |
| end | fade |
| move | glide |

The numbers in the script at that point:

- The ring has a radius of 16 px times `u`. `u` is `scale / 0.864`, kept between 0.35 and 4. At the whole-map view on World, `u` is about 0.67, which is a ring of about 11 px.
- The ring breathes by 2 px about once a second. The name does not move with it: it sits 8 px above the ring at rest.
- The name is bold, 12 px times `u` with a floor of 11 px, in the mark's colour over a dark outline.
- The edge chevron is 2.4 times the first drawing, about 60 px long. Chevrons within 70 px of each other merge into one with a count, `×N`. They keep 60 px from the left, right and top edges and 150 px from the bottom edge, which is where the game's bottom row sits.
- The mark fades over 1.2 s when the spawn phase ends.
- A mark glides over 350 ms when a Nation re-picks its spawn.

The two pictures show the chosen mark. `chosen-mark-zoomed-with-pointer.jpg` was taken before the name was pinned in place, so its name sits a little lower than the final code puts it. `chosen-mark-final-code.jpg` is the final code, zoomed on Brazil.

Not checked, and left for the build:

- A game with several real humans. A solo game has Nations only, and the game draws no pulse for a Nation.
- Two teammates close together, where two names may overlap.
- A pointer under one of the game's own panels other than the bottom row.
