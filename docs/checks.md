# Checks

Every check `repo-checker` handles or is meant to handle. This file is the single source of truth for checks: the ids below are the ids used in the code and tests. The exact behavior and safety rules of the Sync checks are in [features.md](features.md), work that is not a check is in [../TODOS.md](../TODOS.md). Each level 2 title is a group, the list below it holds the checks attached to that group.

Format: an emoji for the status, an emoji for the severity (followed by ❔ for a nitpick check), then `` `check-id` ``, then what it detects.

- ✅ built, with a fix: a check of the new engine that `--fix` or a button of the page can repair. Many come from the old tool, the file in parentheses says which.
- ☑️ built, without a fix: the check only reports, what to do is for you to say, like `broken-clone`.
- 📋 todo: wanted, not built yet. The file in parentheses of a built check is where it lived in the old code (`src/files/`, removed, see git history).
- ❔ after the severity: a nitpick check, only active when the nitpick mode is on (`--nitpick`, or the toggle of the page), like `☑️ 🔵❔ stale-last-tag`, a nitpick without a fix.

Severity, one scale for every check:

- 🔴 error: something is wrong, or work could be lost. The CLI exits with an error code.
- 🟡 warning: should be fixed, nothing breaks.
- 🔵 info: a suggestion, a cleanup, or something worth knowing.

Ported checks keep the old tool's level: its "failed" checks are 🔴, its "warning" checks are 🟡, the README todo lines are 🔵.

Rename and reorder freely until a check is built. Ids are kebab-case so they can be used as code identifiers and test names.

The old tool also knew whether `--fix` could repair a rule. That is not repeated here, see the old source.

## Sync

Comparison between your repos on GitHub and your clones on disk.

- ✅ 🔵 `not-cloned`: a repo on GitHub, not archived, not a fork, with no clone in the folder. Fix: clone it.
- ☑️ 🟡 `broken-clone`: a local folder that is not a git repo, has no `origin`, whose `origin` returns 404 on GitHub, or whose state git cannot read (a corrupt index, a failed `git status`). Reported with the reason and the path, no fix. Nothing is offered on an unreadable clone: a git failure never reads as a clean clone.
- ✅ 🔴 `archived-with-unsaved-work`: the repo is archived on GitHub and its clone holds unpushed commits, uncommitted files, a stash or local-only branches. Fixes: unarchive, push, re-archive; or discard.
- ✅ 🔵 `archived-clone`: the repo is archived on GitHub and its clone is provably safe to delete. Fix: delete the clone.
- ✅ 🔵 `pristine-fork`: a fork where every branch has zero commits ahead of its parent, there is no open PR, and any local clone is clean. Fix: delete the fork repo and its local clone. Forks that cannot be verified are listed and never offered.

## Git hygiene

State of each clone and of its git history.

- ✅ 🟡 `behind-remote`: the clone is behind its remote and needs a pull. Needs a `git fetch`. Fix: the git fix pulls the default branch when it is checked out and clean, fast forward only, and moves the other branches forward the same way.
- ☑️ 🟡 `uncommitted-files`: uncommitted or untracked files. Skipped when another branch than the default one is checked out.
- ☑️ 🟡 `unpushed-commits`: commits that are not on the remote.
- ✅ 🔵 `forgotten-stash`: a stash that was never reapplied or dropped. Fix: the git fix drops the stash, for good, after confirmation.
- ✅ 🔵 `branch-without-upstream`: a local branch with no upstream. Fix: the git fix deletes the branch, even when it holds work that is not merged, after confirmation.
- ✅ 🔵 `not-on-default-branch`: the clone is checked out on another branch than the default one, it offers to check the default branch out.
- ✅ 🔵 `stale-local-branch`: a local branch that is already merged into the default branch, or untouched for 6 months and not merged. The git fix deletes the merged ones, with the others it deletes after confirmation, the untouched ones are left to you (`stale.rule.ts`).
- ☑️ 🔵 `stale-remote-branch`: the same, for the branches on GitHub as the last fetch saw them, the branches of Renovate and Dependabot wait for their pull request. No fix, deleting a branch on GitHub is `git push origin --delete` and is not offered yet (`stale.rule.ts`).
- ☑️ 🔵❔ `stale-last-tag`: the last git tag is 12 months old or more and commits came since, suggest tagging a release. No fix, a release is for you to cut. From the old README todo list (`stale.rule.ts`). A nitpick check.
- ☑️ 🔵 `tag-prefix-v`: the last git tag starts with a digit, the tags of the projects are `vX.Y.Z`. No fix, renaming a tag on GitHub is for you to do. Fix: for each tag, create a lightweight `v` tag on the same commit (`git tag v2.0.1 2.0.1^{commit}`, not an annotated one, repo-check orders tags of one commit by name and the old name would win), push them, then delete the old tags on the remote and locally (`git push origin :refs/tags/2.0.1`, `git tag -d 2.0.1`). Note the old SHAs first, the check stays red until the old tags are gone (`stale.rule.ts`).
- ☑️ 🔵 `version-not-tagged`: the last git tag is the `version` of `package.json`, with or without the `v`. Skipped without a tag or a version, or when the checked out branch is not the default one. No fix, a release is tagged by you, or the tag was not fetched (`stale.rule.ts`).
- ☑️ 🟡 `avoid-main-branch`: avoid the `main` branch name, use `master` (`git.ts`).
- ✅ 🔴 `gitignore-exists`: a `.gitignore` file exists (`git.ts`).
- ✅ 🟡 `gitignore-node-modules`: `.gitignore` lists `node_modules` (`git.ts`).
- ✅ 🟡 `gitignore-keeps-pnpm-lock`: `.gitignore` does not exclude `pnpm-lock.yaml` (`pnpm-lock.yaml`, `/pnpm-lock.yaml`, `**/pnpm-lock.yaml`), a comment or a negation is fine. Fix: delete the line (`git.ts`).
- ✅ 🟡 `gitignore-keeps-github`: `.gitignore` does not exclude the `.github` folder (`.github`, `/.github/`, `.github/**`), the workflows and the repo config must be committed. Fix: delete the line (`git.ts`).
- ✅ 🟡 `gitignore-turbo`: `.gitignore` lists `.turbo` when the project depends on turbo.
- ✅ 🟡 `gitignore-dist`: `.gitignore` lists the build output (`dist`, `build` or `out`) when the project has a `build` script. Fix: add `dist` (`gitignore-baseline.rule.ts`).
- ✅ 🟡 `gitignore-coverage`: `.gitignore` lists `coverage` when a script or a dependency (`@vitest/coverage-*`, `c8`, `nyc`) mentions coverage. Fix: add `coverage` (`gitignore-baseline.rule.ts`).
- ✅ 🔴 `gitignore-env`: `.gitignore` lists `.env` when a `.env` file exists in the clone, a secret must never be committed. Fix: add `.env` (`gitignore-baseline.rule.ts`).
- ✅ 🟡 `gitignore-tsbuildinfo`: `.gitignore` lists the `.tsbuildinfo` files when the project writes them: a tsconfig sets `incremental`, `composite` or `tsBuildInfoFile`, or a script runs `tsc --build`. Fix: add `*.tsbuildinfo` (`gitignore-baseline.rule.ts`).
- ✅ 🟡 `gitignore-playwright-results`: `.gitignore` lists `test-results` when the project depends on `@playwright/test`. Fix: add `test-results` (`gitignore-baseline.rule.ts`).
- ✅ 🟡 `gitignore-playwright-report`: `.gitignore` lists `playwright-report` when the project depends on `@playwright/test`. Fix: add `playwright-report` (`gitignore-baseline.rule.ts`).

## Dependencies

What the project depends on, and how current and safe that is.

- ✅ 🟡 `typescript-7`: `typescript` is at `~7` (native `tsc`) and `@typescript/native-preview` (`tsgo`) is gone. Fix: write the latest 7 range, delete the preview package.

- ☑️ 🟡 `outdated-major-dependency`: the version a dependency declares is a major update behind the latest on the npm registry, one finding per dependency. No fix, a major update can break the code and is left to you and to Renovate (`registry.rule.ts`).
- ✅ 🔵❔ `outdated-minor-dependency`: the version a dependency declares is a patch or a minor update behind the latest on the npm registry, one finding per dependency. Fixed by bumping it, keeping the range prefix (`registry.rule.ts`). A nitpick check.
- ☑️ 🟡 `deprecated-dependency`: a dependency whose latest version is marked deprecated on the npm registry. No fix, what replaces it is for you to say (`registry.rule.ts`).
- ☑️ 🔴 `security-advisory`: the declared version of a dependency has a known vulnerability, from the advisory endpoint of the npm registry, asked once per project with the declared versions (the lowest version of a range, so `~` and exact versions are exact). No fix, `outdated-minor-dependency` fixes most of them (`registry.rule.ts`).
- ☑️ 🔴 `no-sass-dependency`: no `sass` dependency, it is fat and useless. Only when the project data says to avoid it (`package.file.ts`).
- ☑️ 🔴 `no-cross-var-dependency`: no `cross-var` dependency, it is old and deprecated (`package.file.ts`).
- ☑️ 🔴 `no-tslint-dependency`: no `tslint` dependency, it is deprecated (`package.file.ts`).
- ☑️ 🔴 `no-eslint-plugin-promise-5`: no `eslint-plugin-promise` 5, it requires eslint 7 (`package.file.ts`).
- ☑️ 🟡 `no-fat-color-dependency`: no `chalk`, `colorette` or `colors`, use shuutils or nanocolors (`package.file.ts`).
- ☑️ 🟡 `no-fs-extra-dependency`: no `fs-extra`, use native fs (`package.file.ts`).
- ☑️ 🟡 `no-shuunen-stack-dependency`: no `shuunen-stack` dependency (`package.file.ts`).
- ☑️ 🟡 `no-jsdom-dependency`: no `jsdom`, use happy-dom instead (`package.file.ts`).
- ☑️ 🟡 `no-npm-run-all-dependency`: no `npm-run-all`, chain tasks with `&&` or use `npm-parallel` (`package.file.ts`).
- ☑️ 🟡 `esbuild-plugin-run-alternative`: when `esbuild-plugin-run` is used, suggest `typescript-run` (`ts-run src --watch`) (`package.file.ts`).
- ✅ 🟡 `repo-check-dependency`: a project with a `package.json` has `repo-check` installed, the fix installs it as a dev dependency. Skipped in repo-checker itself (`package.file.ts`).
- ✅ 🟡 `latest-repo-check-version`: the `repo-check` dependency matches the latest major.minor. Skipped in repo-checker itself (`package.file.ts`).
- ✅ 🟡 `renovate-config-exists`: a `renovate.json` file exists (`renovate.ts`).
- ✅ 🟡 `renovate-schema`: `renovate.json` declares the Renovate `$schema` (`renovate.ts`).
- ☑️ 🔴 `renovate-extends`: `renovate.json` has an `extends` section (`renovate.ts`).
- ✅ 🔴 `renovate-no-config-base`: no deprecated `config:base`, use `config:semverAllMonthly` (`renovate.ts`).
- ☑️ 🔴 `renovate-dashboard-off`: `dependencyDashboard` is set to false (`renovate.ts`).
- ☑️ 🔴 `renovate-automerge`: the `:automergeAll` preset is used, when the project data allows auto-merge (`renovate.ts`).
- ✅ 🟡 `renovate-semver-all-monthly`: the `config:semverAllMonthly` preset is used, it groups the updates once a month. Fix: it replaces `config:recommended` or `config:base`, else it goes first in `extends` (`renovate.rule.ts`).
- ✅ 🟡 `dev-tool-in-dependencies`: a build, check or test tool (`@types/*`, `typescript`, `vite`, `vitest`, `oxlint`, `oxfmt`, `knip`, `turbo`, `tailwindcss`, `@tailwindcss/vite`) is in `dependencies`, one finding per tool. Skipped for a package published to npm, which may need them. Fix: move it to `devDependencies`, keeping the version already there when it is in both, and drop `dependencies` when it ends up empty (`dev-tool.rule.ts`).
- ✅ 🟡 `renovate-preserve-semver-ranges`: the `:preserveSemverRanges` preset is used, so a bump keeps `^1.2.0` instead of writing `1.3.0`. 13 of 16 projects have it. Fix: add it to `extends` (`renovate.rule.ts`).
- ✅ 🟡 `renovate-no-duplicate-preset`: `extends` does not list the same preset twice. Fix: keep the first one (`renovate.rule.ts`).
- ☑️ 🟡 `no-axios-dependency`: no `axios`, use the native fetch (`forbidden.rule.ts`).
- ☑️ 🟡 `no-classnames-dependency`: no `classnames`, use `clsx` (`forbidden.rule.ts`).
- ☑️ 🟡 `no-lodash-dependency`: no `lodash` or `lodash-es`, use `es-toolkit` (`forbidden.rule.ts`).
- ☑️ 🟡 `no-moment-dependency`: no `moment` or `moment-timezone`, use native `Intl` and `Date` or shuutils (`forbidden.rule.ts`).
- ☑️ 🟡 `no-react-icons-dependency`: no `react-icons`, use `lucide-react` (`forbidden.rule.ts`).

## Turbo

`turbo.json` and the tasks it caches, see [scripts-turbo.md](scripts-turbo.md).

- ✅ 🟡 `turbo-installed`: `turbo` is a dependency and there is a `turbo.json`. Fix: add the dependency, write a `turbo.json` for the tasks run by `turbo run`.
- ✅ 🟡 `turbo-config`: `turbo.json` has the `$schema` and, on each task run by `turbo run`, `inputs` that start from `$TURBO_DEFAULT$` (a hand-written list gets it put in front), `outputs` on `build:vite` and `test:unit`, every other task depends on `lint:install` when the project has it, and `lint:repo` also on every `build:*` task the project has.
- ✅ 🟡 `turbo-tasks-declared`: every task run by `turbo run` in `check`, `lint` or `test` is declared in `turbo.json`. Fix: declare it with its inputs.

## Runtime and package manager

Which Node and which package manager the project uses, and how that is pinned.

- ✅ 🔴 `nvmrc-exists`: a `.nvmrc` file exists (`nvmrc.ts`).
- ✅ 🟡 `nvmrc-recent-node`: `.nvmrc` pins a recent LTS Node version: the major of the latest LTS read from nodejs.org, or the one before (26 when it cannot be read) (`node.rule.ts`).
- ✅ 🟡 `npmrc-exists`: an `.npmrc` file exists, unless `packageManager` pins pnpm 12 or above (`npmrc.file.ts`).
- ✅ 🟡 `npmrc-pre-post-scripts`: `.npmrc` has `enable-pre-post-scripts=true`, when the project uses task prefixes (`npmrc.file.ts`).
- ✅ 🟡 `outdated-package-manager`: the `packageManager` pins a `pnpm`, `npm` or `bun` version that is a major behind the latest on the npm registry, patch and minor updates are not reported. Fixed by pinning the latest (`package-manager.rule.ts`).
- ☑️ 🔴 `multiple-lockfiles`: more than one package manager left a lockfile in the project, `bun.lock` and `bun.lockb` count as one. No fix, which one to keep is for you to say (`lockfiles.rule.ts`).
- ✅ 🟡 `pnpm-workspace-no-legacy-only-built`: `pnpm-workspace.yaml` has no legacy `onlyBuiltDependencies` list, `allowBuilds` replaces it. Fix: move each package to `allowBuilds` as `name: true`, keeping the ones already there (`pnpm-workspace.rule.ts`).
- ☑️ 🟡 `old-lockfile-format`: a lockfile in an obsolete format, `bun.lockb` or `shrinkwrap.yaml`. No fix, a lockfile is only regenerated by its package manager (`lockfiles.rule.ts`).

## Package

Content of `package.json`, apart from scripts and publishing.

- ☑️ 🔴 `package-json-exists`: a `package.json` file exists (`package.file.ts`).
- ✅ 🟡 `package-schema`: `package.json` declares the schemastore `$schema` (`package.file.ts`).
- ☑️ 🔴 `package-name`: a `name` property (`package.file.ts`).
- ☑️ 🔴 `package-version`: a `version` property (`package.file.ts`).
- ☑️ 🟡 `package-private`: a `private` property (`package.file.ts`).
- ☑️ 🟡 `package-files`: a `files` property (`package.file.ts`).
- ☑️ 🟡 `changelog-exists`: a `CHANGELOG.md` file exists, when the project has a `package.json`. No fix, the entries are yours to write (`changelog.rule.ts`).
- ☑️ 🟡 `changelog-latest-version`: the top version entry of the changelog (below `[Unreleased]`) equals the `version` of `package.json`. Skipped without an entry. No fix, the entry is yours to write (`changelog.rule.ts`).
- ✅ 🟡 `version-file-exists`: a `VERSION` file exists, when `package.json` has a `version`. Fix: create it with that version (`version-file.rule.ts`).
- ✅ 🟡 `version-file-in-sync`: `VERSION` holds the `version` of `package.json`. Fix: write the `package.json` version, the one that is bumped (`version-file.rule.ts`).
- ☑️ 🔵 `package-dependencies-sections`: the `dependencies` and `devDependencies` sections that the other dependency checks rely on. The old tool only used it to skip those checks and never reported it (`package.file.ts`).
- ✅ 🔵 `package-keys-sorted`: the top-level keys of `package.json` are sorted alphabetically, `$schema` first. Fix: sort the file. The content of `exports`, `imports` and `typesVersions` keeps its order, their conditions and paths are matched in order, so sorting them could break the package (`package-sorted.rule.ts`).
- ✅ 🔵 `package-scripts-sorted`: the `scripts` of `package.json` are sorted alphabetically. Fix: sort the file, see `package-keys-sorted` (`package-sorted.rule.ts`).
- ✅ 🔵 `package-dependencies-sorted`: `dependencies`, `devDependencies`, `peerDependencies` and `optionalDependencies` are sorted alphabetically. Fix: sort the file, see `package-keys-sorted` (`package-sorted.rule.ts`).

## Scripts

The `scripts` section of `package.json`.

- ☑️ 🔴 `scripts-section`: a `scripts` section exists (`package.file.ts`).
- ☑️ 🟡 `scripts-check`: a `check` script, like `pnpm build && pnpm lint ...` (`package.file.ts`).
- ☑️ 🟡 `scripts-no-ci`: no `ci` script, use `check` instead (`package.file.ts`).
- ☑️ 🔴 `scripts-typescript-check`: a `tsc` build or check, when the project uses TypeScript (`package.file.ts`).
- ✅ 🟡 `scripts-preversion`: a `preversion` script for version automation, like `pnpm check` (`package.file.ts`).
- ✅ 🟡 `scripts-postversion`: a `postversion` script, like `git push && git push --tags`, plus `npm publish` for a published package (`package.file.ts`).
- ☑️ 🔴 `scripts-no-prepublish`: `prepare` instead of the deprecated `prepublish` (`package.file.ts`).
- ✅ 🟡 `scripts-final-echo`: the tasks end with `&& echo <task> completed successfully`, plus `|| (echo Please run pnpm run <fix task> to ... && exit 1)` when the task has a fix task (`lint:format`, `lint:issues`). Fix: write that ending. See [scripts-turbo.md](scripts-turbo.md).
- ✅ 🟡 `scripts-required-tasks`: the tasks every project has (`lint`, `lint:format`, `lint:format:fix`, `lint:issues`, `lint:issues:fix`, `lint:install`, `lint:knip`, `lint:repo`, `lint:types`, `test`, `test:unit`, `test:update`, `test:watch`, `up:deps`), plus `test:ui` with Vitest, `test:e2e` with Playwright and `build`, `dev`, `preview` for a Vite web app. Fix: add the task with its command, when the command is known.
- ✅ 🟡 `scripts-commands`: each task runs its agreed command (`oxfmt --check`, `tsc -p` for every `tsconfig.*.json`, `vitest run --coverage`...). Fix: write the command. When `lint:repo` already runs another tool (like `repo-lint`), rename that script (like `lint:sources`) with its `turbo.json` task, then add `"lint:repo": "repo-check"` and a `lint:repo` task depending on `lint:install` and every `build:*` task, list both in `check` and `lint`, and drop a trailing `&& repo-check` from `check`.
- ✅ 🟡 `scripts-check-turbo`: `check` and `lint` run their tasks through `turbo run`. Fix: add the missing tasks to the `turbo run`.
- ✅ 🟡 `scripts-lint-tasks-listed`: every `lint:*` script (but the `:fix` ones) is run by both `lint` and `check`. Fix: add the missing tasks to their `turbo run`.
- ✅ 🟡 `scripts-build-tasks`: the `build` script does not run a build tool itself, it runs `turbo run build:*`, so `lint:repo` can wait for the `build:*` tasks. Fix: split `tsc`, `vite build` and `tsdown` steps into `build:tsc`, `build:vite` and `build:tsdown`, not fixed for another tool. Fix: keep a custom build script (like `bun scripts/build.ts`) in `build:app`, make `build` run `turbo run build:app`, and rename the task in `turbo.json`, in `check` and in the `dependsOn` of `lint:repo`.
- ✅ 🟡 `scripts-no-duplicate-lint`: no leftover script runs a tool the agreed lint tasks already run: `tsc --noEmit` (`lint:types`), `oxlint` (`lint:issues`), `oxfmt` (`lint:format`). The agreed tasks and the `build`, `check`, `test`, `pre*` and `post*` scripts are kept. Fix: delete the script and the calls to it in the other scripts.
- ✅ 🟡 `scripts-bun`: a script that runs `bun` needs the `bun` dependency and `allowBuilds: bun: true` in `pnpm-workspace.yaml`. Fix: add both.
- ✅ 🟡 `scripts-no-npm-run`: use `pnpm` or `bun` instead of `npm run`, which is faster, and drop the `--` before flags with pnpm (`package.file.ts`).
- ☑️ 🟡 `scripts-no-npm-test`: no `npm test`, use `pnpm test` or `bun test` (`package.file.ts`).
- ☑️ 🟡 `scripts-watchlist-eager`: a `watchlist` task uses the `-eager --` parameter (`package.file.ts`).
- ☑️ 🔴 `scripts-depcruise`: a `depcruise` usage, when the project uses dependency-cruiser (`package.file.ts`).
- ✅ 🟡 `unique-mark-plugin`: a vite or tsdown config uses the `uniqueMark()` plugin of `shuutils/plugins`, when there is a `build` task and the project uses shuutils. Fixed by adding the import and the plugin to the first config found (`unique-mark.rule.ts`).
- ☑️ 🟡 `unique-mark-no-binary`: no script runs the `unique-mark` binary when a vite or tsdown config already uses the `uniqueMark()` plugin, it marks the build twice otherwise (`unique-mark.rule.ts`). Fix: delete the `mark` script and the `pnpm mark &&` call in `build`, the plugin already marks the build.
- ✅ 🟡 `scripts-eslint-cache`: eslint runs with `--cache` (`package.file.ts`).
- ☑️ 🟡 `scripts-no-eslint-ignore-path`: eslint runs without `--ignore-path`, so the CLI and VS Code use the same config (`package.file.ts`).
- ☑️ 🟡 `scripts-ts-node-transpile-only`: any `ts-node` call in the project uses `--transpileOnly` (`package.file.ts`).
- ☑️ 🔴 `scripts-bun-no-misleading-test`: with Bun, no `bun test` inside the `check` task, use `bun run test` (`package.file.ts`).
- ☑️ 🔴 `scripts-bun-no-misleading-build`: with Bun, no `bun build` inside the `check` or `postversion` tasks, use `bun run build` (`package.file.ts`).
- ☑️ 🔴 `scripts-bun-install`: with Bun, no `bun i`, use `bun install` (`package.file.ts`).
- ☑️ 🟡 `scripts-bun-no-node`: with Bun, no `node` to run a js or ts file, use `bun`. `node` stays allowed with `--watch-path`, because bun's `--watch` only follows imported files and cannot watch a folder (`package.file.ts`).

## Publishing

For projects published as a package. The entry point checks (`types`, `main`, `module`, `exports`) skip a CLI that only publishes a `bin`.

- ☑️ 🟡 `publish-type-module`: a `"type": "module"` declaration (`package.file.ts`).
- ☑️ 🔴 `publish-types-field`: a `types` field, when the package is not a CLI and uses TypeScript (`package.file.ts`).
- ☑️ 🔴 `publish-main-field`: a `main` field pointing to a `.js` file (ESM project) or a `.cjs` file (CommonJS project) (`package.file.ts`).
- ☑️ 🔴 `publish-module-field`: ESM project, no `module` field (`package.file.ts`).
- ☑️ 🟡 `publish-cjs-module-field`: CommonJS project, a `module` field pointing to a `.mjs` file (`package.file.ts`).
- ☑️ 🔴 `publish-exports-field`: ESM project, an `exports` field mapping `import` to a `.js` build and `require` to a `.cjs` build (`package.file.ts`).
- ☑️ 🟡 `publish-cjs-exports-field`: CommonJS project, an `exports` field mapping `import` to an `.mjs` build and `require` to a `.cjs` build (`package.file.ts`).
- ☑️ 🟡 `publish-max-size-declared`: the maximum size of the main file is set in the data file (for example `maxSizeKo: 100`) (`package.file.ts`).
- ☑️ 🔴 `publish-main-file-exists`: the file named in `main` exists on disk, so build before checking (`package.file.ts`). Fix: `lint:repo` depends on the build tasks in `turbo.json` (`turbo-config`), so repo-check runs after the build, because CI starts without `dist/`.
- ☑️ 🔴 `publish-main-file-size`: the main file is no bigger than the declared maximum size (`package.file.ts`).

## Code tooling

Linting, formatting, typing and architecture config files.

- ✅ 🟡 `repo-checker-config`: the tool's own `.repo-checker.json` exists. The old tool also migrated `.repo-checker.js` and `repo-checker.config.js` into it, the new one does not (`repo-checker.ts`).
- ✅ 🔵 `repo-checker-config-schema`: `.repo-checker.json` declares `$schema: ./node_modules/repo-check/schema.json`. Fix: set it first. Skipped in repo-checker itself (`repo-checker-config.rule.ts`).
- ✅ 🟡 `repo-checker-config-known-keys`: every key of `.repo-checker.json` is one of `schema.json`. Fix: `web_url` becomes `webUrl`, the user keys the git config replaced (`user_mail`, `user_name`, `userMail`, `userName`) are removed. Another unknown key is reported, not fixed (`repo-checker-config.rule.ts`).
- ✅ 🔴 `editorconfig-exists`: an `.editorconfig` file exists (`editor-config.ts`).
- ☑️ 🔴 `editorconfig-indent`: `indent_style = space` and `indent_size = 2` (`editor-config.ts`).
- ☑️ 🔴 `editorconfig-line-endings`: `end_of_line = lf` (`editor-config.ts`).
- ☑️ 🔴 `editorconfig-charset`: `charset = utf-8` (`editor-config.ts`).
- ☑️ 🟡 `editorconfig-trim-whitespace`: `trim_trailing_whitespace = true` (`editor-config.ts`).
- ☑️ 🟡 `editorconfig-final-newline`: `insert_final_newline = true` (`editor-config.ts`).
- ☑️ 🟡 `editorconfig-no-html-indent`: no specific `[*.html]` indent rule (`editor-config.ts`).
- ☑️ 🔴 `eslint-config-exists`: an ESLint flat config exists (`eslint.config.js`, `.mjs`, `.cjs`, `.ts` or `.mts`), when the project uses ESLint (`eslint.file.ts`).
- ☑️ 🟡 `eslint-no-deprecated-config`: no `.eslintrc.json` or `.eslintrc.js`, use the flat config (`eslint.file.ts`).
- ☑️ 🔴 `eslint-no-xo-config`: no `xo.config.js` (`eslint.file.ts`).
- ☑️ 🔴 `eslint-dependency`: an `eslint` dependency, and not version 8 (`package.file.ts`).
- ☑️ 🔴 `eslint-browser-config`: the ESLint config references a browser environment when the project uses Tailwind (`eslint.file.ts`).
- ☑️ 🔴 `biome-config-exists`: a `biome.json` file exists, when the project uses Biome (`biome.file.ts`).
- ✅ 🟡 `biome-schema`: `$schema` points to `./node_modules/@biomejs/biome/configuration_schema.json` (`biome.file.ts`).
- ✅ 🟡 `biome-sections`: the sections `formatter`, `javascript`, `json`, `linter`, `assist`, `vcs` and `overrides` exist (`biome.file.ts`).
- ✅ 🟡 `biome-formatter`: `indentStyle` is `space`, `indentWidth` is 2, `lineEnding` is `lf`, `lineWidth` is above 80 (`biome.file.ts`).
- ✅ 🟡 `biome-javascript-formatter`: `arrowParentheses` is `asNeeded`, `bracketSpacing` is true, `quoteStyle` is `single`, `semicolons` is `asNeeded` (`biome.file.ts`).
- ✅ 🟡 `biome-json-parser`: `allowComments` and `allowTrailingCommas` are false (`biome.file.ts`).
- ✅ 🟡 `biome-linter`: `enabled` and `rules.recommended` are true, `rules.style.useBlockStatements` is `off`, domains `project` and `test` are `all`, and domain `react` is `all` when the project uses React (`biome.file.ts`).
- ✅ 🟡 `biome-assist`: `assist.actions.source.organizeImports` is `on` (`biome.file.ts`).
- ✅ 🟡 `biome-vcs`: `vcs.enabled` is true, `clientKind` is `git`, `useIgnoreFile` is true (`biome.file.ts`).
- ✅ 🟡 `biome-test-override`: an override for `**/*.test.ts` that turns `noUnusedTemplateLiteral` off (`biome.file.ts`).
- ☑️ 🟡 `eslint-leftover-config`: no ESLint config (`.eslintrc*`, `.eslintignore`, `eslint.config.*`) once the project no longer uses ESLint. No fix, deleting a file is for you to do (`leftovers.rule.ts`).
- ✅ 🔵 `eslint-leftover-extension`: `.vscode/extensions.json` does not recommend `dbaeumer.vscode-eslint` once the project no longer uses ESLint. Fix: remove it from `recommendations` (`leftovers.rule.ts`).
- ✅ 🔵 `eslint-leftover-comment`: no `eslint-disable` or `eslint-enable` comment in a source file (declaration, generated and vendored files are skipped) once the project no longer uses ESLint. Fix: in a project that uses oxlint, rename the directive to `oxlint-disable`, which oxlint reads the same way, else no fix (`leftovers.rule.ts`).
- ☑️ 🟡 `eslint-leftover-script`: no script runs `eslint` once the project no longer uses ESLint. No fix (`leftovers.rule.ts`).
- ✅ 🔵 `eslint-leftover-gitignore`: `.gitignore` does not list `.eslintcache` once the project no longer uses ESLint. Fix: delete the line (`leftovers.rule.ts`).
- ☑️ 🟡 `biome-leftover-config`: no `biome.json` or `biome.jsonc` once the project no longer depends on Biome. No fix (`leftovers.rule.ts`).
- ✅ 🔵 `biome-leftover-extension`: `.vscode/extensions.json` does not recommend `biomejs.biome` once the project no longer depends on Biome. Fix: remove it from `recommendations` (`leftovers.rule.ts`).
- ☑️ 🔵 `biome-leftover-comment`: no `biome-ignore` comment in a source file once the project no longer depends on Biome. No fix (`leftovers.rule.ts`).
- ☑️ 🟡 `biome-leftover-script`: no script runs `biome` once the project no longer depends on Biome. No fix (`leftovers.rule.ts`).
- ✅ 🔵 `vscode-colors`: `.vscode/settings.json` sets `workbench.colorCustomizations` from the `themeColor`: the title bar, the activity bar badges and the active tab border are the theme color, the activity bar, the status bar and the title bar of a window without focus a darker shade of it (HSL lightness minus 16), the texts a near white or near black, whichever is easier to read, softer on the status bar. Colors are written in lowercase `#rrggbb`, a capital or a short `#fff` is reported and rewritten. Skipped without a theme color, `theme-color-missing` says it. The status bar of a window without focus is dimmer (`statusBar.inactiveBackground`), VS Code has no key to dim its text or the activity bar. Fix: write the keys that differ, the other colors are kept (`vscode.rule.ts`).
- ☑️ 🔵 `theme-color-missing`: a `themeColor` is found, in `.repo-checker.json`, else the `theme_color` of a web manifest (`manifest.json` or `*.webmanifest`, anywhere git sees it, a browser extension manifest is not one), else a `<meta name="theme-color">` of a page, else the `titleBar.activeBackground` of `.vscode/settings.json`. A white `#ffffff` found in a file is the old default and is skipped, only `.repo-checker.json` can declare it. The first one wins and the others are checked against it (`vscode-colors`, `manifest-colors`, `index-html-theme-color`). No fix and no guessed color, the color is yours to choose (`theme-color.rule.ts`).
- ✅ 🟡 `tsconfig-schema`: `tsconfig.json` declares the schemastore `$schema`, when the project uses TypeScript (`ts-config.ts`).
- ✅ 🟡 `tsconfig-include`: an `include` section (`ts-config.ts`).
- ✅ 🟡 `tsconfig-compiler-options`: the recommended options are set: `allowUnreachableCode` false, `allowUnusedLabels` false, `checkJs`, `esModuleInterop`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`, `noImplicitAny`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` false, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `skipLibCheck`, `strict`, `verbatimModuleSyntax`. When the config extends `tsconfig/strictest`, only `verbatimModuleSyntax`. Skipped when the config uses `references` (`ts-config.ts`).
- ✅ 🟡 `tsconfig-out-dir`: an `outDir` compiler option (`ts-config.ts`).
- ✅ 🟡 `tsconfig-module-resolution`: a `moduleResolution` compiler option (`ts-config.ts`).
- ✅ 🟡 `tsconfig-lib`: a non-empty `lib` compiler option (`ts-config.ts`).
- ☑️ 🔴 `tsconfig-no-wildcard-files`: no wildcard in the `files` section (`ts-config.ts`).
- ✅ 🟡 `tsconfig-no-useless-glob`: no `my-folder/**/*` in `include`, `my-folder` is enough (`ts-config.ts`).
- ✅ 🟡 `dependency-tool-choice`: use knip or dependency-cruiser. Skipped when the project uses knip or has no package.json (`dependency-cruiser.ts`).
- ☑️ 🔴 `dependency-cruiser-config`: a `.dependency-cruiser.js` or `.dependency-cruiser.cjs` file exists, when the project uses dependency-cruiser (`dependency-cruiser.ts`).
- ☑️ 🔴 `tailwind-content`: the Tailwind config (`.js`, `.ts`, `.mjs` or `.cjs`) has a `content` option, like `content: ['./src/**/*.{vue,js,ts,jsx,tsx}']`, when the project uses Tailwind (`tailwind.ts`).
- ✅ 🔴 `oxfmt-config-exists`: an `.oxfmtrc.json` or `.oxfmtrc.jsonc` file exists, when the project uses oxfmt. The fix creates it with the common style (`oxfmt.rule.ts`).
- ✅ 🟡 `oxfmt-schema`: the config has a `$schema` pointing to `./node_modules/oxfmt/configuration_schema.json` (`oxfmt.rule.ts`).
- ✅ 🟡 `oxfmt-formatter`: `useTabs: false`, `tabWidth: 2`, `endOfLine: "lf"`, `singleQuote: true`, `semi: false`, `arrowParens: "avoid"`, `bracketSpacing: true`, the same style the biome checks asked for, and `sortPackageJson: false` (the editor would otherwise reorder `package.json` on save while the CLI leaves it alone) (`oxfmt.rule.ts`).
- ✅ 🟡 `oxfmt-style`: `trailingComma: "all"`, `quoteProps: "as-needed"`, `bracketSameLine: false`, `objectWrap: "preserve"`, `singleAttributePerLine: false`, `sortImports: { ignoreCase: true, newlinesBetween: false }`, and a `printWidth` above 80 (240 in most projects, 300 here) (`oxfmt.rule.ts`).
- ✅ 🟡 `oxfmt-tailwind`: `sortTailwindcss` is set when the project uses Tailwind, its details are left to the project (`oxfmt.rule.ts`).
- ✅ 🟡 `oxfmt-ignore-redundant`: an `ignorePatterns` entry that `.gitignore` already covers is useless, oxfmt follows `.gitignore` (`oxfmt-ignore.rule.ts`).
- ✅ ⚪ `oxfmt-ignore-generated`: tracked files that look generated (`__snapshots__`, `__generated__`, `generated`, `mocks`, `vendor`, `*.generated.*`, `*.min.js`, `*.min.css`) and are not in `ignorePatterns`. The fix adds the pattern (`oxfmt-ignore.rule.ts`).
- ✅ 🔴 `oxlint-config-exists`: an `.oxlintrc.json` or `.oxlintrc.jsonc` file exists, when the project uses oxlint. The fix creates it with the schema, the categories and the plugins (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-schema`: the config has a `$schema` pointing to `./node_modules/oxlint/configuration_schema.json` (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-categories`: `correctness` is `error`, `nursery`, `pedantic`, `perf`, `restriction`, `style` and `suspicious` are `warn` (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-plugins`: the plugins `import`, `jsdoc`, `oxc`, `typescript` and `unicorn` are enabled, other plugins are kept (`oxlint.rule.ts`).
- ✅ 🔵 `oxlint-plugins-stack`: the oxlint config enables `promise`, plus `vitest` when the project depends on vitest and `react` when it depends on react (`react-perf` is not wanted: it flags inline props that rarely matter). Fix: add the plugins. They bring new rules, so run lint after the fix and tune or turn off what it reports, `promise` flagged 20+ warnings in repo-checker (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-house-rules`: `curly` is `["error", "multi"]`, `func-style` is `error` with `declaration`, `unicorn/filename-case` is `error`, `no-default-export` is `error` (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-test-override`: an override for the `*.test.*` files turns `no-magic-numbers` off, the fix adds one that also turns off `max-lines` and `max-statements` (`oxlint.rule.ts`).
- ✅ 🟡 `oxlint-type-aware`: `options.typeAware` and `options.typeCheck` are `true`, when the project uses oxlint and TypeScript (`oxlint.rule.ts`). Fix: after the autofix, run `pnpm run lint:format:fix`, and if oxlint then reports `TS2591` on `playwright.config.ts`, add that file to `include` in `tsconfig.node.json`.
- ✅ 🟡 `lint-toolchain`: a project that uses oxlint also depends on `oxfmt`, a project that uses TypeScript also depends on `oxlint-tsgolint`. The fix installs them (`oxlint.rule.ts`).
- ✅ 🟡 `knip-schema`: the knip config declares `$schema: https://unpkg.com/knip@<major>/schema.json`, with the major of the installed knip. Zero config is fine (`knip.rule.ts`).

## Testing

- ✅ 🟡 `unit-testing-dependency`: one unit testing tool among vitest, mocha, uvu, or `bun test` (`package.file.ts`).
- ✅ 🟡 `coverage-dependency`: one coverage tool among nyc, c8, `@vitest/coverage-v8`, `@vitest/coverage-c8`, or `bun test --coverage` (`package.file.ts`).
- ✅ 🟡 `vitest-pool-threads`: the vitest config (`.mts`, `.js`, `.ts` or `.mjs`) sets `pool: 'threads'`, when the project uses vitest (`vitest.ts`).
- ✅ 🔵 `vitest-coverage-100`: the vitest config, in `vitest.config.*` or in the `test` section of `vite.config.*`, requires a 100% coverage, `coverage: { thresholds: { 100: true } }`. Fix: set the thresholds, the checks of the project fail until its coverage is at 100% (`vitest-config.rule.ts`).
- ✅ 🔵 `vitest-globals`: the vitest config sets `globals: true`, so `describe`, `it` and `expect` are not imported. Fix: set it (`vitest-config.rule.ts`).
- ✅ 🔵 `vitest-reporter-dot`: the vitest config sets `reporters: ['dot']`, so a passing run stays quiet. Fix: set it, replacing another reporter (`vitest-config.rule.ts`).
- ✅ 🔵 `vitest-silent`: the vitest config sets `silent: true`, so the tests do not fill the console. Fix: set it (`vitest-config.rule.ts`).
- ✅ 🔵 `vitest-environment-happy-dom`: when the project depends on `happy-dom`, the vitest config sets an `environment`. A project that picks `node` on purpose is fine. Fix: set `environment: 'happy-dom'` (`vitest-config.rule.ts`).
- ☑️ 🟡 `test-no-spec-files`: no `.spec.*` file under `src`, `e2e`, `tests` or `test`, the tests of the project are `.test.*` files. No fix, a rename is for you to do (`test-files.rule.ts`).
- ☑️ 🔵❔ `test-file-colocated`: a `.test.*` file under `src` has a source file of the same name next to it. Skipped: `app`, `*integration*` and `*e2e*` tests and `test-utils` folders. No fix, moving a test is for you to do (`test-files.rule.ts`). A nitpick check.
- ✅ 🔵 `test-no-vitest-globals-import`: a test file does not import `describe`, `it` or `expect` from `vitest` when the vitest config sets `globals: true`. Fix: drop them from the import, and the import when nothing else is left, `vi` and the hooks stay (`test-files.rule.ts`).
- ☑️ 🔵❔ `test-no-to-be-in-the-document`: no `toBeInTheDocument()` in a test file, query the element with `getByTestId`, which throws when it is missing. No fix, the assertion is not a drop-in replacement (`test-files.rule.ts`). A nitpick check.
- ☑️ 🔴 `nycrc-exists`: a `.nycrc` or `.nycrc.json` file exists, when the project uses nyc (`nycrc.ts`).
- ✅ 🟡 `nycrc-schema`: the nyc config declares the schemastore `$schema` (`nycrc.ts`).
- ☑️ 🔴 `uvu-assert`: with uvu, tests import `equal` from `uvu/assert` and not from `assert` (`package.file.ts`).
- ✅ 🔴 `test-no-only`: no focused test (`it.only`, `test.only`, `describe.only`) in a `.test.*` or `.spec.*` file under `src`, `e2e`, `tests` or `test`, it silently skips the other tests. Fix: remove the `.only` (`test-only.rule.ts`).
- ☑️ 🟡 `playwright-config-exists`: a project that depends on `@playwright/test` has a `playwright.config.*`. No fix (`playwright.rule.ts`).
- ☑️ 🔵 `playwright-e2e-folder`: a project that depends on `@playwright/test` has its tests in `e2e/`, unless the config sets `testDir`. No fix (`playwright.rule.ts`).

## CI

- ☑️ 🔴 `ci-failing`: the last finished GitHub Actions run of the default branch failed, one GitHub call per live own repo. No fix, re-running or repairing a build is for you to do (`ci.rule.ts`).
- ☑️ 🔴 `ci-checkout-step`: `.github/workflows/ci.yml` has a checkout step (`gh-workflow.ts`).
- ☑️ 🔴 `ci-checkout-version`: the checkout action is a recent version, v5 to v7 (`gh-workflow.ts`).
- ☑️ 🔴 `ci-node-step`: a `setup-node` step (`gh-workflow.ts`).
- ✅ 🟡 `ci-node-version`: a recent Node version, currently 26 (`gh-workflow.ts`).
- ☑️ 🟡 `ci-no-main-branch`: no `- main` branch reference (`gh-workflow.ts`).
- ☑️ 🟡 `ci-pnpm-step`: a `pnpm/action-setup` step, when the project uses pnpm (`gh-workflow.ts`).
- ✅ 🟡 `ci-pnpm-version`: the pnpm action pins version 12 (`gh-workflow.ts`).
- ✅ 🔴 `ci-no-frozen-lockfile-flag`: no `--no-frozen-lockfile` flag (`gh-workflow.ts`).
- ☑️ 🟡 `ci-bun-step`: when the project uses Bun, no pnpm left in the workflow and a `oven-sh/setup-bun` step (`gh-workflow.ts`).
- ✅ 🟡 `ci-bun-version`: the setup-bun action is v2 to v9 (`gh-workflow.ts`).
- ✅ 🟡 `ci-runs-check`: the workflow runs `pnpm run check` (`bun run check` for a Bun project). Fix: write `pnpm check` as `pnpm run check`, or add a "Run check" step at the end of the steps when there is none (`workflow-quality.rule.ts`).
- ✅ 🟡 `ci-on-push`: the workflow runs on every push, `on: push`. Fix: `on: pull_request` becomes `on: push`, a list or a block gets `push` added (`workflow-quality.rule.ts`).
- ✅ 🟡 `ci-frozen-lockfile`: every `pnpm install` or `bun install` of the workflow has `--frozen-lockfile`, so the CI installs what the lock file says. Fix: add the flag (`workflow-quality.rule.ts`).
- ✅ 🔵 `ci-node-pnpm-cache`: `actions/setup-node` has `cache: pnpm`, and the `pnpm/action-setup` step comes before it, the cache needs pnpm to be there. Fix: move the pnpm step before the node step, then add the option (`workflow-quality.rule.ts`).
- ✅ 🟡 `ci-playwright-install`: a project that depends on `@playwright/test` installs the browsers in the workflow, `pnpm exec playwright install --with-deps chromium-headless-shell` (`bunx` for Bun). Fix: add the step before the check step (`workflow-quality.rule.ts`).
- ✅ 🔵 `ci-playwright-cache`: the workflow caches `~/.cache/ms-playwright` with `actions/cache@v6`, keyed on the lock file. Fix: add the step before the install step (`workflow-quality.rule.ts`).
- ☑️ 🔴 `travis-language`: `.travis.yml`, when present, declares `language: node_js` (`travis.ts`).
- ☑️ 🔴 `travis-install-task`: `.travis.yml`, when present, runs `npm ci` (`travis.ts`).
- ☑️ 🔴 `travis-ci-task`: `.travis.yml`, when present, runs `npm run ci` (`travis.ts`).

## Website

For projects that are deployed as a website.

- ☑️ 🔴 `deploy-down`: the deployed site (the `webUrl` of `.repo-checker.json`, else the GitHub Pages of the repo) does not respond or answers an error. Skipped when the machine is offline, GitHub itself is asked first. No fix, a site is brought back up by you (`deploy.rule.ts`).
- ✅ 🟡 `index-html-unique-mark`: `index.html` and every `index.html` page under `src` (like `src/web/index.html`) has a `<meta name="unique-mark" content="" />` tag, with its attributes in any order. Fixed by adding it before `</head>` (`index-html.rule.ts`).
- ✅ 🟡 `index-html-lang`: every `index.html` page has a `lang` on its `<html>` tag. Fix: add `lang="en"` (`index-html.rule.ts`).
- ✅ 🟡 `index-html-viewport`: every `index.html` page has a `<meta name="viewport">` tag. Fix: add `width=device-width, initial-scale=1.0` before `</head>` (`index-html.rule.ts`).
- ✅ 🔵 `index-html-icon`: every `index.html` page has a `<link rel="icon">`. Fix: link `public/favicon.svg`, `.ico` or `.png` when one exists, else reported without a fix (`index-html.rule.ts`).
- ✅ 🔵 `index-html-description`: every `index.html` page has a `<meta name="description">`. Fix: copy the `description` of `package.json`, else reported without a fix (`index-html.rule.ts`).
- ✅ 🔵 `index-html-theme-color`: every `index.html` page has a `<meta name="theme-color">` of the `themeColor`. Skipped without a theme color. Fix: add the tag, or replace the color of the existing one (`index-html.rule.ts`).
- ✅ 🔵 `index-html-tile-color`: a `<meta name="msapplication-TileColor">` already written in a page has the `themeColor`, the tag is never added. Skipped without a theme color. Fix: write the color (`index-html.rule.ts`).
- ✅ 🔵 `index-html-mask-icon-color`: a `<link rel="mask-icon">` already written in a page has a `color` of the `themeColor`, the tag is never added. Skipped without a theme color. Fix: write the color (`index-html.rule.ts`).
- ✅ 🔵 `index-html-head-sorted`: the children of the `<head>` of every `index.html` page come in a meaningful order with no blank line between them: `<meta charset>`, `<meta name=\"viewport\">`, `<title>`, other `<meta>`, `<base>`, icon and manifest `<link>`, preconnect and preload `<link>`, stylesheets and `<style>`, `<script>`, then the rest, sorted by text inside each group, a comment staying above its tag. Fix: rewrite the head in that order, one tag per line, indented like the first one. A head holding something other than `meta`, `link`, `base`, `title`, `script`, `style`, `noscript`, `template` or comments is left alone (`index-html.rule.ts`, `html.utils.ts`).
- ✅ 🟡 `website-static-files`: a website should have `_headers`, `favicon.ico` and a web manifest (`manifest.json`, `manifest.webmanifest`, `app.webmanifest` or `site.webmanifest`), at the root of a plain site, in `public` or in `static`. Fixed by creating `_headers` and `manifest.json`, a favicon cannot be invented. From the old README todo list (`website-files.rule.ts`).
- ✅ 🟡 `website-robots-txt`: a website has a `robots.txt` in `public`, `static` or at the root, a misspelled `robot.txt` is not read by crawlers. Fix: create `public/robots.txt` allowing everything (`website-files.rule.ts`).
- ☑️ 🟡 `website-no-robot-txt`: a website has no misspelled `robot.txt`, crawlers read `robots.txt`. No fix, the file and its `_redirects` lines are yours to delete (`website-files.rule.ts`).
- ✅ 🟡 `redirects-spa-fallback`: a Netlify site (`webUrl` on `netlify.app`) with a router (`react-router`, `react-router-dom`, `@tanstack/react-router`, `wouter`, `vue-router`) has `/* /index.html 200` in `_redirects`, else a route opened or reloaded answers 404. Fix: add the line, create `public/_redirects` when there is none (`redirects.rule.ts`).
- ✅ 🟡 `manifest-linked`: `index.html` links the web manifest, `<link rel="manifest">`, when the project has one. Fix: add the link before `</head>` (`manifest.rule.ts`).
- ✅ 🟡 `manifest-required-fields`: every web manifest has `name`, `short_name`, `start_url` and `display`. Fix: add each missing one with a default (the package name, `/`, `standalone`) (`manifest.rule.ts`).
- ✅ 🟡 `manifest-colors`: every web manifest has the `theme_color` of the `themeColor` and a `background_color` of its darker shade, the color of the splash screen. Skipped without a theme color. Fix: write the color that differs (`manifest.rule.ts`).
- ☑️ 🔵 `manifest-icons`: the web manifest has some `icons`, a web app without icons cannot be installed. Fix: with a source image such as `public/logo.svg`, run `pnpm add -D @vite-pwa/assets-generator`, add the script `"pwa:assets": "pwa-assets-generator --preset minimal-2023 public/logo.svg"` (command line flags, because a `pwa-assets.config.ts` needs a default export that oxlint forbids), run it to write `pwa-*.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` and `favicon.ico` in `public`, list the four PNGs in the manifest `icons` (the maskable one with `"purpose": "maskable"`), and link `favicon.ico`, `logo.svg` and the apple touch icon from `index.html`. The generator overwrites `favicon.ico`, and a project that already has icons, for example from favicon.io, only needs them listed in the manifest with absolute paths (`manifest.rule.ts`).
- ☑️ 🔵 `react-strict-mode`: the file that calls `createRoot` mentions `StrictMode`, when the project depends on react. Fix: import `StrictMode` from `react` and wrap the root `<App />` in `<StrictMode>` inside `.render(...)`, then run `pnpm run lint:format:fix` since the wrap changes the line layout (`react-entry.rule.ts`).
- ✅ 🔵 `vite-strict-port`: a `port` set in the `server` or `preview` section of the vite config comes with `strictPort: true`, so vite never moves to another port and apps run together never collide. Fix: add `strictPort: true`, the layout of the file is kept (`vite-config.rule.ts`).
- ☑️ 🔵 `vite-port-scheme`: the vite ports follow the scheme, dev `51NN` and preview `41NN` with the same project number `NN`. Fix: pick the free project number `NN` (grep the other projects' `vite.config.ts`), set preview to `41NN` and dev to `51NN`, and update every other mention of the old dev port (`playwright.config.ts` `baseURL` and `webServer.url`, scripts, README) or the e2e run breaks (`vite-config.rule.ts`).
- ☑️ 🔵 `vite-unique-ports`: no other project of the scan uses the same project number `NN`, each project of a clash gets a finding naming the others. Only a full scan sees the others, a rescan or a watch of one project does not (`vite-ports.rule.ts`).
- ✅ 🔵 `vite-report-compressed-size`: the vite config sets `build.reportCompressedSize: false`, vite does not gzip every file just to print its size. Fix: add the option, in alphabetical place, the layout of the file is kept (`vite-config.rule.ts`).
- ✅ 🔵 `vite-default-export-comment`: the default export of the vite config has the `// oxlint-disable-next-line import/no-default-export` comment above it. Fix: add the comment (`vite-config.rule.ts`).
- ✅ 🟡 `headers-nosniff`: the `_headers` file sets `X-Content-Type-Options: nosniff`. Fix: add it to the `/*` section (`headers.rule.ts`).
- ✅ 🟡 `headers-frame-options`: the `_headers` file sets `X-Frame-Options`, `DENY` or `SAMEORIGIN`. Fix: add `DENY` (`headers.rule.ts`).
- ✅ 🟡 `headers-referrer-policy`: the `_headers` file sets a `Referrer-Policy`. Fix: add `strict-origin-when-cross-origin` (`headers.rule.ts`).
- ☑️ 🔵 `headers-csp`: the `_headers` file sets a `Content-Security-Policy`. No fix, the policy goes with the nonce plugin of the project, like `script-src 'self' 'strict-dynamic' 'nonce-...'; object-src 'none'; base-uri 'self'` (`headers.rule.ts`).
- ✅ 🟡 `headers-sw-no-cache`: when the project uses `vite-plugin-pwa`, the `_headers` file has a `/sw.js` section with `Cache-Control: no-cache`, so a browser never keeps an old service worker. Fix: add the section (`headers.rule.ts`).
- ✅ 🟡 `external-link-rel`: external `<a>` links, in `.html`, `.vue`, `.svelte`, `.astro`, `.jsx` and `.tsx` files, should carry `rel="noopener"` or `rel="noreferrer"`. Fixed by adding `rel="noopener noreferrer"`. From the old README todo list (`website-html.rule.ts`).
- ☑️ 🟡 `media-dimensions`: `<img>` and `<video>` should have `width` and `height`. No fix, the real size is for you to say. From the old README todo list (`website-html.rule.ts`).
- ☑️ 🟡 `build-size`: the build output (`dist`, `build`, `out` or `.output/public`) is no bigger than `maxBuildSizeKo` of `.repo-checker.json`, skipped without it or when the site is not built. No fix, what to remove is for you to say. From the old README todo list (`build-size.rule.ts`).
- ✅ 🔵❔ `lighthouse-budget`: a website should declare a Lighthouse budget, `budget.json` or a `lighthouserc`. Fixed by creating a first `budget.json` to tune. From the old README todo list (`website-files.rule.ts`). A nitpick check.

## Presentation

How the project introduces itself, on GitHub and in the repo.

- ☑️ 🟡 `missing-license`: the repo has no license on GitHub. Skipped for private repos.
- ✅ 🟡 `missing-description`: the repo has no description. Fixed by the "Sync infos" action, which shares the description of the `package.json` with GitHub, and by the file fixes of the page (the project one, or the Fix button of the finding), which copy the description of the `package.json` to GitHub, after showing it in the dialog. git cannot undo that one, and the command line `--fix` never does it.
- ☑️ 🔵 `missing-topics`: the repo has no topics. Skipped for private repos.
- ✅ 🔵 `missing-homepage`: the repo has no homepage on GitHub, which is the url of the deployed website (`webUrl` of `.repo-checker.json`), not the source code. Fixed by the "Sync infos" action. Skipped for private repos.
- ✅ 🔴 `license-file-exists`: a `LICENSE` file exists. Skipped for private repos (`license.ts`).
- ☑️ 🔴 `license-file-content`: the `LICENSE` file matches the declared license: GPL-3.0 has the "GNU GENERAL PUBLIC LICENSE" title and the "Version 3, 29 June 2007" subtitle, MIT has the "MIT License" title (`license.ts`).
- ✅ 🟡 `license-copyright-holder`: the copyright holder of an MIT `LICENSE` is the git user, the years are kept. Skipped without a git user. Fix: write the name (`license.rule.ts`).
- ✅ 🔴 `package-license`: a `license` property, with the expected license value (`package.file.ts`).
- ✅ 🔴 `package-author`: an `author` property (`package.file.ts`).
- ✅ 🟡 `package-description`: a `description` property (`package.file.ts`).
- ✅ 🟡 `package-homepage`: a `homepage` property, filled with the url of the GitHub repo (`package.file.ts`). In a `package.json` the homepage is the one of the source code, never the url of the deployed website, that one is the `webUrl` of `.repo-checker.json` and the homepage of the repo on GitHub.
- ✅ 🟡 `package-bugs`: a `bugs` property (`package.file.ts`).
- ✅ 🟡 `package-keywords`: a `keywords` property, filled with the topics of the GitHub repo when it has some (`package.file.ts`).
- ✅ 🟡 `package-repository`: a `repository` property. When the git origin is known it must be `{ "type": "git", "url": "git+https://github.com/<owner>/<name>.git" }` (a shorthand or another repo is fixed), otherwise its url must start with `git+https` (`package-presentation.rule.ts`).
- ✅ 🟡 `package-author-value`: `author` is the git user, `Name <mail>`, when there is one. Fix: write it (`package-values.rule.ts`).
- ✅ 🟡 `package-homepage-value`: `homepage` is the url of the GitHub repo, derived from the git origin, without a `#readme` suffix and never the deployed website. Fix: write it (`package-values.rule.ts`).
- ✅ 🟡 `package-bugs-value`: `bugs` is `<repo url>/issues`, derived from the git origin. Fix: write it (`package-values.rule.ts`).
- ✅ 🔴 `readme-exists`: a `README.md` or `readme.md` file exists (`readme.ts`).
- ☑️ 🔴 `readme-title`: the README starts with a title (`readme.ts`).
- ☑️ 🟡 `readme-logo`: a `![logo](...)` image. Skipped for private repos (`readme.ts`).
- ☑️ 🟡 `readme-demo`: a `![demo](...)` image or gif. Skipped for private repos (`readme.ts`).
- ☑️ 🔴 `readme-no-netlify-com`: no link to the deprecated `*.netlify.com` (`readme.ts`).
- ☑️ 🔴 `readme-links-https`: no link without an `https` scheme (`readme.ts`).
- ✅ 🔴 `readme-no-crlf`: no Windows CRLF line endings, use Unix LF (`readme.ts`).
- ✅ 🟡 `readme-dash-lists`: no star-flavored lists, use dashes (`readme.ts`).
- ✅ 🟡 `readme-no-todo-section`: no `## Todo` section in the README (`## Todos` and `## To do` too), the todos live in `TODOS.md`. Fix: remove the section from the README and add its lines to `TODOS.md`, created with a `# TODOS` title when it does not exist, skipping the lines it has already. A section that only points to `TODOS.md` is already moved and left alone (`readme.rule.ts`).
- ☑️ 🔵❔ `readme-todos`: unchecked `- [ ]` items are printed as TODO lines in the output. Informational (`readme.rule.ts`). A nitpick check.
- ✅ 🟡 `readme-badges`: the recommended badges are present: project license (not for a private repo), "Website up" when the project is published as a website, and npm monthly downloads, npm version, publish size and install size when it is a published package (`readme.ts`).
- ✅ 🔴 `readme-no-deprecated-badges`: no badge from `bettercodehub.com`, `david-dm.org`, `lgtm.com`, `scrutinizer-ci.com` or `libraries.io` (`readme.ts`).
- ✅ 🟡 `readme-thanks-section`: a `## Thanks` section (`readme.ts`).
- ✅ 🟡 `readme-thanks-entries`: a thanks line for every tool the project uses, and no thanks line for a tool it no longer uses. Always: Shields.io, Github. When mentioned in the README: Travis-ci.com, Netlify, AppWrite, Boxy Svg and Svg Omg (when the README uses svg). From `package.json` or project data: Arg, Ava, Biome, Bun, C8, Chokidar, Cypress.io, Dependency-cruiser, Esbuild, Eslint, Knip, Mocha, Npm-parallel, Npm-run-all, Nuxt, Nyc, Oxc, Preact, React, Reef, Repo-checker, Rollup, Servor, Showdown, Shuutils, TailwindCss, Tsup, UvU, V8, Vite, Vitest, Vue, Watchlist, Xo, Zod (`readme.ts`).
- ✅ 🟡 `readme-views-counter`: a page views counter badge, served by hits.sh, placed with the other badges under the title (`readme.ts`).

## GitHub health

Activity on GitHub and the life cycle of the repo.

- ☑️ 🔵 `open-pull-requests`: open pull requests waiting, Renovate's included, except the one that comes from the branch checked out in the clone (your work in progress). Skipped when another branch than the default one is checked out.
- ☑️ 🔵 `open-issues`: open issues.
- ✅ 🔵 `archive-candidate`: a cloned repo with no commit from you (bots excluded) for 12 months, whatever its stars or website, and no Renovate pull request open. Fix: archive the repo (`archive.rule.ts`).
- ✅ 🔵 `renovate-only-zombie`: a repo with Renovate pull requests open and no commit from you for 6 months, it is only kept alive by the bot. Fix: archive the repo, which also stops the bot noise (`archive.rule.ts`).
- ✅ 🔵 `stale-uncloned-repo`: a repo with no clone and no commit from you for 12 months, that would show up as `not-cloned`. Fix: archive it instead of cloning it, `not-cloned` leaves such a repo alone (`archive.rule.ts`).
- ✅ 🔵 `repo-delete-branch-on-merge`: the repo deletes the branch of a pull request once it is merged. Needs the admin rights on the repo to read the setting, one more GitHub call per live own repo. Fix: the "Fix the GitHub settings" action, which sets `delete_branch_on_merge` after a confirmation (`repo-settings.rule.ts`).
- ✅ 🔵 `repo-no-merge-commit`: the repo does not accept merge commits, squash or rebase remain, a repo that can only merge with a merge commit is left alone. Fix: the "Fix the GitHub settings" action sets `allow_merge_commit` to false (`repo-settings.rule.ts`).
- ✅ 🔵 `repo-secret-scanning`: a public repo has the secret scanning and its push protection on, both are free for a public repo. Fix: the "Fix the GitHub settings" action turns them on. Private repos are skipped (`repo-settings.rule.ts`).
