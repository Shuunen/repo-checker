# Questions and decisions to review

Status: written during an autonomous session (2026-10-13). Each item is a decision taken without asking, or a question that blocked a task. Nothing here is urgent: the code works as described, and each item says what to change if you disagree.

## Blocked tasks

None so far.

## Needs your hands

- **The gh token has no `delete_repo` scope**, so Delete fork is refused for every fork today (the dialog says `gh auth refresh -s delete_repo`). Run it once when you want to try the action.
- **Never run on real data**: unarchive and push, discard, delete clone and delete fork were only run on throwaway repos in tests and read-only against your real repos (the previews). Try them first on a throwaway archived repo or a throwaway fork.

## Decisions taken without asking

1. **Delete clone removes the folder for good** (`fs.rm`), not to a trash. The dialog lists the ignored files that would be lost, and everything else is proved to be on GitHub. A trash would need a dependency or a per-OS command. *Change it if you want a safety net.*
2. **Clone uses `gh repo clone`**, so the protocol is the one in your gh config (SSH here). *Change it if you want a fixed HTTPS or SSH URL.*
3. **Unarchive, push, re-archive leaves the repo writable for a few seconds.** If archiving again fails, the error gives the hand command. The action never creates a commit and never forces a push. *Nothing was run against a real archived repo, only against a real bare git repo in tests: please try it on a throwaway archived repo before trusting it on `jozzo`.*
4. **Discard keeps the ignored files** (`.env`, local databases) and only removes what git knows or sees as untracked. They are listed by the Delete clone dialog later. *Change it if you want Discard to remove them too.*
5. **Discard lands on `origin/HEAD`** when the checked out branch only exists locally, or else on the first branch that has an upstream, and refuses when none does.
6. **Discard asks for a fingerprint of the list the user saw** and refuses when the clone changed. This costs a fresh fetch when the dialog opens (a few seconds), and is what makes "after listing every item" true.
7. **After an action only the changed project is scanned again** (about 1 to 2.5 s), with the whole scan as a fallback when that fails.
8. **The row action in the list links to the project view**, where the confirmation lives, instead of opening the dialog from the row. It is in `TODOS.md`.
9. **`plural` now adds `es` after `ch`, `sh`, `s`, `x` and `z`** (it said "branchs" and "stashs").
10. **`max-lines-per-function` is 30** (your change), and I regrouped the web components to fit it.
11. **Delete fork deletes on GitHub first, then the clean clone**, so a refused delete leaves your clone alone. A fork with a dirty clone is refused, as the strict rule says.
12. **Every confirmation is one `ConfirmDialog`** and the three "show first" actions share one hook, to avoid five copies of the same dialog.
13. **The scope check trusts `X-OAuth-Scopes`** and tries the delete when the header is absent (fine-grained tokens), where a 403 gives the same command.
14. **A project whose checks throw gets a `checks-failed` error finding** instead of failing the whole scan, so one odd repo never blanks the dashboard.
15. **`repo-check ui` opens the browser by default**, as the design says, with `--no-open` to disable it. It is the only place the tool starts a program other than git and gh.
16. **Each clone is fetched right before its own check**, not all at the start. The first row comes at 1.5 s with fetch instead of 5.3 s. The inventory reads every clone twice (once without fetch to match it with its repo, once with the fetch), which is cheap.
