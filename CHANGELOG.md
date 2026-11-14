# Changelog

## [Unreleased]

### Added in Unreleased

- `scripts-required-tasks`, `scripts-commands`, `scripts-check-turbo`, `scripts-lint-tasks-listed`, `scripts-bun`, `typescript-7`, `turbo-installed`, `turbo-config`, `turbo-tasks-declared` and `gitignore-turbo` checks, from the agreed shape in `docs/scripts-turbo.md`. `scripts-final-echo` now wants `&& echo <task> completed successfully`, with the failure hint when the task has a fix task.
- The `.gitignore` fixes (`gitignore-node-modules`, `gitignore-turbo`) insert the line alphabetically, and sort a plain list. A file with comments, blank lines or `!` negations only gets the line at the end.
- `oxlint-config-exists`, `oxlint-schema`, `oxlint-categories`, `oxlint-plugins`, `oxlint-type-aware`, `oxlint-house-rules`, `oxlint-test-override`, `lint-toolchain`, `oxfmt-style`, `oxfmt-tailwind`, `oxfmt-ignore-redundant`, `oxfmt-ignore-generated` and `knip-schema` checks.

### Fixed in Unreleased

- Delete project only runs when the repo and the clone still hold what its dialog listed, and checks the clone path before anything is deleted on GitHub. Delete fork checks the path first too.
- A folder with no origin, no git or a state git cannot read now says, in the delete dialog, that everything in it is lost. A clone of someone else's repo is never picked by its folder name.
- A git failure while reading a clone flags it unreadable (`broken-clone`) instead of reading it as clean, so nothing is offered on it.
- Commits of a detached HEAD count as unsaved work: no delete is offered, checkout and unarchive-push refuse until a branch holds them.
- Deleting branches and the git fixes refuse when a branch got a new commit after the dialog opened.
- Unarchive-push pushes all branches or none (`--atomic`), each to its own upstream branch.
- A file fix never writes through a symbolic link that leaves the project.
- The project page never replaces the project under a dialog opened while a refresh was on its way.
- The delete previews stop walking an ignored folder at its first file, a big `.venv/` no longer slows them down.
- An action that throws answers with its reason instead of a server error, and the fix stream always ends with a result.

## [2.0.0] - 2026-11-08

Full rewrite: the file template based tool is replaced by a rules engine, a local projects dashboard and a CLI.

### Added in 2.0.0

- Projects dashboard (`repo-check ui`), installable as a PWA: list, filters, sorting, project page with findings, facts and actions.
- Rules engine with project rules and file rules, each with an id, a severity and, when possible, a fix.
- Checks on CI, code tooling, dependencies, git hygiene, GitHub health, package, presentation, publishing, runtime, scripts, sync, testing and website, listed in `docs/checks.md`.
- Actions from the dashboard: clone, archive, unarchive and push, delete clone, fork, branches or project, discard, checkout the default branch, fix files, fix git, sync GitHub metadata, open in VS Code, update a project with Claude.
- Ignore a rule on a project for 24 hours, saved on disk.
- `open-pull-requests` counts every pull request except the one of the active branch, and its message links to the pull request or to the pull request list of the project.
- `unique-mark-plugin` and `unique-mark-no-binary` checks, `oxfmt` config check, fixes for `ci-node-version` and `nvmrc-recent-node`.
- JSON schema for `.repo-checker.json`, a demo mode on fake repos, an about dialog.
- CLI options `--target`, `--owner`, `--no-fetch`, `--fix`, `--nitpick`, `--verbose`, `--port`, `--no-open`.

### Changed in 2.0.0

- Build moved to pnpm, tsdown, vite, oxlint and oxfmt, Node 26 target.
- The fixer keeps JSON keys sorted.

### Removed in 2.0.0

- The old file template based tool and its `bun`, `biome` and `tsup` setup.
- The `open-renovate-pr` check, Renovate pull requests are counted by `open-pull-requests`.
- The `scripts-unique-mark` task check, replaced by `unique-mark-plugin`.
