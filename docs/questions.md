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

### Decisions from the review of 2026-10-15 (built, see below)

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
12. **Tool installation** is part of the file fix, not a separate action: when a fix adds a dependency, `pnpm install` runs automatically right after the fix is applied, with no extra step for the user:
    - a. `dependency-tool-choice`: install `knip`, add a `lint:knip` script, no config file.
    - b. `unit-testing-dependency`: install `vitest`, add `"test": "vitest --run && echo test success"`, without `--passWithNoTests`.
    - c. `coverage-dependency`: install `@vitest/coverage-v8`, add `--coverage` to the `test` script and set this repo's 100% threshold in the vitest config. Expect `test` to fail at once on a project with few tests.

### What was built from those decisions, and what I decided on the way (to review)

All of it is in `bun run check` green with 100% coverage, one commit per theme on `rewrite/projects-dashboard`. **Nothing was run on your real clones or repos**: only a read-only dry run of every fixer on `~/Projects/github` (no crash, nothing written). Try the install and the GitHub action on a throwaway repo first.

1. **Facts for fixers** (`src/server/facts.ts`): the git user (`git config --global`), the Node LTS (nodejs.org, 3 s timeout, fallback `24.21.0`) and what GitHub says of the repo are given to the rules as flags, so the rules stay pure. The tests block the internet with `src/server/vitest.setup.ts` (fetch is stubbed except for 127.0.0.1).
2. **Two config exceptions to review** (you said never to bend a rule without asking): `.dependency-cruiser.js` got `vitest.setup.ts` in the `not-to-dev-dep` exception (the config comment says to do that for dev-only files) and in the orphan list. No oxlint rule was disabled.
3. **`.nvmrc`**: the version is whatever the latest LTS is, even if it is not a 24.x: `nvmrc-recent-node` still hardcodes `24.x` and would then complain. Change that pattern when Node 26 becomes the LTS.
4. **`.repo-checker.json`**: created with a `$schema` pointing to `./node_modules/repo-check/schema.json`, the schema is `schema.json` at the root, shipped in `files`. Your own `.repo-checker.json` now points to `./schema.json`. The schema lists every option from `ProjectFlags` that a project can set.
5. **License file**: only written when the declared license is MIT or absent and the git user is known, with the git user name and the current year. `package-license` uses `.repo-checker.json`'s `license`, MIT otherwise.
6. **`package.json` fields**: `author` (name and mail of the git user), `bugs` (`<repo>/issues`), `homepage` (the repo url, since the homepage of a `package.json` is the one of the source code, not of the deployed website; this was first the GitHub homepage, which was wrong), `description` (GitHub), `repository` (`git+https://github.com/owner/name.git`), `license`. Each is only fixed when the fact is known.
7. **Description direction** (the point I flagged and you did not answer): `package.json` gets the description of GitHub when it has none, and the "Sync infos" action syncs the description between `package.json` and GitHub, both ways, after a review in a dialog. The homepage is not part of the `package.json` side, see 8.
8. **GitHub action "Sync infos"** (`sync-github-metadata`, first "Copy the description and homepage to GitHub"), offered on `missing-description` and `missing-homepage`. The button is always shown and the action refuses with a reason when there is nothing to sync. The dialog shows the description and the homepage as the project says them (local) and as GitHub has them, with an input each, and the values you confirm are written on both sides. Local means the description of the `package.json` and the `webUrl` of `.repo-checker.json`: the homepage of GitHub is the deployed website, whereas the `homepage` of the `package.json` is the source code (the repo) and is never touched.
9. **README stub**: title (package name, else repo name), description when known, empty `## Thanks`. The Thanks entries are added by the next fix, not in the same pass.
10. **Final echo**: fixed with ` && echo <task> success`, except when the command is a watch (`--watch`, ` -w`, `vitest` without `run`, `--run` or `--coverage`): those stay reported without a fix.
11. **No JS projects**: `flags.isNotNode` (no `package.json` and no `.js/.ts/.jsx/.tsx/.vue/.svelte/.astro` file) skips `package-json-exists`, `nvmrc-exists` and `npmrc-exists` only. An empty folder counts as not Node, so tests with no files had to say `isNotNode: false`.
12. **`vitest-pool-threads`** is fixed with `magicast` (a runtime dependency, `editConfig` in the fixer, `fixer.config(...)`). `magicast` rewrites new objects with double quotes and `;`, run `oxfmt` after. A config it cannot read is left alone. The pattern now accepts both quotes.
13. **Installing tools** is part of the file fix: after the files are written, `pnpm add --save-dev --save-prefix=~ <packages>` runs in the clone (Bun projects, with `bun.lock` or `bun.lockb`, get `bun add --dev --tilde` instead, so a Bun project never gets a `pnpm-lock.yaml`: your instruction said pnpm, say if you want pnpm everywhere). The dialog lists the packages, they are part of the fingerprint, nothing is installed for a fix whose `package.json` has uncommitted changes, and a failing install says that the files were already written. `pnpm`, and `bun` were added to the binaries the tool runs.
14. **`dependency-tool-choice`** adds `lint:knip` (`knip && echo lint:knip success`) when absent and installs `knip`. No `knip.json`.
15. **`unit-testing-dependency`** installs `vitest` and sets `"test": "vitest --run && echo test success"` when there is no test script or a placeholder `echo ...`; an existing real script is kept. No `--passWithNoTests`.
16. **`coverage-dependency`**: installs `@vitest/coverage-v8` (and `vitest` when missing), adds `--coverage` to a vitest test script, and sets the 100% threshold in the vitest config, creating `vitest.config.ts` when there is none (merged with the vite config with `mergeConfig` when there is a `vite.config.*`, which assumes that file exports an object, not a function). A project that tests with mocha, uvu or `bun test` is not touched (the finding stays). **Expect `test` to fail on `flood-it` and `ts-result-comparison`**, they have no tests: that is the point of the 100% threshold you chose.
17. **Not done on purpose**: `missing-license` on GitHub (a license is a file, the LICENSE fixer covers it), `missing-topics`, `readme-logo`, `readme-demo`, `scripts-unique-mark`, `package-files`, `package-keywords`, and the findings of the clones (behind, stashes, branches).
18. **`pnpm-lock.yaml` and `bun.lock`** are both in the repo, I updated both for `magicast` (`bun add`, `pnpm install --lockfile-only`).

## The last 20 checks (2026-10-18)

Decisions taken without asking while building every check that was still 📋. Change any of them if you disagree.

1. **Fixes only through what already exists.** A check has a fix when a file edit, the git fix or the Archive action can settle it: `outdated-minor-dependency` (patch and minor), `version-drift`, `outdated-package-manager`, `website-static-files` (not the favicon), `external-link-rel`, `lighthouse-budget`, `stale-local-branch` (the merged branches, through the git fix), `archive-candidate`, `renovate-only-zombie` and `stale-uncloned-repo` (Archive). The others report only: deleting a lockfile or a branch on GitHub, re-running a build, choosing a replacement for a deprecated package, a security update or a real image size are actions or decisions of their own. They are listed in `TODOS.md`.
2. **`outdated-major-dependency` and `outdated-minor-dependency` only report a version the range does not admit.** `~1.2.3` with 1.2.9 out is fine, a fresh install gets it, `~1.2.3` with 1.3.0 out is reported. On your folder this keeps about 100 findings instead of 300. A major update is a warning and never fixed, a patch or minor one is an info.
3. **`version-drift` ignores patch differences and projects that are ahead.** It needs 3 projects to use a package, compares with the most common version (the highest one on a tie) and fixes by setting that version. The fleet is read at each full scan and kept for the rescans and the fixes.
4. **`security-advisory` reads the lowest version of a range**, with one call per project to the advisory endpoint of the npm registry, not `pnpm audit` nor the Dependabot alerts: no install, no token, one call.
5. **The npm registry is asked once an hour per package**, in memory, 8 calls at a time. When it cannot be reached the three registry checks and `outdated-package-manager` do not apply instead of passing. A cold scan of 59 projects takes 6 to 7 seconds.
6. **`ci-failing` reads the last finished workflow run of the default branch**, one call per live repo. `deploy-down` asks the `webUrl` of `.repo-checker.json`, else the GitHub Pages of the repo, and only when GitHub itself answers, so an offline machine does not flag every site. 401, 403 and 429 count as answering.
7. **`archive-candidate` reads the last commit of the account** (`author=<login>`, so Renovate is excluded) only for repos that could qualify: not cloned, or no star and nothing deployed. Cloned repos only for `archive-candidate`, not cloned ones for `stale-uncloned-repo`, Renovate pull requests open for `renovate-only-zombie`, so no repo gets two findings. `not-cloned` no longer offers a clone for a stale repo, the Archive action replaces it. Thresholds: 12 months, 6 for a zombie, 6 for a branch, 12 for a tag.
8. **The git checks of branches and tags read the clone after the fetch**: no GitHub call for `stale-remote-branch`, it reads `refs/remotes/origin`. "Merged" means merged into `origin/HEAD`. A branch of Renovate or Dependabot is never "untouched".
9. **A `null` cannot be used in this repo**: the linter rewrites it to `undefined` on `--fix`. A repo the account never committed to has `lastOwnCommitAt: 'never'`.
