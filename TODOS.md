# TODOS

v1 is the Sync checks only (see `docs/features.md`). Every check, built or wanted, lives in `docs/checks.md`. This file holds the rest of the backlog: work that is not a check.

## Release

- Every old check is ported (✅ in `docs/checks.md`) and the old code is removed. Ship the rewrite as a new major version.
- Let the UI apply the fixes the rules already plan (`planFixes`, `fixProject`), the successor of the old `--fix`.
- A json schema for `.repo-checker.json`, from the old README todo list.

## Actions

- Bulk actions: `pull --ff-only`, prune merged branches, clone all missing repos, archive on GitHub.
- A command that opens Claude in a repo and runs `/update-project`.
- CLI fixes with a single-key `y/N` prompt, sharing the UI's safety checks. v1's CLI is report-only.
- `archived-with-unsaved-work` extras: export unsaved commits as a patch file, per-category discard with checkboxes.
- Offer "git init and create GitHub repo" for local folders that have no git.

## Output and UX

- Open the confirmation straight from the row's action button, instead of linking to the project view.

- A health score per repo.
- `--json` output for scripts and for Claude.
- A cache, and an offline mode that skips GitHub too (`--no-fetch` already skips `git fetch`).
- Charts in the UI (commit activity, stale-branch histogram). Needs a small chart library, HeroUI has none.

## Ideas

- **Monday briefing**: rank everything into "3 things worth 10 minutes this week" and push them into the What Now task list.
- **cd hook**: when you `cd` into a project, print one warning line.
- **Cross-project upgrade waves**: bring every repo to the same version of a tool in one go, instead of many Renovate PRs.
- **Archive ceremony**: push leftovers, add an "archived" note to the README, archive on GitHub, delete the local clone.
- **Background service**: keep `ui` running, rescan every hour, send a desktop notification.
- **Interactive terminal UI** for the CLI mode, reusing the merge TUI helpers from `snippets`.
