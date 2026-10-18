# TODOS

Every check, built or wanted, lives in `docs/checks.md`. This file holds the rest of the backlog: work that is not a check.

## Release

- Every old check is ported (✅ in `docs/checks.md`) and the old code is removed. Ship the rewrite as a new major version.
- Apply the file fixes finding by finding, today the whole project is fixed at once.
- ✅ The json schema for `.repo-checker.json` ships in the package (`schema.json`).

## Next checks

The checks still marked 📋 in `docs/checks.md`, sorted by what they cost (2026-10-13). The cheapest first.

- **Cheap, local, no network**: `multiple-lockfiles` (🔴) and `old-lockfile-format` (🟡, like `bun.lockb`). They only look at the files of a clone, like the other file checks.
- **One GitHub call per live repo** (about 30 for the own live repos): `ci-failing` (🔴), the CI status of the default branch.
- **The npm registry, the most valuable and the most expensive** (a call per dependency of every project, so a cache first): `outdated-dependency`, `deprecated-dependency`, `security-advisory`, `outdated-package-manager`, and `version-drift` (the same tool at different versions across projects).
- **Waiting on an "archive" action** (archive on GitHub, with its confirmation and its proof, like the other actions): `archive-candidate`, `renovate-only-zombie` and `stale-uncloned-repo`, which suggest archiving a repo.
- **More data from git or GitHub**: `stale-local-branch`, `stale-remote-branch`, `stale-last-tag`, and `deploy-down` (a call per deployed site).
- **From the old README todo list**, they read the project files and need a notion of "this is a website": `website-static-files`, `external-link-rel`, `media-dimensions`, `build-size`, `lighthouse-budget`.

## Actions

- Bulk actions: `pull --ff-only`, prune merged branches, clone all missing repos, archive on GitHub.
- A command that opens Claude in a repo and runs `/update-project`.
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
