# openfront-extended-ui

## Releases

Every pull request that changes the userscript is a new version:

1. In the pull request, raise `version` in `package.json`, following semantic versioning: a fix raises the patch number, a new feature raises the minor number. Then run `npm run build` and commit `dist/`. The build copies the version into the userscript's `@version`, and Tampermonkey installs an update only when that number goes up.
2. After the pull request is merged, create a GitHub release on `main`, tagged `v<version>`, with the built userscript attached:

   ```bash
   gh release create v<version> dist/openfront-extended-ui.user.js --target main --title v<version> --generate-notes
   ```

## Feature docs

A pull request that adds a feature, or changes what a feature shows or how it behaves, updates the player docs in the same pull request:

1. `README.md`: one short section per feature, with a screenshot and a "More details" link. Keep it to what a player needs.
2. `docs/features.md`: the full behaviour of the feature.
3. `docs/images/`: a new screenshot for a new feature, or a fresh one when a feature changes how it looks. Take it as `docs/development.md` describes under "Screenshots", at 1440 by 900.

A pull request is not finished while a feature in it has no screenshot, or shows an old one.

## Agent skills

### Issue tracker

Issues live as GitHub issues on `DeLoWaN/openfront-extended-ui`, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels are used as-is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.
