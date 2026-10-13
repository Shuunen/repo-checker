# Questions and decisions to review

Status: written during an autonomous session (2026-10-13). Each item is a decision taken without asking, or a question that blocked a task. Nothing here is urgent: the code works as described, and each item says what to change if you disagree.

## Blocked tasks

None so far.

## Needs your hands

- **The gh token has no `delete_repo` scope**, so Delete fork is refused for every fork today (the dialog says `gh auth refresh -s delete_repo`). Run it once when you want to try the action.
- **Never run on real data**: unarchive and push, discard, delete clone and delete fork were only run on throwaway repos in tests and read-only against your real repos (the previews). Try them first on a throwaway archived repo or a throwaway fork.

## Decisions taken without asking

✅ = reviewed together and kept (2026-10-13). 4, 5 and 6 were asked one by one, 7, 9, 10, 12, 13, 14 and 16 are technical with no visible trade-off and were settled together. 1, 2 and 3 led to changes that are already in the code.

1. ✅ **Delete clone removes the folder for good** (`fs.rm`), not to a trash. Confirmed. The dialog lists the ignored files that would be lost, and everything else is proved to be on GitHub.
2. ✅ **Clone always uses SSH** (`git clone git@github.com:owner/name.git`), like your existing clones. Decided in the review, it replaced `gh repo clone`. It needs an SSH key known to GitHub.
3. ✅ **Unarchive, push, re-archive leaves the repo writable for a few seconds**, kept, with a read-back of the repo from GitHub after archiving again (decided in the review). If archiving again fails or did nothing, the error gives the hand command. The action never creates a commit and never forces a push. *Nothing was run against a real archived repo, only against a real bare git repo in tests: try it on a throwaway archived repo before trusting it on `jozzo`.*
4. ✅ **Discard keeps the ignored files** (`.env`, local databases) and only removes what git knows or sees as untracked. They are listed by the Delete clone dialog later. *Change it if you want Discard to remove them too.*
5. ✅ **Discard lands on `origin/HEAD`** when the checked out branch only exists locally, or else on the first branch that has an upstream, and refuses when none does.
6. ✅ **Discard asks for a fingerprint of the list the user saw** and refuses when the clone changed. This costs a fresh fetch when the dialog opens (a few seconds), and is what makes "after listing every item" true.
7. ✅ **After an action only the changed project is scanned again** (about 1 to 2.5 s), with the whole scan as a fallback when that fails.
8. ✅ **The row action in the list opens its confirmation directly**, for every action (decided in the review, it replaced the link to the project page). The row shows the first action the project offers.
9. ✅ **`plural` now adds `es` after `ch`, `sh`, `s`, `x` and `z`** (it said "branchs" and "stashs").
10. ✅ **`max-lines-per-function` is 30** (your change), and I regrouped the web components to fit it.
11. **Delete fork deletes on GitHub first, then the clean clone**, so a refused delete leaves your clone alone. A fork with a dirty clone is refused, as the strict rule says.
12. ✅ **Every confirmation is one `ConfirmDialog`** and the three "show first" actions share one hook, to avoid five copies of the same dialog.
13. ✅ **The scope check trusts `X-OAuth-Scopes`** and tries the delete when the header is absent (fine-grained tokens), where a 403 gives the same command.
14. ✅ **A project whose checks throw gets a `checks-failed` error finding** instead of failing the whole scan, so one odd repo never blanks the dashboard.
15. **`repo-check ui` opens the browser by default**, as the design says, with `--no-open` to disable it. It is the only place the tool starts a program other than git and gh.
16. ✅ **Each clone is fetched right before its own check**, not all at the start. The first row comes at 1.5 s with fetch instead of 5.3 s. The inventory reads every clone twice (once without fetch to match it with its repo, once with the fetch), which is cheap.
17. **The six git-hygiene checks on a clone are project rules** (they read the git state, which file rules do not see), in `git-hygiene/clone-state.rule.ts`. They leave archived repos to the archive checks, skip clones of another owner, and `behind-remote` and `unpushed-commits` are skipped when the fetch failed (the remote refs are stale). `GithubRepo` now carries `defaultBranch`. On your folder they find: 5 clones behind, 6 with stashes (`invest` has 14), 10 with local-only branches, 3 not on their default branch. *They are warnings, so "Needs attention" got longer: tell me if you want any of them to be info or off by default.*
18. **The four GitHub presentation checks only look at own repos that are alive** (not archived, not forks): missing-license and missing-description are warnings, missing-topics and missing-homepage are info, as `checks.md` says. On your account: 10 without license, 17 without description, 32 without topics, 26 without homepage. They come from the repo list the scan already reads, no extra API call.

## Not started, waiting for you

- **The release**: a new major version of `repo-check` on npm (version bump, changelog, `npm publish`, tag). Publishing is yours to trigger. `bun check` passes, and `npm pack` holds `dist/`, the README and the LICENSE.
- **A screenshot of the dashboard** to replace `docs/demo-1.42.jpg` in the README. A capture of your real folder would show your repo names, some may be private: tell me if I may take one, or on which folder.
- **Checks that need data the scan does not read yet** (`checks.md`, 📋): open pull requests, stale branches and tags, outdated or deprecated dependencies and advisories (the npm registry), CI status, lockfile checks, the deployed site. Each one is a decision on cost (API calls) and noise.
