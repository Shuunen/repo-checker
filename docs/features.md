# Features

v1 covers one group of checks: **Sync** (local vs GitHub), the 🚀 entries in [checks.md](checks.md). This file holds their exact behavior and the safety rules. Checks for later are in [checks.md](checks.md), other future work is in [../TODOS.md](../TODOS.md).

## Modes

One rule for both the CLI and the UI, based on the folder you run it in. In v1 the CLI (`repo-check`) prints the findings grouped by severity, prints one green line when all is well, and ends with a hint to run `repo-check ui` to fix things. It never prompts.

- **Single project** (the folder is a git repo): check that project. The UI opens on its detail view.
- **Folder of projects** (the folder contains git repos): check them all. The UI opens on the project list, a click opens the same detail view.

Options:

- `--target=path` folder to scan, defaults to the current folder.
- `--owner=name` GitHub account to compare with, defaults to the `gh` login. In single-project mode the owner comes from the repo's `origin` remote.

Comparisons between a whole account and a whole folder only exist in folder mode. In single-project mode only the checks about that one repo apply (`archived-with-unsaved-work`, `archived-clone`, `pristine-fork`).

## Inventory

The scan builds two lists, then matches them by `origin` remote.

- **Local**: every git repo under the target. Each one is fetched first (`git fetch --prune`, in parallel, bounded) so the comparison with the remote is current. A failed fetch marks the project "cannot verify" and no delete or discard is offered for it. For each: `origin`, current branch, ahead and behind counts for every local branch that has an upstream (an unpushed commit on any branch counts, not only on the checked-out one), uncommitted and untracked files, stash count, branches that exist only locally. This git state is only used in v1 to decide whether a delete is safe (`archived-with-unsaved-work`, `archived-clone`).
- **GitHub**: every repo of the owner, from `gh api`: archived, fork, private, last push, parent.
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
- **Discard**: resets to the remote state, removes uncommitted and untracked files, drops the stash and deletes local-only branches, all in one action. The clone is then clean and `archived-clone` applies.

### `pristine-fork`: what "pristine" means

A fork is offered for deletion only when all of these hold, each proved by the GitHub API at action time:

- Every branch of the fork has zero commits ahead of the parent.
- No open pull request comes from the fork.
- Every comparison call succeeded.
- The fork has no local clone, or its local clone passes the clean-clone rule (safety rule 2). In that case the delete removes the clone too, and the confirm dialog says so. Otherwise the fork is listed with the reason, for example "local clone has 2 unpushed commits".

Anything the tool cannot prove (for example `tina-blog`, whose comparison returns a 404 "no common ancestor") is listed as "cannot verify" and never offered. Forks with any commit ahead are listed and never offered. Checking only the default branch is not enough: on 2026-10-12, 12 of 30 forks had zero commits ahead on the default branch, but 8 of those carried other branches such as `patch-1`, `feature/i18n` and `pkgjsonfix`.

An archived fork gets only the `pristine-fork` rule, never `archived-clone` or `archived-with-unsaved-work`, so a repo is never offered two different deletes.

Every non-archived, non-fork GitHub repo is expected locally, however old. On 2026-10-12 that was about 25 repos. Cleaning the old ones up (archive) is the `archive-candidate` and `stale-uncloned-repo` checks in [checks.md](checks.md).

## Safety rules

These are requirements, each one gets a test.

1. Nothing changes without an explicit confirmation, a confirm dialog in the UI with a clearly labeled action button. The CLI is report-only in v1 and never changes anything.
2. A local clone delete is offered only when the clone is clean: no uncommitted or untracked files, nothing unpushed, no stash, no local-only branch. Otherwise the tool says why it will not offer the delete. Gitignored files (`.env`, local databases...) do not block the delete, but the confirm dialog lists every one that will be lost, ignoring rebuildable folders such as `node_modules` and `dist`.
3. A fork delete is offered only when the strict `pristine-fork` rule is proved, including the clean-clone rule for its local clone when one exists. A failed comparison is never read as "nothing to lose".
4. The server binds to `127.0.0.1` only.
5. The tool never reads or stores a GitHub token. All GitHub calls go through `gh api`.
6. Deleting a fork needs the `delete_repo` scope. When it is missing the UI shows `gh auth refresh -s delete_repo` instead of failing silently.
7. Before any destructive action the tool fetches that repo again and re-checks the condition that justified it. A scan result is never trusted as current. If the fetch fails, the action refuses.

## Out of scope for v1

- The old file checks (README, biome, workflows, tsconfig, license...). They stay on the old published version until they are ported (see "Porting the old tool" in `../TODOS.md`). The old snapshot tests in git history are their spec.
- Every 📋 check in [checks.md](checks.md): git hygiene, dependencies, security, CI status, archive candidates. Bulk actions and other non-check work are in `../TODOS.md`.
