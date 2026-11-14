# Scripts and turbo

The agreed shape of `package.json` scripts and `turbo.json` for every project (decided from `PATTERNS.md` sections 3 and 4). The checks below enforce it.

## Mandatory scripts

`check`, `lint`, `lint:format`, `lint:format:fix`, `lint:issues`, `lint:issues:fix`, `lint:types`, `lint:install`, `lint:knip`, `lint:repo`, `test`, `test:unit`, `test:watch`, `test:update`, `up:deps`.

Conditional:

- `test:ui` (`vitest --ui`) when Vitest is used. It is not an e2e task.
- `test:e2e` (`playwright test`) when `@playwright/test` is a dependency.
- `build`, `dev`, `preview` for a Vite web app (Vite and an `index.html`). `build:tsc` and `build:vite` are not enforced.

- `build` does not run a build tool itself: it is `turbo run <build:* tasks>`, with one `build:*` task per tool (`build:tsc` for `tsc`, `build:vite` for `vite build`, `build:tsdown` for `tsdown`). The `build:*` tasks themselves are not required, but this is the shape when there is a build.

- No leftover script runs `tsc --noEmit`, `oxlint` or `oxfmt` besides the agreed lint tasks: the old `lint:tsc`, `lint:oxlint`, `format` are deleted, with the calls to them.

## Canonical commands

The command of a task is what comes before the first `&& echo`.

| Task              | Command                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lint:format`     | `oxfmt --check`                                                                                                       |
| `lint:format:fix` | `oxfmt --write`                                                                                                       |
| `lint:issues`     | `oxlint --type-aware --deny-warnings --report-unused-disable-directives`                                              |
| `lint:issues:fix` | `oxlint --fix --fix-suggestions --fix-dangerously --type-aware --deny-warnings --report-unused-disable-directives`    |
| `lint:types`      | `tsc -p <file>` for every `tsconfig.*.json` of the project, joined by `&&` (a `convex/tsconfig.json` is accepted too) |
| `lint:install`    | `pnpm install`                                                                                                        |
| `lint:knip`       | `knip`                                                                                                                |
| `lint:repo`       | `repo-check` (not in repo-checker itself, which runs its own sources)                                                 |
| `test:unit`       | `vitest run --coverage`                                                                                               |
| `test:watch`      | `vitest`, or `vitest --coverage`                                                                                      |
| `test:update`     | `vitest run --update`                                                                                                 |
| `test:ui`         | `vitest --ui`                                                                                                         |
| `test:e2e`        | `playwright test`                                                                                                     |
| `up:deps`         | `pnpm update --recursive --latest`                                                                                    |
| `test`            | `turbo run test:unit`, plus ` test:e2e` with Playwright (raw `vitest` is refused)                                     |
| `check`, `lint`   | `turbo run <tasks>`, `lint` runs `lint:install lint:types lint:knip lint:format lint:issues lint:repo`                |

TypeScript is `typescript ~7` (native `tsc`), without `@typescript/native-preview`: no `tsgo`.

## End of each task

`<cmd> && echo <task> completed successfully || (echo Please run pnpm run <fix task> to ... && exit 1)`. The `|| (...)` hint is only for a task that has a fix task (`lint:format` and `lint:issues`), and only the fix task name is checked, not the sentence.

## turbo.json

- `$schema` is `https://turborepo.dev/schema.json`.
- `globalDependencies` is not required: in a single-package project `package.json` and the lockfile already change every task.
- Every task run by `turbo run` in `check`, `lint` or `test` is declared. Without `inputs` turbo hashes every tracked file (`$TURBO_DEFAULT$`), so none is written. A hand-written list is kept and `$TURBO_DEFAULT$` is put in front of it. `lint:install` only reads `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
- `outputs` is `["dist/**"]` on `build:vite` and `["coverage/**"]` on `test:unit`.
- `lint:install` has no outputs: turbo skips the install when none of them changed. Every other task has `dependsOn` `lint:install`, so the install finishes before them.
- `lint:repo` has `inputs: ["$TURBO_DEFAULT$", "dist/**"]`, git ignores `dist/` (it stays cached, even if GitHub or npm change without a file change) and `dependsOn` every `build:*` task the project has (not `build`, which often runs `turbo run` itself), because repo-check looks at the build output. So `check` no longer starts with `repo-check &&`: turbo orders it after the build.
- `turbo` is a dependency and `.turbo` is in `.gitignore`.

## Rewriting `check` and `lint`

- A `check` or `lint` that is not a `turbo run` yet becomes one, and keeps the steps it ran: each `pnpm <task>` step to a script of its own (`lint:cli`, `check:once`, a plain `build`) becomes a task of the `turbo run`. The steps to a wrapper (`lint`, `test`, `check`) or to a leftover (`lint:tsc`) are dropped.
- `check` also runs the steps of `lint` and every `build:*` script.
- A created `lint` also runs the project's own `lint:*` tasks that `check` runs (`lint:sources`...).
- `check` runs `turbo run --output-logs=errors-only ...` (the flag right after `turbo run`, any other `--output-logs` is replaced), so only the errors fill the output. `lint` does not need it.
- `lint:install` goes first among the tasks in the `turbo run`.
- A `repo-check` step in `check` or `lint` is deleted once `lint:repo` is `repo-check`. A `lint:repo` that runs something else is reported, not overwritten: rename it first.
- A task whose script reads `dist/` (like `lint:cli`: `bun dist/cli.js --help`) also depends on the `build:*` tasks, as `lint:repo` does.
- A task turbo.json does not know is declared empty (`{}`), turbo then hashes every tracked file so the cache never hides a change. `build`, `build:vite` and `build:tsdown` get `outputs: ["dist/**"]`.
- Tasks that others depend on (`lint:install`, the `build:*` of `lint:repo`) are declared too, and a turbo.json of root tasks (`//#lint:types`) gets `//#` names.
- The json edits keep arrays of strings on one line, like the formatter.

## Other

- A script that runs `bun` needs the `bun` dependency and `allowBuilds: bun: true` in `pnpm-workspace.yaml`.
- Not checked: the turbo `AGENTS.md`.
