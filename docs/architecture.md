# Architecture

Status: proposed. Names and routes below are a starting point, change them when the code says otherwise.

## Shape

One package, one `package.json`, three folders.

```
src/
  server/   Node 24 + TypeScript: scanning, git and gh calls, Hono HTTP server, CLI entry
  shared/   Types and pure helpers used by both sides (Project, Issue, ScanEvent...)
  web/      React 19 + TypeScript + Tailwind 4 + HeroUI, built by Vite
```

`web/` is built to static files that ship inside the npm package. `repo-check ui` starts the server, which serves those files and the API, then opens the browser.

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

- `shared/` imports nothing from `server/` or `web/`. `web/` never imports from `server/` except types through the Hono client.
- The server is the only place that runs `git` and `gh`. The browser never talks to GitHub.
- All shell calls go through one small wrapper (fixed binary, argument array, never a shell string), so user data can never become shell syntax.
- The scan engine has no HTTP in it. The CLI and the server are two thin callers of the same functions.

## Scan flow

1. Resolve the target: a git repo means single-project mode, a folder of repos means folder mode.
2. Resolve the owner: `--owner` first. Otherwise, in single-project mode the owner of the project's `origin`, in folder mode the `gh` login (`gh api user`).
3. Build the local inventory (`git fetch --prune` then git state commands, run in parallel, bounded) and the GitHub inventory (`gh api`, paginated).
4. Match by `origin`, run the Sync checks, emit one event per project as soon as its checks finish.

The server streams those events to the page (server-sent events through Hono's streaming helper). The page writes them into a TanStack Query cache, so rows appear one by one.

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

- `meta.id` is the check id from [checks.md](checks.md). A test fails when an id in the code is missing from the docs. Once the Sync rules exist, the same test also checks that every 🚀 id in the docs has a rule.
- `meta.severity` is the only severity, no "just warn" flag at the call site.
- `meta.fixable` must be true for a rule to report a fix, and a `messageId` must exist in `meta.messages`. The runner throws otherwise.
- `context` is built once per project: parsed files (`pkg`...), project flags, cached file readers (`files.readText`, `files.sizeKo`, `files.search` to find text across the project, skipping `node_modules`, `.git`, `dist` and `coverage`), later git state and GitHub data. Flags (`engine/flags.ts`) are detected from `package.json` and the `origin` of the git config, then overridden by the project's `.repo-checker.json`. Rules never touch the disk, run commands or log.
- A rule that applies only sometimes says so with `appliesTo(context)`, so the runner can tell "skipped" from "passed".
- `src/server/rules` has no file at its root, only group folders (one per group of [checks.md](checks.md)). Inside them, a file is `*.rule.ts` (exports rules), `*.utils.ts` (helpers for the rules of that folder, such as factories) or `*.test.ts`. Anything generic goes to `src/server/engine`. There is no list of rules to maintain: `loadRules(folder)` imports every `*.rule.ts` (sorted by path) and keeps every exported rule, alone or in an array. The server build must therefore emit each rule file as its own module (for example a tsdown entry per `*.rule.ts`), since a bundle would hide them from the loader. `src/server/rules.test.ts` enforces this layout, and fails when a `*.utils.ts` file exports a rule the loader would skip.
- Rules with the same pattern (forbid a dependency, require a property...) come from small factories in the `*.utils.ts` of their folder and are listed as tables, one rule per line. Unusual rules are written out by hand.
- A fixer never writes. It returns edits (`fixer.json(file).set/update/remove`, `fixer.text(file, transform)`), each applied on the latest text of its file so edits chain. JSON edits go through `jsonc-parser`, so indentation, line endings, key order and comments are kept.
- The runner works in phases: `checkProject` (findings, nothing written), `planFixes` (one before/after per file, for the confirm dialog), then `fixProject` asks `confirm(plans)`, writes, and checks again to prove the fixes worked.
- Tests are ESLint style: `testRule(rule, { valid, invalid })` with plain objects and in-memory files. An invalid case lists its message ids and, when the rule can fix it, the expected `package.json` after the fix.
- The boundary is enforced: the dependency-cruiser rule `engine-knows-no-rule` fails `check` when a file in `src/server/engine` imports from `src/server/rules`. The new toolchain must keep an equivalent guard (dependency-cruiser, or oxlint `import/no-restricted-paths`).

```ts
testRule(scriptsNoNpmRun, {
  invalid: [{ errors: ['found'], name: 'one script', output: { scripts: { check: 'pnpm lint' } }, pkg: { scripts: { check: 'npm run lint' } } }],
  valid: [{ name: 'pnpm scripts', pkg: { scripts: { check: 'pnpm lint' } } }],
})
```

```text
src/server/engine/   runs rules, knows no rule
  define-rule.ts     defineRule, Report, Rule, Finding
  fixer.ts           json and text edits
  io.ts              disk and in-memory file access
  context.ts         build the context of one project
  runner.ts          checkProject, planFixes, fixProject
  rule-tester.ts     testRule
  load-rules.ts      loadRules, finds every *.rule.ts
src/server/rules/    the rules only, they import from engine, never the reverse (enforced)
  sync/                       v1 rules
  dependencies/
    dependencies.utils.ts     forbidDependency
    forbidden.rule.ts         table of forbidDependency rules
    forbidden.test.ts
  scripts/
    scripts.utils.ts          toPnpm
    scripts-no-npm-run.rule.ts
    ...
src/server/rules.test.ts      ids unique and in checks.md, folder layout
```

## API sketch

| Route | Purpose |
|---|---|
| `GET /api/scan` | Stream scan events for the whole target |
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
- Web: vitest with Testing Library, `getByTestId` only.
- A real-`gh` smoke test is manual and read-only.

## Build

Vite builds `src/web`. `tsdown` builds `src/server` to plain JavaScript, because Node does not strip types inside `node_modules`. Both outputs ship in the npm package.

## Distribution

Published to npm as `repo-check` (see `docs/designs/projects-dashboard.md`). Needs `git` and an authenticated `gh`.
