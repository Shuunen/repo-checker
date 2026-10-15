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
11. ✅ **Delete fork deletes on GitHub first, then the clean clone**, so a refused delete leaves your clone alone. A fork with a dirty clone is refused, as the strict rule says.
12. ✅ **Every confirmation is one `ConfirmDialog`** and the three "show first" actions share one hook, to avoid five copies of the same dialog.
13. ✅ **The scope check trusts `X-OAuth-Scopes`** and tries the delete when the header is absent (fine-grained tokens), where a 403 gives the same command.
14. ✅ **A project whose checks throw gets a `checks-failed` error finding** instead of failing the whole scan, so one odd repo never blanks the dashboard.
15. ✅ **`repo-check ui` opens the browser by default**, as the design says, with `--no-open` to disable it. It is the only place the tool starts a program other than git and gh.
16. ✅ **Each clone is fetched right before its own check**, not all at the start. The first row comes at 1.5 s with fetch instead of 5.3 s. The inventory reads every clone twice (once without fetch to match it with its repo, once with the fetch), which is cheap.
17. ✅ **The six git-hygiene checks on a clone are project rules** (they read the git state, which file rules do not see), in `git-hygiene/clone-state.rule.ts`. They leave archived repos to the archive checks, skip clones of another owner, and `behind-remote` and `unpushed-commits` are skipped when the fetch failed (the remote refs are stale). `GithubRepo` now carries `defaultBranch`. On your folder they find: 5 clones behind, 6 with stashes (`invest` has 14), 10 with local-only branches, 3 not on their default branch. *Decided in the review: `forgotten-stash` and `branch-without-upstream` are info (clutter, not risk), so "Needs attention" keeps meaning things at risk; the other four stay warnings.*
18. ✅ **The four GitHub presentation checks only look at own repos that are alive** (not archived, not forks): missing-license and missing-description are warnings, missing-topics and missing-homepage are info, as `checks.md` says. On your account: 10 without license, 17 without description, 32 without topics, 26 without homepage. They come from the repo list the scan already reads, no extra API call.

19. **The file fixes are applied for the whole project at once**, from a diff per file, and **never over a file with uncommitted changes** (it is listed as left alone). That keeps `git diff` exact and `git checkout` an undo, and nothing is committed. Per finding is a possible refinement (in `TODOS.md`). Same safety as Discard: the plan is made again and refused if it changed (a fingerprint). `diskIo.writeText` now creates missing folders and refuses a path outside the project. Added the `diff` library (page only).

20. **Open pull requests and issues come from one search call** for the whole account (one page for your 57 open pull requests), not one call per repo. Renovate's pull requests (`open-renovate-pr`, a warning, as `checks.md` says) are counted apart from the others (`open-pull-requests`, info, includes Dependabot, imgbot and people). `open-issues` is what GitHub counts as open minus those pull requests. They only look at own live repos (not archived, not forks), and not in single project mode. On your account: 3 repos with Renovate pull requests (`ts-result-comparison` has 6), 2 with pull requests waiting, 2 with an open issue. *The search API has a low rate limit (30 calls a minute): a scan makes one, and a failure just means these three checks do not apply.*

## Not started, waiting for you

- **The release**: a new major version of `repo-check` on npm (version bump, changelog, `npm publish`, tag). Publishing is yours to trigger. `bun check` passes, and `npm pack` holds `dist/`, the README and the LICENSE.
- ✅ **The screenshots** of the README are done, from the demo account of `demo/` (fake repos and a fake `gh`, no real repo name appears), and the generator is kept: `bun run build && bun demo`, with a smoke test in `bun check`. To redo the captures, run it and take them in the browser.
- **Checks that need data the scan does not read yet** (`checks.md`, 📋): stale branches and tags, outdated or deprecated dependencies and advisories (the npm registry), CI status, lockfile checks, the deployed site. Each one is a decision on cost (API calls) and noise.

## Session 2026-10-15: new fixers, to review

Added fixers (all tested, `bun run check` passes with 100% coverage). Created files are filled with this repo's own content, nothing is committed by the fix itself:

- `nvmrc-exists` creates `.nvmrc` with `24.21.0` (this repo's version, hardcoded in `node.rule.ts`).
- `editorconfig-exists` creates `.editorconfig` (same content as this repo's).
- `gitignore-exists` creates `.gitignore` with `node_modules`; `gitignore-node-modules` appends it.
- `renovate-config-exists` creates `renovate.json` (this repo's); `renovate-no-config-base` swaps `config:base` for `config:semverAllMonthly`.
- `scripts-preversion` adds `pnpm check`, only when a `check` script exists.
- `scripts-postversion` adds `git push && git push --tags`, never `npm publish`.
- `requireFile` got an optional `content` option (the rule is fixable only when given).

Questions, findings left without a fixer on purpose:

1. **`.nvmrc` version**: hardcoding `24.21.0` will age. Should the fixer read the current LTS, or the Node of the machine running repo-check?
2. **`npmrc-exists`**: which content should a new `.npmrc` get? Only `enable-pre-post-scripts=true` (this repo's), or nothing useful to add (an empty file would only silence the check)?
3. **`repo-checker-config`** (14 projects): creating `{}` silences the check without saying anything. Should the fixer guess `maxSizeKo`, or stay unfixable?
4. **`license-file-exists` / `missing-license` / `package-license`**: needs a license choice and author. Always MIT with the git user as author, or ask per project in the UI?
5. **`package-files`, `package-author`, `package-bugs`, `package-homepage`, `package-repository`, `package-keywords`, `package-description`**: derivable from the GitHub repo and git config (author, `bugs`, `homepage`, `repository`, description) except `files` and `keywords`. Fill the derivable ones automatically?
6. **`readme-exists`, `readme-logo`, `readme-demo`, `readme-thanks-section`**: a README stub with title and `## Thanks` could be generated, but logo and demo need images. Generate the stub only?
7. **`scripts-final-echo`, `scripts-unique-mark`**: appending `&& echo test success` is safe but touches every script; `unique-mark` needs a file path. Fix only the echo?
8. **`vitest-pool-threads`**: editing a vitest config means inserting into JS code, no AST tool here. Worth adding one, or keep it manual?
9. **`tsconfig-schema`, `package-schema`**: already have fixers, so the 11 + 2 findings are fixable now from the UI.
10. **GitHub-side findings** (`missing-description`, `missing-topics`, `missing-homepage`): need write calls to the GitHub API, which is a new kind of action. Want them as actions (with a preview), or leave manual?
11. **`package-json-exists`** (3 repos, not Node projects like `css-gungame`): should the rule skip projects with no JS at all instead of asking for a `package.json`?
12. **`dependency-tool-choice`, `coverage-dependency`, `unit-testing-dependency`**: installing packages is out of scope for file fixers. Keep unfixable?

### Decisions from the review of 2026-10-15 (not built yet)

1. **`.nvmrc`**: fetch the latest LTS from nodejs.org, fall back to the hardcoded `24.21.0` when the call fails.
2. **`.npmrc`**: create with `enable-pre-post-scripts=true`.
3. **`.repo-checker.json`**: the fixer creates `{ "$schema": ... }` pointing to a JSON schema shipped in the npm package (`node_modules/...`), for IDE autocompletion. The schema itself is to be built and published.
4. **License**: MIT by default, author from `git config user.name`, current year, per-project override in `.repo-checker.json`. Fixes `license-file-exists` and `package-license`.
5. **`package.json` fields**: derive `author`, `repository`, `bugs`, `homepage`, `description` and `license`. `keywords` and `files` stay manual. The description goes whichever way has a value (GitHub to `package.json` or the reverse), nothing when both are empty.
6. **README**: generate a stub for `readme-exists` and `readme-thanks-section`. Logo and demo stay manual.
7. **Scripts**: fix `scripts-final-echo` except dev, watch and serve scripts (list the skipped ones). `scripts-unique-mark` stays manual.
8. **`vitest-pool-threads`**: add `magicast` and fix it with it, reusable for other JS/TS config fixers.
9. **Schema fixers**: not applied to the real clones, you apply them from the dashboard.
10. **GitHub-side**: description and homepage become actions that copy from `package.json`. Topics stay manual.
11. **Projects with no JS**: detect them automatically (no `package.json` and no JS/TS files) and skip the Node checks.
12. **Tool installation**, as a new action with a preview and a confirmation, running `pnpm install`:
    - a. `dependency-tool-choice`: install `knip`, add a `lint:knip` script, no config file.
    - b. `unit-testing-dependency`: install `vitest`, add `"test": "vitest --run && echo test success"`, without `--passWithNoTests`.
    - c. `coverage-dependency`: install `@vitest/coverage-v8`, add `--coverage` to the `test` script and set this repo's 100% threshold in the vitest config. Expect `test` to fail at once on a project with few tests.
