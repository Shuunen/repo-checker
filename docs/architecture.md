# Architecture

Status: partly built. The inventory, the checks engine, every check of the old tool, the five Sync checks, the report-only CLI, the HTTP server with its streaming scan and the project list of the web app exist, and the old code is removed. The project view and the actions do not yet, so the other routes below are still a sketch.

## Shape

One package, one `package.json`, three folders.

```
src/
  server/   Node 24 + TypeScript: scanning, git and gh calls, Hono HTTP server, CLI entry
  shared/   Types and pure helpers used by both sides (Project, ActionKind, plural...)
  web/      React 19 + TypeScript + Tailwind 4 + HeroUI, built by Vite
```

`web/` is built to static files that ship inside the npm package. `repo-check ui` starts the server, which serves those files and the API, then opens the browser. The server serves `dist/web` and prints its URL, it does not open the browser yet.

```
repo-check ui
   |
   v
Hono server (127.0.0.1)  <----  React app (static files)
   |   \
   |    gh api ...        (GitHub: repos, forks, archive, delete)
   |
   git ...                (local: status, branches, stash, clone)
```

## Rules

- `shared/` imports nothing from `server/` or `web/`. `web/` never imports from `server/`: it reads the events through the types of `shared/scan-event.ts`.
- The server is the only place that runs `git` and `gh`. The browser never talks to GitHub.
- All shell calls go through one small wrapper (fixed binary, argument array, never a shell string), so user data can never become shell syntax.
- The scan engine has no HTTP in it. The CLI and the server are two thin callers of the same functions.

## Scan flow

1. Resolve the target: a git repo means single-project mode, a folder of repos means folder mode.
2. Resolve the owner: `--owner` first. Otherwise, in single-project mode the owner of the project's `origin`, in folder mode the `gh` login (`gh api user`).
3. Build the local inventory (`git fetch --prune` then git state commands, run in parallel, bounded) and the GitHub inventory (`gh api`, paginated).
4. Match by `origin`, run the project rules on every project and the file rules on usable clones of the owner, and hand each project's result to `onProject` as soon as its checks finish. A fork is compared with its parent right before its own check, so the other projects do not wait for the forks. `onProgress` receives a short line at each step.

The inventory lives in `src/server/inventory`: `shell.ts` (the only place that runs `git` and `gh`), `git.ts` (one `LocalClone` per folder: origin, branches with ahead, behind and gone upstreams, changed files, stash, unpushed commit subjects, local-only branches), `github.ts` (`gh api --paginate --slurp`, private repos included when the owner is the `gh` login) and `match.ts` (one `Project` per clone and per repo without clone, other owners flagged). `forks.ts` reads each fork's `ForkStatus` during the scan, right before the fork's check: the parent, every branch compared with the parent's default branch, the open pull requests from each branch, and every failed call. A single failure makes the fork "cannot verify". On 2026-10-12 the 30 forks (120 branches, 2 calls per branch) took about 7 seconds with 8 forks at a time in a pool (13 seconds with 4, 7.8 with 8 in fixed batches), the slowest part of the scan, which is why results stream per project. The types are in `src/shared/project.ts`. A clone whose origin points to the owner but matches no repo keeps `github` undefined: that is the "origin 404" case of `broken-clone`.

The CLI is `src/server/cli.ts` (`scan.ts` reads the inventory and `check-projects.ts` checks each project, `report.ts` groups the findings by severity, then prints a summary line: checks run and skipped, counts per severity). `--verbose` also lists every passed and skipped check per project, and progress lines go to stderr so they never mix with the report. It runs as `repo-check` from the built package (`dist/server/bin.js`, built by `tsdown` with one file per rule) and as `bun scan` from the sources (`--target`, `--owner`, `--no-fetch`, `--verbose`, a leading `~` in the target is expanded).

`repo-check ui` (`bun ui` from the sources, `--port`, 4747 by default) starts the server: `serve.ts` listens on `127.0.0.1` with `@hono/node-server`, and `app.ts` is the Hono app. `GET /api/scan` streams the same `scan` as server-sent events (Hono's `streamSSE`), one per `ScanEvent` of `src/shared/scan-event.ts`, its `type` as the event name: `progress` (a line), `project` (one checked project), then `done` (owner, single project mode, duration) or `failed` (the error message). Writes are queued so events keep their order. A finding's edits are functions, so `toScanProject` sends the files they change (`fixFiles`) instead, and the edits stay on the server. Fields that are `undefined`, like `github` of a project without repo, are missing in the JSON. The target and the owner are fixed when the server starts; `?fetch=false` skips git fetch, and `--no-fetch` wins over the page. A middleware refuses any `Host` other than `127.0.0.1` and `localhost` (DNS rebinding). The page writes those events into a TanStack Query cache, so rows appear one by one, see Web app.

`check-projects.ts` checks the matched projects in two pools that run together: the projects that are not forks, 8 at a time, and the forks, 8 at a time, each compared with its parent (`addForkStatus`) right before its check. The fork comparison is the slowest part of a scan, so the other projects no longer wait for it. Measured on 2026-10-12 on the real data (107 projects, 30 forks), without fetch: first project at 1.4 s, 75 projects by 1.6 s, the last fork at 8.3 s (before, every project came in one burst after 8 to 13 s). With fetch, the first project comes at 5.3 s, because every clone is fetched before anything is checked.

## Web app

`src/web` is a React 19 page built by Vite (`vite build`, root `src/web`, output `dist/web`, which `repo-check ui` serves). `bun dev` runs the Vite dev server with `/api` proxied to `bun ui` on port 4747. Its packages are devDependencies on purpose: Vite bundles them, users never install them (the dependency-cruiser rule `not-to-dev-dep` skips `src/web` for that reason).

- `scan/`: `read-events.ts` reads the server-sent events of the response body as they arrive (an event split across chunks is read once complete), `scan-state.ts` folds the events into a `ScanState` (target, last progress line, projects in arrival order, done or failure), and `scan-query.ts` is one TanStack Query `streamedQuery` that opens `/api/scan` and applies that reducer. A refetch (the Rescan button) starts from an empty state. TanStack Query holds the stream now, and will hold the actions of the next steps too.
- `projects/`: pure logic, no React. `rows.ts` turns a project result into a table row (pills, branch, last push, primary action) and sorts the worst first, then by name. `filters.ts` has the sidebar entries (overview, needs attention, not cloned, forks, archived) and the four summary tiles. A Sync finding gets a short pill label from `ruleId.messageId`, with the full message on hover, and an unknown one falls back on its rule id.
- `layout/`: one small component per file (HeroUI v3: Table, Chip, Card, Button, Alert, Spinner): `dashboard` (query and selected filter), `sidebar`, `page`, `scan-header`, `scan-body`, `summary-tiles`, `project-table` and its parts. The row action button is disabled until the actions are built.
- `theme.ts` follows the OS theme by toggling the `dark` class that HeroUI reads.
- Tests: `fixtures.ts` builds findings, projects and a server-sent events response, and `app.test.tsx` renders the whole app against a fake scan request. The web tests run in happy-dom, the server tests in node (two vitest projects in `vitest.config.mts`). `main.tsx` only starts the page and is excluded from coverage.

## Checks engine

Every check in [checks.md](checks.md), Sync checks and ported file checks alike, is one rule run by the same engine. The rule shape copies ESLint and oxlint rules (`defineRule`, `meta`, `context.report`), but the engine is ours: oxlint only reads JS and TS files, and most checks read JSON, YAML, dotfiles, git state or GitHub.

```ts
export const scriptsNoNpmRun = defineRule({
  check({ pkg, report }) {
    const scripts = Object.entries(pkg?.scripts ?? {}).filter(([, script]) => npmRun.test(script))
    for (const [name] of scripts) report({ data: { name }, fix: fixer => fixer.json('package.json').update(['scripts', name], current => toPnpm(String(current))), messageId: 'found' })
  },
  meta: { fixable: true, id: 'scripts-no-npm-run', messages: { found: 'script "{{name}}" uses npm run, use pnpm instead, it is faster' }, severity: 'warning' },
})
```

- `meta.id` is the check id from [checks.md](checks.md). `src/server/rules.test.ts` fails when a rule is not marked 🚀 or ✅ there, or when a check marked 🚀 or ✅ has no rule, so the doc always says what is built.
- `meta.severity` is the only severity, no "just warn" flag at the call site.
- `meta.fixable` must be true for a rule to report a fix, and a `messageId` must exist in `meta.messages`. The runner throws otherwise.
- `context` is built once per project: parsed files (`pkg`, `readme`), project flags, cached file readers (`files.readText`, `files.sizeKo`, `files.search` to find text across the project, skipping `node_modules`, `.git`, `dist` and `coverage`). Git state and GitHub data are not in it: project rules receive the whole `Project` instead. Flags (`engine/flags.ts`) are detected from `package.json` and the `origin` of the git config (owner, repo), then overridden by the project's `.repo-checker.json` (`license`, `maxSizeKo`, `webUrl`...). Rules never touch the disk, run commands or log.
- A rule that applies only sometimes says so with `appliesTo(context)`, so the runner can tell "skipped" from "passed".
- `src/server/rules` has no file at its root, only group folders (one per group of [checks.md](checks.md)). Inside them, a file is `*.rule.ts` (exports rules), `*.utils.ts` (helpers for the rules of that folder, such as factories) or `*.test.ts`. Anything generic goes to `src/server/engine`. There is no list of rules to maintain: `loadRules(folder)` imports every `*.rule.ts` (sorted by path) and keeps every exported rule, alone or in an array. The server build must therefore emit each rule file as its own module (for example a tsdown entry per `*.rule.ts`), since a bundle would hide them from the loader. `src/server/rules.test.ts` enforces this layout, and fails when a `*.utils.ts` file exports a rule the loader would skip.
- Rules with the same pattern (forbid a dependency, require a property...) come from small factories in the `*.utils.ts` of their folder and are listed as tables, one rule per line. Unusual rules are written out by hand.
- Rules come in two flavors. File rules (`defineRule`) see `files`, `pkg` and `flags` and only run on usable clones. Project rules (`defineProjectRule`, `meta.scope: 'project'`, the `sync/` folder) see the whole `Project`, cloned or not, and report actions (`clone`, `delete-clone`, `delete-fork`, `discard`, `unarchive-push-rearchive`, see `src/shared/action.ts`) instead of edits. An action is only a name in the finding: the server runs it after confirmation, with its own fetch and safety re-check. `splitRules` separates the two flavors, `checkProjectRules` runs project rules, `testProjectRule` tests them from partial clone and repo fixtures.
- A fixer never writes. It returns edits (`fixer.json(file).set/update/remove`, `fixer.text(file, transform)`), each applied on the latest text of its file so edits chain. JSON edits go through `jsonc-parser`, so indentation, line endings, key order and comments are kept.
- The runner works in phases: `checkProject` (findings and one outcome per rule, passed, failed or skipped, nothing written), `planFixes` (one before/after per file, for the confirm dialog), then `fixProject` asks `confirm(plans)`, writes, and checks again to prove the fixes worked.
- Tests are ESLint style: `testRule(rule, { valid, invalid })` with plain objects and in-memory files. An invalid case lists its message ids and, when the rule can fix it, the expected file after the fix: a `package.json` object, or the raw text of another file such as the README. Project rules use `testProjectRule` the same way.
- The boundary is enforced: the dependency-cruiser rule `engine-knows-no-rule` fails `check` when a file in `src/server/engine` imports from `src/server/rules`. The new toolchain must keep an equivalent guard (dependency-cruiser, or oxlint `import/no-restricted-paths`).

```ts
testRule(scriptsNoNpmRun, {
  invalid: [{ errors: ['found'], name: 'one script', output: { scripts: { check: 'pnpm lint' } }, pkg: { scripts: { check: 'npm run lint' } } }],
  valid: [{ name: 'pnpm scripts', pkg: { scripts: { check: 'pnpm lint' } } }],
})
```

```text
src/shared/                   types and helpers for the server and the web app
  project.ts                  LocalClone, GithubRepo, ForkStatus, Project
  action.ts                   ActionKind
  text.ts                     plural
  scan-event.ts               Severity, RuleOutcome, ScanProject, ScanEvent: what the server streams
src/web/                      the page: main.tsx, app.tsx, scan/ (stream), projects/ (rows, filters), layout/ (components)
src/server/
  bin.ts, cli.ts              the CLI entry point, its options and the ui command
  app.ts, serve.ts            the Hono app (GET /api/scan as server-sent events, then the web app) and its server on 127.0.0.1
  scan.ts                     read the inventory, then check each project
  check-projects.ts           check every project, forks after their comparison, others meanwhile
  check-project.ts            project rules on every project, file rules on usable clones
  report.ts                   findings by severity, summary line, verbose lists
  rules.test.ts               rule ids against checks.md, rules folder layout
  inventory/                  shell, git, github, forks, match, map-limit, read-inventory
  engine/                     runs rules, knows no rule (enforced)
    define-rule.ts            defineRule, Report, Rule, Finding
    define-project-rule.ts    defineProjectRule, ProjectRule
    context.ts, flags.ts      the context of one project and its flags
    package-json.ts           PackageJson, dependency and script helpers
    require-property.ts       the requireProperty factory
    fixer.ts, io.ts           edits, disk and in-memory files
    runner.ts                 checkProject, checkProjectRules, planFixes, fixProject
    load-rules.ts             loadRules, splitRules
    rule-tester.ts            testRule, testProjectRule
  rules/                      the rules only, one folder per group of checks.md
    sync/                     the five v1 project rules
    package/  scripts/  dependencies/  publishing/  presentation/  testing/  code-tooling/
```

## API sketch

| Route | Purpose |
|---|---|
| `GET /api/scan` | Stream scan events for the whole target (built, see Scan flow) |
| `GET /api/projects/:name` | Full detail of one project |
| `POST /api/projects/:name/clone` | Clone a missing repo |
| `POST /api/projects/:name/unarchive-push` | Unarchive, push, re-archive an archived repo that has unpushed commits |
| `POST /api/projects/:name/discard` | Discard unsaved local work, after listing it |
| `POST /api/projects/:name/delete-clone` | Delete a local clone, after re-checking it is safe |
| `POST /api/forks/:name/delete` | Delete a pristine fork, after re-checking the strict rule on every branch |

Every `POST` re-validates the safety rule on the server and refuses if it no longer holds, whatever the page sent.

## Testing

- Scan engine: unit tests against throwaway git repos created in a temp folder (clean, dirty, ahead, stash, local-only branch). `gh` is replaced by a fake that returns recorded JSON.
- Safety rules: one test per rule in `docs/features.md`, including the refusal paths.
- Web: vitest in happy-dom with Testing Library, `getByTestId` only, against a fake scan response (a real stream of server-sent events, cut in small chunks too).
- A real-`gh` smoke test is manual and read-only.

## Build

During development bun runs the TypeScript sources directly. For the npm package, Vite builds `src/web` and `tsdown` builds `src/server` to plain JavaScript, because Node does not strip types inside `node_modules`: users only need Node 24, not bun. Both outputs ship in the npm package.

## Distribution

Published to npm as `repo-check` (see `docs/designs/projects-dashboard.md`). Needs `git` and an authenticated `gh`.
