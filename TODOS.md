# TODOS

Every check, built or wanted, lives in `docs/checks.md`. This file holds the rest of the backlog: work that is not a check.

## Release

- Every old check is ported (✅ in `docs/checks.md`) and the old code is removed. Ship the rewrite as a new major version.
- Apply the file fixes finding by finding, today the whole project is fixed at once.
- ✅ The json schema for `.repo-checker.json` ships in the package (`schema.json`).

## Next checks

Every check of `docs/checks.md` is built. What is left on them:

- **Fixes that are not offered yet**: `stale-remote-branch` (`git push origin --delete`), `ci-failing` (re-run the workflow), `multiple-lockfiles` and `old-lockfile-format` (delete or migrate a lockfile), `deprecated-dependency`, `security-advisory`, `deploy-down`, `media-dimensions`, `build-size`, `stale-last-tag`. They need an action with its own confirmation and proof, like the other actions, or a human decision.
- **`outdated-dependency` and `version-drift` are noisy** (about 100 and 150 findings on 59 projects), Renovate already opens the pull requests. A grouped view per package, or a filter in the UI, would help.
- **`security-advisory` reads the lowest version of a range**, it does not read the lockfile. A `^` range can resolve to a newer, fixed version.
- **A persistent cache of the npm registry answers** (they are kept for an hour in memory), to make a cold start after a restart cheaper.

## Actions

- Bulk actions: `pull --ff-only`, prune merged branches, clone all missing repos, archive on GitHub.
- ✅ Update project: an action that opens a chat modal where Claude runs `/update-project` in the clone, see `docs/features.md`. A CLI command for it is still to do.
- CLI fixes with a single-key `y/N` prompt, sharing the UI's safety checks. The CLI is report-only.
- `archived-with-unsaved-work` extras: export unsaved commits as a patch file, per-category discard with checkboxes.
- Offer "git init and create GitHub repo" for local folders that have no git.

## Output and UX

- A health score per repo.
- `--json` output for scripts and for Claude.
- An offline mode that skips GitHub too (`--no-fetch` already skips `git fetch`). The results are cached in memory since the live watch, see docs/architecture.md, not on disk: a cold start after a restart scans everything.
- Charts in the UI (commit activity, stale-branch histogram). Needs a small chart library, HeroUI has none.

## Ideas

- **Monday briefing**: rank everything into "3 things worth 10 minutes this week" and push them into the What Now task list.
- **cd hook**: when you `cd` into a project, print one warning line.
- **Cross-project upgrade waves**: bring every repo to the same version of a tool in one go, instead of many Renovate PRs.
- **Archive ceremony**: push leftovers, add an "archived" note to the README, archive on GitHub, delete the local clone.
- **Background service**: keep `ui` running, rescan every hour, send a desktop notification.
- **Interactive terminal UI** for the CLI mode, reusing the merge TUI helpers from `snippets`.
