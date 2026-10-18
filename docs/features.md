# Features

This file holds the exact behavior of the **Sync** checks (local vs GitHub), the entries of the Sync group in [checks.md](checks.md), the actions that fix them, and the safety rules. The other checks, the ported file checks and the new ones, are described in [checks.md](checks.md). Checks for later are in [checks.md](checks.md), other future work is in [../TODOS.md](../TODOS.md).

## Modes

One rule for both the CLI and the UI, based on the folder you run it in. The CLI (`repo-check`) prints the findings grouped by severity, then a summary line (checks run and skipped, counts per severity), then one green line when all is well or a hint to run `repo-check ui` to fix things. It exits with an error code when a finding is 🔴, never prompts and changes nothing. The fixes live in the UI (`repo-check ui`).

- **Single project** (the folder is a git repo): check that project. The UI opens on its detail view.
- **Folder of projects** (the folder contains git repos): check them all. The UI opens on the project list, a click opens the same detail view.

Options:

- `--target=path` folder to scan, defaults to the current folder.
- `--owner=name` GitHub account to compare with, defaults to the `gh` login. In single-project mode the owner comes from the repo's `origin` remote.
- `--nitpick` also runs the nitpick checks, the ones marked `nitpick: true` in their meta. The ui starts in that mode too, and its Actions menu has a `Nitpick mode` toggle that scans every project again in the other mode.
- `--no-fetch` skips `git fetch`: faster and changes nothing on disk, but unpushed work is measured against remote refs that may be stale.
- `--verbose` also lists every passed and skipped check, per project.
- `ui` (a command, not an option) starts the dashboard on `127.0.0.1` instead of printing the report. `--port=number` sets its port (4747 by default), `--no-open` keeps the browser closed.

Progress lines ("reading the local clones…", "comparing 30 forks…") go to stderr.

Comparisons between a whole account and a whole folder only exist in folder mode. In single-project mode only the checks about that one repo apply (`broken-clone`, `archived-with-unsaved-work`, `archived-clone`, `pristine-fork`), and GitHub is asked about that repo only.

## Inventory

The scan builds two lists, then matches them by `origin` remote.

- **Local**: every git repo under the target. Each one is read, then fetched (`git fetch --prune`, in parallel, bounded) right before its own check, so the comparison with the remote is current and no project waits for another's fetch. A failed fetch marks the project "cannot verify" and no delete or discard is offered for it. For each: `origin`, current branch, ahead and behind counts for every local branch that has an upstream (an unpushed commit on any branch counts, not only on the checked-out one), uncommitted and untracked files, stash count, branches that exist only locally. This git state is only used in v1 to decide whether a delete is safe (`archived-with-unsaved-work`, `archived-clone`).
- **GitHub**: every repo of the owner, from `gh api`: archived, fork, private, last push. For each fork, also its parent, every branch compared with the parent's default branch, and the open pull requests from it (see `pristine-fork`).
- Repos whose `origin` belongs to another owner are shown as "other owner" and are left out of every check.

## Sync checks

| Id                           | Detects                                                                                                                                          | Severity  | Fix                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------ |
| `not-cloned`                 | On GitHub, not archived, not a fork, no local clone                                                                                              | 🔵 info    | Clone                                                              |
| `broken-clone`               | Local folder that is not a git repo, has no `origin`, or whose `origin` 404s on GitHub                                                           | 🟡 warning | None. Reported with the reason and the path                        |
| `archived-with-unsaved-work` | Archived on GitHub and the local clone holds work that exists nowhere else: unpushed commits, uncommitted files, a stash, or local-only branches | 🔴 error   | Dialog with two actions: unarchive + push + re-archive, or discard |
| `archived-clone`             | Archived on GitHub and the local clone is provably safe to delete                                                                                | 🔵 info    | Delete the local clone                                             |
| `pristine-fork`              | Pristine fork (strict definition below)                                                                                                          | 🔵 info    | Delete the fork on GitHub                                          |

### `archived-with-unsaved-work` actions

The dialog first lists every unsaved item: commit messages, changed file names, stash entries, local-only branch names.

- **Unarchive, push, re-archive**: one confirmed action. GitHub rejects pushes to an archived repo, so the tool unarchives it, pushes every branch with unpushed commits and every local-only branch, then archives it again. If the push fails, the tool still re-archives and reports the failure. It never creates commits: while the clone has uncommitted or untracked files or a stash, the action is disabled and says why. Clean those up by hand, or use Discard.
- **Discard**: resets to the remote state, removes uncommitted and untracked files, drops the stash and deletes local-only branches, all in one action. The clone is then clean and `archived-clone` applies. Files git ignores (a `.env`, a local database) are left alone: they are listed by the delete of the clone, which comes after. The dialog lists the exact items read fresh when it opens, and the discard is refused if the clone holds anything else when it runs.

### `pristine-fork`: what "pristine" means

A fork is offered for deletion only when all of these hold, each proved by the GitHub API at action time:

- Every branch of the fork has zero commits ahead of the parent.
- No open pull request comes from the fork.
- Every comparison call succeeded.
- The fork has no local clone, or its local clone passes the clean-clone rule (safety rule 2). In that case the delete removes the clone too, and the confirm dialog says so. Otherwise the fork is listed with the reason, for example "local clone has 2 unpushed commits".

Anything the tool cannot prove (for example `tina-blog`, whose comparison returns a 404 "no common ancestor") is listed as "cannot verify" and never offered. Forks with any commit ahead are listed and never offered. Checking only the default branch is not enough: on 2026-10-12, 12 of 30 forks had zero commits ahead on the default branch, but 8 of those carried other branches such as `patch-1`, `feature/i18n` and `pkgjsonfix`.

An archived fork gets only the `pristine-fork` rule, never `archived-clone` or `archived-with-unsaved-work`, so a repo is never offered two different deletes.

Every non-archived, non-fork GitHub repo is expected locally, however old. On 2026-10-12 that was about 25 repos. Cleaning the old ones up (archive) is the `archive-candidate` and `stale-uncloned-repo` checks in [checks.md](checks.md).

## File fixes

A finding of a file check can come with a fix (an edit of one or more files). The dashboard applies them for a whole project, after a confirmation that shows a diff per file. The fixes are planned again, from the files as they are now, when the dialog opens and again when it is confirmed, and the confirmation is refused if the plan is not the same. A file that git reports as changed is never rewritten and is listed as left alone: this keeps `git diff` exact and `git checkout` an undo. Nothing is committed. The fixes work in single project mode too, where the target is the clone.

## Safety rules

These are requirements, each one gets a test.

1. Nothing changes without an explicit confirmation, a confirm dialog in the UI with a clearly labeled action button. The CLI is report-only and never changes anything. The file fixes never overwrite a file with uncommitted changes.
2. A local clone delete is offered only when the clone is clean (and the server proves it again, with a fresh fetch, before it shows the dialog and again before it deletes): no uncommitted or untracked files, nothing unpushed, no stash, no local-only branch. Otherwise the tool says why it will not offer the delete. Gitignored files (`.env`, local databases...) do not block the delete, but the confirm dialog lists every one that will be lost, ignoring rebuildable folders such as `node_modules` and `dist`.
3. A fork delete is offered only when the strict `pristine-fork` rule is proved, including the clean-clone rule for its local clone when one exists. A failed comparison is never read as "nothing to lose".
4. The server binds to `127.0.0.1` only, and refuses any request whose `Host` is not `127.0.0.1` or `localhost`, so a web page on another domain cannot reach it through DNS rebinding. Any request that changes something must also carry the `x-repo-check: 1` header, which a web page of another site cannot add, so it cannot post an action.
5. The tool never reads or stores a GitHub token. All GitHub API calls go through `gh`, and a clone goes through `git` over SSH, with your own SSH key.
6. Deleting a fork needs the `delete_repo` scope. When it is missing the dialog shows `gh auth refresh -s delete_repo` instead of failing silently: the server reads the scopes of the token before it offers the delete, and a 403 from GitHub gives the same command.
7. Before any destructive action the tool fetches that repo again and re-checks the condition that justified it. A scan result is never trusted as current. If the fetch fails, the action refuses.

## Everything else

Every check of [checks.md](checks.md) is ported or built into the same engine, the old file checks included (README, biome, workflows, tsconfig, license...): they run in the same scan and the same report as the Sync checks. Every built check is marked ✅. The old snapshot tests in git history are the spec of the old checks. Bulk actions and other non-check work are in `../TODOS.md`.

## Update project

An action of the Actions menu of every project that has a usable clone of the owner. It opens a modal where Claude runs the `/update-project` skill in the clone and you answer its questions.

- **How it runs.** The server starts `claude --print --input-format stream-json --output-format stream-json --verbose --permission-prompts none` in the clone and sends it `/update-project`. The process stays alive between messages. The server turns its output into a few events (what you said, what Claude says, the tools it runs, the end of a turn, the end of the session), streams them to the modal as server-sent events and keeps them, so a page that connects late sees the whole conversation. `GET /api/projects/:name/update-project/events`, and `POST` on `/update-project` (start), `/message` and `/close`.
- **Permissions.** Nothing is asked in the modal: whatever would prompt is refused. The skill brings the tools it needs (`allowed-tools` of its frontmatter), so it works as it does in a terminal, minus the permission prompts.
- **Closing.** Only the Close session button ends the session, a click beside the modal or Escape does not. It stops Claude, then the project is scanned again since its files changed. The skill never commits or pushes without your green light in the chat. One session per project, and every session is stopped when the server stops.
- **Not done.** No terminal emulation, no screen of the CLI: a skill that needs the real interface of Claude Code (a menu of the CLI) does not show it here.
