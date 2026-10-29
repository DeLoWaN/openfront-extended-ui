# What we know about OpenFront

These files hold facts about the base OpenFront game that this userscript depends on. A fact here took someone a read of the game's code or a test in a real match to find. Read the file for your topic before you search the game's code yourself.

## Topics

| File | Read it when you need to |
| --- | --- |
| [access.md](access.md) | reach the game's state from the page: elements, the `GameView` object, players, ticks, and the match lifecycle |
| [events.md](events.md) | listen to the game's event bus, or read the intents a player sends |
| [rendering.md](rendering.md) | draw on the map, read the camera or the player colours, or place an element in the HUD |
| [economy.md](economy.md) | work with troops, gold, unit prices, trade, the hotbar, or keybinds |
| [alliances.md](alliances.md) | read alliances, their durations, and their renewal |
| [spawn.md](spawn.md) | work with the spawn phase at the start of a match |
| [testing.md](testing.md) | test a script against the live game |

The project's own build and unit tests are in [development.md](../development.md).

## How to read a fact

Each fact has a title, a short text, and these lines:

- `Checked at`: the commit of the game repository where someone last checked the fact. `source only` means that someone read the code but never saw the fact in a match. `live game` means that someone saw the fact in a match on the public site, where the commit is unknown. `unknown` means that the source gave no commit and no date.
- `Game source`: the file and line in the game repository, at the `Checked at` commit. `none, seen in a match` means that nobody found the code behind the fact. The game moves files between versions, so read the path at that commit: `git -C ~/git_perso/OpenFrontIO show <commit>:<path>`.
- `Used in`: the file of this project that depends on the fact. The comment in that file holds the full detail, and it is the reference.
- `Found in`: the GitHub issue or the research branch where the fact comes from. A fact that only the project code states has no `Found in` line.

When two sources disagree, the fact says `Sources disagree. Check before use.` and gives both claims.

## Check a fact before you rely on it

The game changes fast, so a fact can be wrong at the current version. A clone of the game repository lives at `~/git_perso/OpenFrontIO`. Its `origin` remote is the official repository, `openfrontio/OpenFrontIO`.

1. Fetch the latest game code:

   ```bash
   git -C ~/git_perso/OpenFrontIO fetch origin
   ```

2. Read the file at the current version:

   ```bash
   git -C ~/git_perso/OpenFrontIO show origin/main:<path>
   ```

   If the path no longer exists, find where the file went:

   ```bash
   git -C ~/git_perso/OpenFrontIO log -M --diff-filter=R --name-status --format='%h %s' <commit>..origin/main | rg -F <path>
   ```

3. If the fact still holds, update its `Checked at` line. If it does not, correct the fact and the code that uses it.

## Where the raw research is

The facts come from the closed issue [#1](https://github.com/DeLoWaN/openfront-extended-ui/issues/1) and its child issues. The resolution comments of the research issues #2, #3, #4 and #12 hold the most detail. Two research reports live only on branches that nobody merges:

- `research/spawn-pulse-tuning`, file `docs/research/spawn-pulse-tuning.md`
- `research/spawn-test-bed`, file `docs/research/spawn-test-bed.md`

Read these only when a fact here is too short for your need.
