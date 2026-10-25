# Checks

Every check `repo-checker` handles or is meant to handle. This file is the single source of truth for checks: the ids below are the ids used in the code and tests. The exact behavior and safety rules of the Sync checks are in [features.md](features.md), work that is not a check is in [../TODOS.md](../TODOS.md). Each level 2 title is a group, the list below it holds the checks attached to that group.

Format: an emoji for the status, an emoji for the severity, then `` `check-id` ``, then what it detects.

- ✅ built: a check of the new engine. Many come from the old tool, the file in parentheses says which.
- 📋 todo: wanted, not built yet. The file in parentheses of a ✅ check is where it lived in the old code (`src/files/`, removed, see git history).

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
- ✅ 🟡 `broken-clone`: a local folder that is not a git repo, has no `origin`, or whose `origin` returns 404 on GitHub. Reported with the reason and the path, no fix.
- ✅ 🔴 `archived-with-unsaved-work`: the repo is archived on GitHub and its clone holds unpushed commits, uncommitted files, a stash or local-only branches. Fixes: unarchive, push, re-archive; or discard.
- ✅ 🔵 `archived-clone`: the repo is archived on GitHub and its clone is provably safe to delete. Fix: delete the clone.
- ✅ 🔵 `pristine-fork`: a fork where every branch has zero commits ahead of its parent, there is no open PR, and any local clone is clean. Fix: delete the fork repo and its local clone. Forks that cannot be verified are listed and never offered.

## Git hygiene

State of each clone and of its git history.

- ✅ 🟡 `behind-remote`: the clone is behind its remote and needs a pull. Needs a `git fetch`.
- ✅ 🟡 `uncommitted-files`: uncommitted or untracked files.
- ✅ 🟡 `unpushed-commits`: commits that are not on the remote.
- ✅ 🔵 `forgotten-stash`: a stash that was never reapplied or dropped.
- ✅ 🔵 `branch-without-upstream`: a local branch with no upstream.
- ✅ 🔵 `not-on-default-branch`: the clone is checked out on another branch than the default one, it offers to check the default branch out.
- ✅ 🔵 `stale-local-branch`: a local branch that is already merged into the default branch, or untouched for 6 months and not merged. The git fix deletes the merged ones, with the others it deletes after confirmation, the untouched ones are left to you (`stale.rule.ts`).
- ✅ 🔵 `stale-remote-branch`: the same, for the branches on GitHub as the last fetch saw them, the branches of Renovate and Dependabot wait for their pull request. No fix, deleting a branch on GitHub is `git push origin --delete` and is not offered yet (`stale.rule.ts`).
- ✅ 🔵 `stale-last-tag`: the last git tag is 12 months old or more and commits came since, suggest tagging a release. No fix, a release is for you to cut. From the old README todo list (`stale.rule.ts`). A nitpick check.
- ✅ 🟡 `avoid-main-branch`: avoid the `main` branch name, use `master` (`git.ts`).
- ✅ 🔴 `gitignore-exists`: a `.gitignore` file exists (`git.ts`).
- ✅ 🟡 `gitignore-node-modules`: `.gitignore` lists `node_modules` (`git.ts`).
- ✅ 🟡 `gitignore-keeps-pnpm-lock`: `.gitignore` does not exclude `pnpm-lock.yaml` (`git.ts`).

## Dependencies

What the project depends on, and how current and safe that is.

- ✅ 🟡 `outdated-major-dependency`: the version a dependency declares is a major update behind the latest on the npm registry, one finding per dependency. No fix, a major update can break the code and is left to you and to Renovate (`registry.rule.ts`).
- ✅ 🔵 `outdated-minor-dependency`: the version a dependency declares is a patch or a minor update behind the latest on the npm registry, one finding per dependency. Fixed by bumping it, keeping the range prefix (`registry.rule.ts`). A nitpick check.
- ✅ 🟡 `deprecated-dependency`: a dependency whose latest version is marked deprecated on the npm registry. No fix, what replaces it is for you to say (`registry.rule.ts`).
- ✅ 🔴 `security-advisory`: the declared version of a dependency has a known vulnerability, from the advisory endpoint of the npm registry, asked once per project with the declared versions (the lowest version of a range, so `~` and exact versions are exact). No fix, `outdated-minor-dependency` fixes most of them (`registry.rule.ts`).
- ✅ 🟡 `open-renovate-pr`: a Renovate pull request waiting to be merged.
- ✅ 🔴 `no-sass-dependency`: no `sass` dependency, it is fat and useless. Only when the project data says to avoid it (`package.file.ts`).
- ✅ 🔴 `no-cross-var-dependency`: no `cross-var` dependency, it is old and deprecated (`package.file.ts`).
- ✅ 🔴 `no-tslint-dependency`: no `tslint` dependency, it is deprecated (`package.file.ts`).
- ✅ 🔴 `no-eslint-plugin-promise-5`: no `eslint-plugin-promise` 5, it requires eslint 7 (`package.file.ts`).
- ✅ 🟡 `no-fat-color-dependency`: no `chalk`, `colorette` or `colors`, use shuutils or nanocolors (`package.file.ts`).
- ✅ 🟡 `no-fs-extra-dependency`: no `fs-extra`, use native fs (`package.file.ts`).
- ✅ 🟡 `no-shuunen-stack-dependency`: no `shuunen-stack` dependency (`package.file.ts`).
- ✅ 🟡 `no-jsdom-dependency`: no `jsdom`, use happy-dom instead (`package.file.ts`).
- ✅ 🟡 `no-npm-run-all-dependency`: no `npm-run-all`, chain tasks with `&&` or use `npm-parallel` (`package.file.ts`).
- ✅ 🟡 `esbuild-plugin-run-alternative`: when `esbuild-plugin-run` is used, suggest `typescript-run` (`ts-run src --watch`) (`package.file.ts`).
- ✅ 🟡 `latest-repo-check-version`: the `repo-check` dependency matches the latest major.minor. Skipped in repo-checker itself (`package.file.ts`).
- ✅ 🟡 `renovate-config-exists`: a `renovate.json` file exists (`renovate.ts`).
- ✅ 🟡 `renovate-schema`: `renovate.json` declares the Renovate `$schema` (`renovate.ts`).
- ✅ 🔴 `renovate-extends`: `renovate.json` has an `extends` section (`renovate.ts`).
- ✅ 🔴 `renovate-no-config-base`: no deprecated `config:base`, use `config:semverAllMonthly` (`renovate.ts`).
- ✅ 🔴 `renovate-dashboard-off`: `dependencyDashboard` is set to false (`renovate.ts`).
- ✅ 🔴 `renovate-automerge`: the `:automergeAll` preset is used, when the project data allows auto-merge (`renovate.ts`).

## Runtime and package manager

Which Node and which package manager the project uses, and how that is pinned.

- ✅ 🔴 `nvmrc-exists`: a `.nvmrc` file exists (`nvmrc.ts`).
- ✅ 🟡 `nvmrc-recent-node`: `.nvmrc` pins a recent LTS Node version (currently 24.x) (`nvmrc.ts`).
- ✅ 🟡 `npmrc-exists`: an `.npmrc` file exists, unless `packageManager` pins pnpm 12 or above (`npmrc.file.ts`).
- ✅ 🟡 `npmrc-pre-post-scripts`: `.npmrc` has `enable-pre-post-scripts=true`, when the project uses task prefixes (`npmrc.file.ts`).
- ✅ 🟡 `outdated-package-manager`: the `packageManager` pins a `pnpm`, `npm` or `bun` version that is a major behind the latest on the npm registry, patch and minor updates are not reported. Fixed by pinning the latest (`package-manager.rule.ts`).
- ✅ 🔴 `multiple-lockfiles`: more than one package manager left a lockfile in the project, `bun.lock` and `bun.lockb` count as one. No fix, which one to keep is for you to say (`lockfiles.rule.ts`).
- ✅ 🟡 `old-lockfile-format`: a lockfile in an obsolete format, `bun.lockb` or `shrinkwrap.yaml`. No fix, a lockfile is only regenerated by its package manager (`lockfiles.rule.ts`).

## Package

Content of `package.json`, apart from scripts and publishing.

- ✅ 🔴 `package-json-exists`: a `package.json` file exists (`package.file.ts`).
- ✅ 🟡 `package-schema`: `package.json` declares the schemastore `$schema` (`package.file.ts`).
- ✅ 🔴 `package-name`: a `name` property (`package.file.ts`).
- ✅ 🔴 `package-version`: a `version` property (`package.file.ts`).
- ✅ 🟡 `package-private`: a `private` property (`package.file.ts`).
- ✅ 🟡 `package-files`: a `files` property (`package.file.ts`).
- ✅ 🔵 `package-dependencies-sections`: the `dependencies` and `devDependencies` sections that the other dependency checks rely on. The old tool only used it to skip those checks and never reported it (`package.file.ts`).

## Scripts

The `scripts` section of `package.json`.

- ✅ 🔴 `scripts-section`: a `scripts` section exists (`package.file.ts`).
- ✅ 🟡 `scripts-check`: a `check` script, like `pnpm build && pnpm lint ...` (`package.file.ts`).
- ✅ 🟡 `scripts-no-ci`: no `ci` script, use `check` instead (`package.file.ts`).
- ✅ 🔴 `scripts-typescript-check`: a `tsc` build or check, when the project uses TypeScript (`package.file.ts`).
- ✅ 🟡 `scripts-preversion`: a `preversion` script for version automation, like `pnpm check` (`package.file.ts`).
- ✅ 🟡 `scripts-postversion`: a `postversion` script, like `git push && git push --tags`, plus `npm publish` for a published package (`package.file.ts`).
- ✅ 🔴 `scripts-no-prepublish`: `prepare` instead of the deprecated `prepublish` (`package.file.ts`).
- ✅ 🟡 `scripts-final-echo`: tasks `build`, `check`, `lint` and `test` end with `&& echo <task> success` (`package.file.ts`).
- ✅ 🟡 `scripts-no-npm-run`: use `pnpm` or `bun` instead of `npm run`, which is faster, and drop the `--` before flags with pnpm (`package.file.ts`).
- ✅ 🟡 `scripts-no-npm-test`: no `npm test`, use `pnpm test` or `bun test` (`package.file.ts`).
- ✅ 🟡 `scripts-watchlist-eager`: a `watchlist` task uses the `-eager --` parameter (`package.file.ts`).
- ✅ 🔴 `scripts-depcruise`: a `depcruise` usage, when the project uses dependency-cruiser (`package.file.ts`).
- ✅ 🟡 `scripts-unique-mark`: a `unique-mark` task when there is a `build` task and the project uses shuutils, unless a vite or tsdown config already uses the unique-mark plugin (`package.file.ts`).
- ✅ 🟡 `scripts-eslint-cache`: eslint runs with `--cache` (`package.file.ts`).
- ✅ 🟡 `scripts-no-eslint-ignore-path`: eslint runs without `--ignore-path`, so the CLI and VS Code use the same config (`package.file.ts`).
- ✅ 🟡 `scripts-ts-node-transpile-only`: any `ts-node` call in the project uses `--transpileOnly` (`package.file.ts`).
- ✅ 🔴 `scripts-bun-no-misleading-test`: with Bun, no `bun test` inside the `check` task, use `bun run test` (`package.file.ts`).
- ✅ 🔴 `scripts-bun-no-misleading-build`: with Bun, no `bun build` inside the `check` or `postversion` tasks, use `bun run build` (`package.file.ts`).
- ✅ 🔴 `scripts-bun-install`: with Bun, no `bun i`, use `bun install` (`package.file.ts`).

## Publishing

For projects published as a package. The entry point checks (`types`, `main`, `module`, `exports`) skip a CLI that only publishes a `bin`.

- ✅ 🟡 `publish-type-module`: a `"type": "module"` declaration (`package.file.ts`).
- ✅ 🔴 `publish-types-field`: a `types` field, when the package is not a CLI and uses TypeScript (`package.file.ts`).
- ✅ 🔴 `publish-main-field`: a `main` field pointing to a `.js` file (ESM project) or a `.cjs` file (CommonJS project) (`package.file.ts`).
- ✅ 🔴 `publish-module-field`: ESM project, no `module` field (`package.file.ts`).
- ✅ 🟡 `publish-cjs-module-field`: CommonJS project, a `module` field pointing to a `.mjs` file (`package.file.ts`).
- ✅ 🔴 `publish-exports-field`: ESM project, an `exports` field mapping `import` to a `.js` build and `require` to a `.cjs` build (`package.file.ts`).
- ✅ 🟡 `publish-cjs-exports-field`: CommonJS project, an `exports` field mapping `import` to an `.mjs` build and `require` to a `.cjs` build (`package.file.ts`).
- ✅ 🟡 `publish-max-size-declared`: the maximum size of the main file is set in the data file (for example `maxSizeKo: 100`) (`package.file.ts`).
- ✅ 🔴 `publish-main-file-exists`: the file named in `main` exists on disk, so build before checking (`package.file.ts`).
- ✅ 🔴 `publish-main-file-size`: the main file is no bigger than the declared maximum size (`package.file.ts`).

## Code tooling

Linting, formatting, typing and architecture config files.

- ✅ 🟡 `repo-checker-config`: the tool's own `.repo-checker.json` exists. The old tool also migrated `.repo-checker.js` and `repo-checker.config.js` into it, the new one does not (`repo-checker.ts`).
- ✅ 🔴 `editorconfig-exists`: an `.editorconfig` file exists (`editor-config.ts`).
- ✅ 🔴 `editorconfig-indent`: `indent_style = space` and `indent_size = 2` (`editor-config.ts`).
- ✅ 🔴 `editorconfig-line-endings`: `end_of_line = lf` (`editor-config.ts`).
- ✅ 🔴 `editorconfig-charset`: `charset = utf-8` (`editor-config.ts`).
- ✅ 🟡 `editorconfig-trim-whitespace`: `trim_trailing_whitespace = true` (`editor-config.ts`).
- ✅ 🟡 `editorconfig-final-newline`: `insert_final_newline = true` (`editor-config.ts`).
- ✅ 🟡 `editorconfig-no-html-indent`: no specific `[*.html]` indent rule (`editor-config.ts`).
- ✅ 🔴 `eslint-config-exists`: an ESLint flat config exists (`eslint.config.js`, `.mjs`, `.cjs`, `.ts` or `.mts`), when the project uses ESLint (`eslint.file.ts`).
- ✅ 🟡 `eslint-no-deprecated-config`: no `.eslintrc.json` or `.eslintrc.js`, use the flat config (`eslint.file.ts`).
- ✅ 🔴 `eslint-no-xo-config`: no `xo.config.js` (`eslint.file.ts`).
- ✅ 🔴 `eslint-dependency`: an `eslint` dependency, and not version 8 (`package.file.ts`).
- ✅ 🔴 `eslint-browser-config`: the ESLint config references a browser environment when the project uses Tailwind (`eslint.file.ts`).
- ✅ 🔴 `biome-config-exists`: a `biome.json` file exists, when the project uses Biome (`biome.file.ts`).
- ✅ 🟡 `biome-schema`: `$schema` points to `./node_modules/@biomejs/biome/configuration_schema.json` (`biome.file.ts`).
- ✅ 🟡 `biome-sections`: the sections `formatter`, `javascript`, `json`, `linter`, `assist`, `vcs` and `overrides` exist (`biome.file.ts`).
- ✅ 🟡 `biome-formatter`: `indentStyle` is `space`, `indentWidth` is 2, `lineEnding` is `lf`, `lineWidth` is above 80 (`biome.file.ts`).
- ✅ 🟡 `biome-javascript-formatter`: `arrowParentheses` is `asNeeded`, `bracketSpacing` is true, `quoteStyle` is `single`, `semicolons` is `asNeeded` (`biome.file.ts`).
- ✅ 🟡 `biome-json-parser`: `allowComments` and `allowTrailingCommas` are false (`biome.file.ts`).
- ✅ 🟡 `biome-linter`: `enabled` and `rules.recommended` are true, `rules.style.useBlockStatements` is `off`, domains `project` and `test` are `all`, and domain `react` is `all` when the project uses React (`biome.file.ts`).
- ✅ 🟡 `biome-assist`: `assist.actions.source.organizeImports` is `on` (`biome.file.ts`).
- ✅ 🟡 `biome-vcs`: `vcs.enabled` is true, `clientKind` is `git`, `useIgnoreFile` is true (`biome.file.ts`).
- ✅ 🟡 `biome-test-override`: an override for `**/*.test.ts` that turns `noUnusedTemplateLiteral` off (`biome.file.ts`).
- ✅ 🟡 `tsconfig-schema`: `tsconfig.json` declares the schemastore `$schema`, when the project uses TypeScript (`ts-config.ts`).
- ✅ 🟡 `tsconfig-include`: an `include` section (`ts-config.ts`).
- ✅ 🟡 `tsconfig-compiler-options`: the recommended options are set: `allowUnreachableCode` false, `allowUnusedLabels` false, `checkJs`, `esModuleInterop`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`, `noImplicitAny`, `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` false, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `skipLibCheck`, `strict`, `verbatimModuleSyntax`. When the config extends `tsconfig/strictest`, only `verbatimModuleSyntax`. Skipped when the config uses `references` (`ts-config.ts`).
- ✅ 🟡 `tsconfig-out-dir`: an `outDir` compiler option (`ts-config.ts`).
- ✅ 🟡 `tsconfig-module-resolution`: a `moduleResolution` compiler option (`ts-config.ts`).
- ✅ 🟡 `tsconfig-lib`: a non-empty `lib` compiler option (`ts-config.ts`).
- ✅ 🔴 `tsconfig-no-wildcard-files`: no wildcard in the `files` section (`ts-config.ts`).
- ✅ 🟡 `tsconfig-no-useless-glob`: no `my-folder/**/*` in `include`, `my-folder` is enough (`ts-config.ts`).
- ✅ 🟡 `dependency-tool-choice`: use knip or dependency-cruiser. Skipped when the project uses knip or has no package.json (`dependency-cruiser.ts`).
- ✅ 🔴 `dependency-cruiser-config`: a `.dependency-cruiser.js` or `.dependency-cruiser.cjs` file exists, when the project uses dependency-cruiser (`dependency-cruiser.ts`).
- ✅ 🔴 `tailwind-content`: the Tailwind config (`.js`, `.ts`, `.mjs` or `.cjs`) has a `content` option, like `content: ['./src/**/*.{vue,js,ts,jsx,tsx}']`, when the project uses Tailwind (`tailwind.ts`).

## Testing

- ✅ 🟡 `unit-testing-dependency`: one unit testing tool among vitest, mocha, uvu, or `bun test` (`package.file.ts`).
- ✅ 🟡 `coverage-dependency`: one coverage tool among nyc, c8, `@vitest/coverage-v8`, `@vitest/coverage-c8`, or `bun test --coverage` (`package.file.ts`).
- ✅ 🟡 `vitest-pool-threads`: the vitest config (`.mts`, `.js`, `.ts` or `.mjs`) sets `pool: 'threads'`, when the project uses vitest (`vitest.ts`).
- ✅ 🔴 `nycrc-exists`: a `.nycrc` or `.nycrc.json` file exists, when the project uses nyc (`nycrc.ts`).
- ✅ 🟡 `nycrc-schema`: the nyc config declares the schemastore `$schema` (`nycrc.ts`).
- ✅ 🔴 `uvu-assert`: with uvu, tests import `equal` from `uvu/assert` and not from `assert` (`package.file.ts`).

## CI

- ✅ 🔴 `ci-failing`: the last finished GitHub Actions run of the default branch failed, one GitHub call per live own repo. No fix, re-running or repairing a build is for you to do (`ci.rule.ts`).
- ✅ 🔴 `ci-checkout-step`: `.github/workflows/ci.yml` has a checkout step (`gh-workflow.ts`).
- ✅ 🔴 `ci-checkout-version`: the checkout action is a recent version, v5 to v7 (`gh-workflow.ts`).
- ✅ 🔴 `ci-node-step`: a `setup-node` step (`gh-workflow.ts`).
- ✅ 🟡 `ci-node-version`: a recent Node version, currently 24 (`gh-workflow.ts`).
- ✅ 🟡 `ci-no-main-branch`: no `- main` branch reference (`gh-workflow.ts`).
- ✅ 🟡 `ci-pnpm-step`: a `pnpm/action-setup` step, when the project uses pnpm (`gh-workflow.ts`).
- ✅ 🟡 `ci-pnpm-version`: the pnpm action pins version 12 (`gh-workflow.ts`).
- ✅ 🔴 `ci-no-frozen-lockfile-flag`: no `--no-frozen-lockfile` flag (`gh-workflow.ts`).
- ✅ 🟡 `ci-bun-step`: when the project uses Bun, no pnpm left in the workflow and a `oven-sh/setup-bun` step (`gh-workflow.ts`).
- ✅ 🟡 `ci-bun-version`: the setup-bun action is v2 to v9 (`gh-workflow.ts`).
- ✅ 🔴 `travis-language`: `.travis.yml`, when present, declares `language: node_js` (`travis.ts`).
- ✅ 🔴 `travis-install-task`: `.travis.yml`, when present, runs `npm ci` (`travis.ts`).
- ✅ 🔴 `travis-ci-task`: `.travis.yml`, when present, runs `npm run ci` (`travis.ts`).

## Website

For projects that are deployed as a website.

- ✅ 🔴 `deploy-down`: the deployed site (the `webUrl` of `.repo-checker.json`, else the GitHub Pages of the repo) does not respond or answers an error. Skipped when the machine is offline, GitHub itself is asked first. No fix, a site is brought back up by you (`deploy.rule.ts`).
- ✅ 🟡 `index-html-unique-mark`: `index.html` or `src/index.html` has a `<meta name="unique-mark" content="" />` tag, with its attributes in any order. Fixed by adding it before `</head>` (`index-html.rule.ts`).
- ✅ 🟡 `website-static-files`: a website should have `_headers`, `favicon.ico` and a web manifest (`manifest.json`, `manifest.webmanifest`, `app.webmanifest` or `site.webmanifest`), at the root of a plain site, in `public` or in `static`. Fixed by creating `_headers` and `manifest.json`, a favicon cannot be invented. From the old README todo list (`website-files.rule.ts`).
- ✅ 🟡 `external-link-rel`: external `<a>` links, in `.html`, `.vue`, `.svelte`, `.astro`, `.jsx` and `.tsx` files, should carry `rel="noopener"` or `rel="noreferrer"`. Fixed by adding `rel="noopener noreferrer"`. From the old README todo list (`website-html.rule.ts`).
- ✅ 🟡 `media-dimensions`: `<img>` and `<video>` should have `width` and `height`. No fix, the real size is for you to say. From the old README todo list (`website-html.rule.ts`).
- ✅ 🟡 `build-size`: the build output (`dist`, `build`, `out` or `.output/public`) is no bigger than `maxBuildSizeKo` of `.repo-checker.json`, skipped without it or when the site is not built. No fix, what to remove is for you to say. From the old README todo list (`build-size.rule.ts`).
- ✅ 🔵 `lighthouse-budget`: a website should declare a Lighthouse budget, `budget.json` or a `lighthouserc`. Fixed by creating a first `budget.json` to tune. From the old README todo list (`website-files.rule.ts`). A nitpick check.

## Presentation

How the project introduces itself, on GitHub and in the repo.

- ✅ 🟡 `missing-license`: the repo has no license on GitHub. Skipped for private repos.
- ✅ 🟡 `missing-description`: the repo has no description. Fixed by the "Sync infos" action, which shares the description of the `package.json` with GitHub.
- ✅ 🔵 `missing-topics`: the repo has no topics. Skipped for private repos.
- ✅ 🔵 `missing-homepage`: the repo has no homepage on GitHub, which is the url of the deployed website (`webUrl` of `.repo-checker.json`), not the source code. Fixed by the "Sync infos" action. Skipped for private repos.
- ✅ 🔴 `license-file-exists`: a `LICENSE` file exists. Skipped for private repos (`license.ts`).
- ✅ 🔴 `license-file-content`: the `LICENSE` file matches the declared license: GPL-3.0 has the "GNU GENERAL PUBLIC LICENSE" title and the "Version 3, 29 June 2007" subtitle, MIT has the "MIT License" title (`license.ts`).
- ✅ 🔴 `package-license`: a `license` property, with the expected license value (`package.file.ts`).
- ✅ 🔴 `package-author`: an `author` property (`package.file.ts`).
- ✅ 🟡 `package-description`: a `description` property (`package.file.ts`).
- ✅ 🟡 `package-homepage`: a `homepage` property, filled with the url of the GitHub repo (`package.file.ts`). In a `package.json` the homepage is the one of the source code, never the url of the deployed website, that one is the `webUrl` of `.repo-checker.json` and the homepage of the repo on GitHub.
- ✅ 🟡 `package-bugs`: a `bugs` property (`package.file.ts`).
- ✅ 🟡 `package-keywords`: a `keywords` property, filled with the topics of the GitHub repo when it has some (`package.file.ts`).
- ✅ 🟡 `package-repository`: a `repository` property, whose url starts with `git+https` (`package.file.ts`).
- ✅ 🔴 `readme-exists`: a `README.md` or `readme.md` file exists (`readme.ts`).
- ✅ 🔴 `readme-title`: the README starts with a title (`readme.ts`).
- ✅ 🟡 `readme-logo`: a `![logo](...)` image. Skipped for private repos (`readme.ts`).
- ✅ 🟡 `readme-demo`: a `![demo](...)` image or gif. Skipped for private repos (`readme.ts`).
- ✅ 🔴 `readme-no-netlify-com`: no link to the deprecated `*.netlify.com` (`readme.ts`).
- ✅ 🔴 `readme-links-https`: no link without an `https` scheme (`readme.ts`).
- ✅ 🔴 `readme-no-crlf`: no Windows CRLF line endings, use Unix LF (`readme.ts`).
- ✅ 🟡 `readme-dash-lists`: no star-flavored lists, use dashes (`readme.ts`).
- ✅ 🔵 `readme-todos`: unchecked `- [ ]` items are printed as TODO lines in the output. Informational (`readme.rule.ts`). A nitpick check.
- ✅ 🟡 `readme-badges`: the recommended badges are present: project license (not for a private repo), "Website up" when the project is published as a website, and npm monthly downloads, npm version, publish size and install size when it is a published package (`readme.ts`).
- ✅ 🔴 `readme-no-deprecated-badges`: no badge from `bettercodehub.com`, `david-dm.org`, `lgtm.com`, `scrutinizer-ci.com` or `libraries.io` (`readme.ts`).
- ✅ 🟡 `readme-thanks-section`: a `## Thanks` section (`readme.ts`).
- ✅ 🟡 `readme-thanks-entries`: a thanks line for every tool the project uses, and no thanks line for a tool it no longer uses. Always: Shields.io, Github. When mentioned in the README: Travis-ci.com, Netlify, AppWrite, Boxy Svg and Svg Omg (when the README uses svg). From `package.json` or project data: Arg, Ava, Biome, Bun, C8, Chokidar, Cypress.io, Dependency-cruiser, Esbuild, Eslint, Knip, Mocha, Npm-parallel, Npm-run-all, Nuxt, Nyc, Oxc, Preact, React, Reef, Repo-checker, Rollup, Servor, Showdown, Shuutils, TailwindCss, Tsup, UvU, V8, Vite, Vitest, Vue, Watchlist, Xo, Zod (`readme.ts`).
- ✅ 🟡 `readme-views-counter`: a page views counter badge, served by hits.sh, placed with the other badges under the title (`readme.ts`).

## GitHub health

Activity on GitHub and the life cycle of the repo.

- ✅ 🔵 `open-pull-requests`: pull requests waiting for review.
- ✅ 🔵 `open-issues`: open issues.
- ✅ 🔵 `archive-candidate`: a cloned repo with no commit from you (bots excluded) for 12 months, no star, no homepage, no GitHub Pages, and no Renovate pull request open. Fix: archive the repo (`archive.rule.ts`).
- ✅ 🔵 `renovate-only-zombie`: a repo with Renovate pull requests open and no commit from you for 6 months, it is only kept alive by the bot. Fix: archive the repo, which also stops the bot noise (`archive.rule.ts`).
- ✅ 🔵 `stale-uncloned-repo`: a repo with no clone and no commit from you for 12 months, that would show up as `not-cloned`. Fix: archive it instead of cloning it, `not-cloned` leaves such a repo alone (`archive.rule.ts`).

## Behaviors of the old tool that are not checks

Kept here so they are not forgotten when the file checks are ported.

- `--fix` repairs what it can, `--force` overwrites a file that has issues, `--init` creates the data file, `--quiet` only writes to the log file, `--fail-stop` stops at the first failing folder.
- A missing file can be created from a template in `templates/` (README, LICENSE, `package.json`, `renovate.json`, Tailwind config).
- The project data file `.repo-checker.json` holds per-project choices: license, `maxSizeKo`, web URL, task prefix, auto-merge, whether to avoid Sass, and which tools the project uses (Bun, Biome, ESLint, nyc, Oxc, Tailwind, TypeScript, Vitest, React, Preact, Vue, knip, dependency-cruiser, shuutils).
