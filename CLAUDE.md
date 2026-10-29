# openfront-extended-ui

## Releases

Every pull request that changes the userscript is a new version:

1. In the pull request, raise `version` in `package.json`, following semantic versioning: a fix raises the patch number, a new feature raises the minor number. Then run `npm run build` and commit `dist/`. The build copies the version into the userscript's `@version`, and Tampermonkey installs an update only when that number goes up.
2. After the pull request is merged, create a GitHub release on `main`, tagged `v<version>`, with the built userscript attached:

   ```bash
   gh release create v<version> dist/openfront-extended-ui.user.js --target main --title v<version> --generate-notes
   ```

## Facts about the game

`docs/openfront/` holds what we know about the base OpenFront game:

- how a script reaches into the game
- the game rules and balance values
- how to test against the live game

Each fact names the OpenFrontIO commit where someone last checked it.

1. Before you search the game's code, read `docs/openfront/README.md` and the topic file it points to.
2. Before you rely on a fact, check it against the current game. The game changes fast, so an old fact can be wrong. A clone of the game lives at `~/git_perso/OpenFrontIO`, and its `origin` remote is the official repository:

   ```bash
   git -C ~/git_perso/OpenFrontIO fetch origin
   git -C ~/git_perso/OpenFrontIO show origin/main:<path>
   ```

   If the fact still holds, update its commit. If not, correct the fact.
3. When your work finds a new durable fact, add it to `docs/openfront/` in the same pull request. A durable fact meets two conditions:
   - You had to read the game's code or test in a match to find it.
   - Another feature can use it.

   A research ticket has the label `wayfinder:research` and no pull request of its own. When you close one, open a small documentation pull request with its facts.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `DeLoWaN/openfront-extended-ui`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels are used as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
