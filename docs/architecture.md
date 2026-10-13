# Architecture

Status: built, except two things: applying from the page the file fixes that the rules already plan (`planFixes` and `fixProject` exist in the engine, a finding only says which files its fix would change), and the checks of [checks.md](checks.md) still marked 📋. The scan, the checks (the ported file checks, the Sync checks, the git state of each clone, the GitHub presentation), the CLI report, the HTTP server, the web app (list and project view) and the five actions (Clone, Delete clone, Unarchive and push, Discard, Delete fork) exist, and the old code is removed.

## Shape

One package, one `package.json`, three folders.

```
src/
  server/   Node 24 + TypeScript: scanning, git and gh calls, Hono HTTP server, CLI entry
  shared/   Types and pure helpers used by both sides (Project, ActionKind, plural...)
  web/      React 19 + TypeScript + Tailwind 4 + HeroUI, built by Vite
```

`web/` is built to static files that ship inside the npm package. `repo-check ui` starts the server, which serves those files and the API, then opens the browser. The server serves `dist/web`, prints its URL and opens it in the default browser (`bin.ts` spawns `xdg-open`, `open` or `cmd /c start`, see `open-browser.ts`, without a shell and without waiting, and an error to start it is ignored since the URL is printed), `--no-open` keeps the browser closed. It also answers `/project/*` with the page, so a reload on a project address works (any other unknown path is a 404).

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
3. Build the local inventory (git state commands without a fetch, run in parallel, bounded) and the GitHub inventory (`gh api`, paginated). Each usable clone is fetched and read again right before its own check.
4. Match by `origin`, run the project rules on every project and the file rules on usable clones of the owner, and hand each project's result to `onProject` as soon as its checks finish. A project whose checks throw (a malformed file, a gh failure on one fork) does not fail the scan: it gets one `checks-failed` error finding with the message, the others carry on. A fork is compared with its parent right before its own check, so the other projects do not wait for the forks. `onProgress` receives a short line at each step.

The inventory lives in `src/server/inventory`: `shell.ts` (the only place that runs `git` and `gh`), `git.ts` (one `LocalClone` per folder: origin, branches with ahead, behind and gone upstreams, changed files, stash, unpushed commit subjects, local-only branches), `github.ts` (`gh api --paginate --slurp`, private repos included when the owner is the `gh` login) and `match.ts` (one `Project` per clone and per repo without clone, other owners flagged). `forks.ts` reads each fork's `ForkStatus` during the scan, right before the fork's check: the parent, every branch compared with the parent's default branch, the open pull requests from each branch, and every failed call. A single failure makes the fork "cannot verify". On 2026-10-12 the 30 forks (120 branches, 2 calls per branch) took about 7 seconds with 8 forks at a time in a pool (13 seconds with 4, 7.8 with 8 in fixed batches), the slowest part of the scan, which is why results stream per project. The types are in `src/shared/project.ts`. A clone whose origin points to the owner but matches no repo keeps `github` undefined: that is the "origin 404" case of `broken-clone`.

The CLI is `src/server/cli.ts` (`scan.ts` reads the inventory and `check-projects.ts` checks each project, `report.ts` groups the findings by severity, then prints a summary line: checks run and skipped, counts per severity). `--verbose` also lists every passed and skipped check per project, and progress lines go to stderr so they never mix with the report. It runs as `repo-check` from the built package (`dist/server/bin.js`, built by `tsdown` with one file per rule) and as `bun scan` from the sources (`--target`, `--owner`, `--no-fetch`, `--verbose`, a leading `~` in the target is expanded).

`repo-check ui` (`bun ui` from the sources, `--port`, 4747 by default) starts the server: `serve.ts` listens on `127.0.0.1` with `@hono/node-server`, and `app.ts` is the Hono app. `GET /api/scan` streams the same `scan` as server-sent events (Hono's `streamSSE`), one per `ScanEvent` of `src/shared/scan-event.ts`, its `type` as the event name: `progress` (a line), `project` (one checked project), then `done` (owner, single project mode, duration) or `failed` (the error message). Writes are queued so events keep their order. A finding's edits are functions, so `toScanProject` sends the files they change (`fixFiles`) instead, and the edits stay on the server. Fields that are `undefined`, like `github` of a project without repo, are missing in the JSON. The target and the owner are fixed when the server starts; `?fetch=false` skips git fetch, and `--no-fetch` wins over the page. A middleware refuses any `Host` other than `127.0.0.1` and `localhost` (DNS rebinding). The page writes those events into a TanStack Query cache, so rows appear one by one, see Web app.

`check-projects.ts` checks the matched projects in two pools that run together: the projects that are not forks, 8 at a time, and the forks, 8 at a time, each compared with its parent (`addForkStatus`) right before its check. The fork comparison is the slowest part of a scan, so the other projects no longer wait for it. Measured on 2026-10-12 on the real data (107 projects, 30 forks), without fetch: first project at 1.4 s, 75 projects by 1.6 s, the last fork at 8.3 s (before, every project came in one burst after 8 to 13 s). Each usable clone is also read again with a fresh `git fetch` right before its own check (`refresh` in `check-projects.ts`, in the same pool, so no project waits for the fetch of another), instead of every clone being fetched before anything is checked. Measured on 2026-10-13 with fetch on the same data: first project at 1.5 s (5.3 s when every clone was fetched first), the 75th at 4.7 s, done at 8.8 s (11.7 s before).

## Web app

`src/web` is a React 19 page built by Vite (`vite build`, root `src/web`, output `dist/web`, which `repo-check ui` serves). `bun dev` runs the Vite dev server with `/api` proxied to `bun ui` on port 4747. Its packages are devDependencies on purpose: Vite bundles them, users never install them (the dependency-cruiser rule `not-to-dev-dep` skips `src/web` for that reason).

- `scan/`: `read-events.ts` reads the server-sent events of the response body as they arrive (an event split across chunks is read once complete), `scan-state.ts` folds the events into a `ScanState` (target, last progress line, projects in arrival order, done or failure), and `scan-query.ts` is one TanStack Query `streamedQuery` that opens `/api/scan` and applies that reducer. A refetch (the Rescan button) starts from an empty state. TanStack Query holds the stream now, and will hold the actions of the next steps too.
- `projects/`: pure logic, no React. `rows.ts` turns a project result into a table row (pills, branch, last push, the first action it offers) and sorts the worst first, then by name. `filters.ts` has the sidebar entries (overview, needs attention, not cloned, forks, archived) and the four summary tiles. A Sync finding gets a short pill label from `ruleId.messageId`, with the full message on hover, and an unknown one falls back on its rule id.
- `projects/detail.ts` is the logic of the project view, no React: the identity badges and GitHub link, the fact cards (`localFacts`: path, branch, upstream, unpushed commits, uncommitted files, stashes, local-only branches, or why the folder cannot be compared; `forkFacts`: parent, branches ahead, open pull requests, every failure), the findings grouped by origin (Sync with GitHub, then project files, the worst first) and the distinct actions offered.
- Routing is wouter with path addresses: `/` is the list, `/project/:name` the project view (`routes.tsx`). The name cell of a row links to it, and picking a sidebar filter goes back to the list (`use-filter.ts`). When the scan is of a single project, `use-open-single-project.ts` opens its view once, so the back link still works. A project the scan does not have yet says it is looking for it, then that it is not in the scan.
- `layout/`: one component per file, each under the 30 lines of `max-lines-per-function` (HeroUI v3: Table, Chip, Card, Button, Alert, AlertDialog, Spinner). A piece gets its own file only when it is reused or owns state: `dashboard` (query), `routes`, `sidebar` and `sidebar-entry`, `page`, `scan-header`, `scan-body`, `scan-failure`, `summary-tiles`, `project-table` and `project-row` (the cells are inline), `project-page` (back link, and the project or why it is missing), `project-detail`, `project-identity`, `findings-card` and `finding-item`, `facts-card`, `actions-card` and `action-button`, `clone-button`, `clone-dialog`, and the hooks `use-filter`, `use-open-single-project`, `use-action-dialog` and `use-previewed-dialog`. The row's first action has its own button there, which opens the confirmation from the list.
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
- Rules come in two flavors. File rules (`defineRule`) see `files`, `pkg` and `flags` and only run on usable clones. Project rules (`defineProjectRule`, `meta.scope: 'project'`, the `sync/` folder, `git-hygiene/clone-state.rule.ts`, the checks on the git state of a clone: behind-remote, uncommitted-files, unpushed-commits, forgotten-stash, branch-without-upstream, not-on-default-branch, and `presentation/github-metadata.rule.ts`, how an own repo presents itself on GitHub: missing-license, missing-description, missing-topics, missing-homepage, made by the `requireRepoField` factory) see the whole `Project`, cloned or not, and report actions (`clone`, `delete-clone`, `delete-fork`, `discard`, `unarchive-push-rearchive`, see `src/shared/action.ts`) instead of edits. An action is only a name in the finding: the server runs it after confirmation, with its own fetch and safety re-check. `splitRules` separates the two flavors, `checkProjectRules` runs project rules, `testProjectRule` tests them from partial clone and repo fixtures.
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
  unsaved.ts                  the unsaved items of a clone, item by item (the dialogs and the discard fingerprint)
src/web/                      the page: main.tsx, app.tsx, scan/ (stream), projects/ (rows, filters), layout/ (components)
src/server/
  bin.ts, cli.ts              the CLI entry point, its options and the ui command
  app.ts, serve.ts            the Hono app (GET /api/scan as server-sent events, the actions, then the web app) and its server on 127.0.0.1
  ui.ts                       the ui command: the port, the app, the server, the browser
  open-browser.ts, home-path.ts  the command that opens the browser per platform, the home folder shown as ~
  to-scan-project.ts          a project result in its JSON-safe shape (the edits of a fix stay on the server)
  app-actions.ts              the routes of the actions
  actions/                    actions.ts and actions-contract.ts (the actions of a server), clone, delete-clone, unarchive-push, discard, delete-fork, rescan, the proofs they share (archived-proof.ts, fork-proof.ts), guards, ignored-files, delete-scope, action-options; each proves again before it acts
  scan.ts                     read the inventory, then check each project
  check-projects.ts           check every project, forks after their comparison, others meanwhile
  check-project.ts            project rules on every project, file rules on usable clones
  report.ts                   findings by severity, summary line, verbose lists
  rules.test.ts               rule ids against checks.md, rules folder layout
  app-fixtures.ts, cli-fixtures.ts, actions/discard-fixtures.ts, web/fixtures.ts, web/render-app.tsx  test helpers (outside the coverage)
  inventory/                  shell, git, github, forks, match, map-limit, read-inventory
  engine/                     runs rules, knows no rule (enforced)
    define-rule.ts            defineRule, Report, Rule, Finding
    define-project-rule.ts    defineProjectRule, ProjectRule
    context.ts, flags.ts      the context of one project and its flags
    package-json.ts           PackageJson, dependency and script helpers
    require-property.ts       the requireProperty factory
    file-rules.ts             the factories of file rules: requireFile, forbidFile, requireInFile, forbidInFile, requireJsonSchema, requireJsonValues
    fixer.ts, io.ts           edits, disk and in-memory files
    runner.ts                 checkProject, checkProjectRules, planFixes, fixProject
    load-rules.ts             loadRules, splitRules
    rule-tester.ts            testRule, testProjectRule
  rules/                      the rules only, one folder per group of checks.md
    sync/                     the five Sync project rules
    git-hygiene/              the git state of a clone (project rules in clone-state.rule.ts) and the git file rules
    presentation/             the README and license file rules, and the GitHub presentation (project rules in github-metadata.rule.ts)
    package/  scripts/  dependencies/  publishing/  testing/  code-tooling/  ci/  runtime/
```

## API

| Route | Purpose |
|---|---|
| `GET /api/scan` | Stream scan events for the whole target (built, see Scan flow) |
| `GET /api/projects/:name/rescan` | One project scanned again after an action changed it (built, see Actions) |
| `POST /api/projects/:name/clone` | Clone a missing repo (built, see Actions) |
| `POST /api/projects/:name/unarchive-push` | Unarchive, push, re-archive an archived repo that has unpushed commits (built, see Actions) |
| `GET /api/projects/:name/discard` | List exactly what a discard would throw away, read fresh, with the fingerprint of that list (built, see Actions) |
| `POST /api/projects/:name/discard?fingerprint=…` | Discard unsaved local work, only if the clone still holds exactly the listed work (built, see Actions) |
| `GET /api/projects/:name/delete-clone` | Say what deleting a local clone would remove, after proving it is still safe (built, see Actions) |
| `POST /api/projects/:name/delete-clone` | Delete a local clone, after re-checking it is safe (built, see Actions) |
| `GET /api/projects/:name/delete-fork` | Say what deleting a fork would remove, after proving it is pristine again (built, see Actions) |
| `POST /api/projects/:name/delete-fork` | Delete a pristine fork, after re-checking the strict rule on every branch (built, see Actions) |

Every `POST` re-validates the safety rule on the server and refuses if it no longer holds, whatever the page sent.

## Actions

An action is a function in `src/server/actions` that takes the repo name and proves again, right before acting, that the scan was right, then acts, and returns an `ActionResult` (`src/shared/action.ts`): `{ ok: true, message }`, or `{ ok: false, reason }` with the reason to show. A refusal is a normal answer, not an exception. `actions.ts` builds them for a server started on a folder (the owner is the `--owner` option, or the gh login read when an action runs), and `app.ts` routes them: status 200 when it worked, 409 with the reason when it was refused or failed.

- **Request guard**: every request that is not a GET must carry the header `x-repo-check: 1`, otherwise it is a 403. A web page of another site can post to `127.0.0.1` (the host is allowed), but it cannot add a custom header without a preflight request, which the server never answers. The `Host` check against DNS rebinding applies to every request too. The page's `post-clone.ts` adds the header.
- **Clone** (`actions/clone.ts`): refuses a name that is not a plain repo name (letters, digits, `.`, `-`, `_`, never a path, `.` or `..`), a target that is itself a git repo (single project mode), a folder of that name that already exists, a repo that is gone from GitHub, was renamed, is archived or is a fork (the `not-cloned` rule only offers non-archived non-forks). Then it runs `git clone git@github.com:owner/name.git target/name`, always over SSH like the existing clones (decided 2026-10-13, it needs an SSH key known to GitHub), and the tool never sees a token. A failed clone gives the git error as the reason.
- **Delete clone** (`actions/delete-clone.ts`, the proof in `archived-proof.ts`, shared with Unarchive and push): `proveArchived(options, action)` trusts nothing the page said. It refuses a name that is not a repo name, a single-project target, a repo that is gone, renamed, not archived or a fork, no clone or several clones of the repo in the folder, then reads the one clone again with a fresh `git fetch` and runs the Sync rules `archived-with-unsaved-work` and `archived-clone` on it: the action goes ahead only if a rule still offers it (`archived-clone` for `delete-clone`). Otherwise the reason is the message of the rule that fired (for example "1 unpushed commit"), so there is one source of truth for "safe". `previewDeleteClone` (a GET, a few seconds because of the fetch) adds the files git ignores that the delete would lose: `git ls-files --others --ignored --directory`, leaving out the folders a build recreates (`node_modules`, `dist`, `coverage`, `.cache`, `.turbo`), and a folder git collapsed is only listed when it holds a real file. `deleteClone` (a POST) runs the proof again, checks the clone is a direct child of the folder of projects, and removes the folder with `fs.rm`. It never touches GitHub. The folder is removed for good, not moved to a trash: what is lost is only what the dialog listed.
- **Unarchive and push** (`actions/unarchive-push.ts`): the same proof, for the action `unarchive-push-rearchive` (so `archived-with-unsaved-work` must still offer it on the freshly fetched clone), then two more refusals: uncommitted files or a stash, because it only pushes and never creates a commit. It then runs `gh api --method PATCH repos/owner/name -F archived=false`, pushes in one `git push origin refs/heads/b:refs/heads/b …` (every branch with unpushed commits and every local-only branch, never forced), and always archives the repo again, whether the push worked or not, then reads the repo back from GitHub to be sure it is archived (a call that says ok but did nothing, or a repo that cannot be read, gives the hand command too). A failed unarchive pushes nothing. A failed push says the repo is archived again and nothing was pushed. If archiving again fails, the reason gives the hand command (`gh api --method PATCH repos/owner/name -F archived=true`), since the repo is left writable. The scanned data already holds the unsaved items, so the page lists them without asking the server.
- **Discard** (`actions/discard.ts`): the same proof, for the action `discard`, then a plan of git steps built from the freshly fetched clone and run in order, stopping at the first failure (the reason then says the clone may be half discarded): `git stash clear`; when the checked out branch has no upstream on GitHub (local-only, gone upstream, detached), `git checkout --force` to the default branch of GitHub (`origin/HEAD`), or else the first branch that has an upstream, and a refusal when no branch exists on GitHub; `git branch --force b upstream` for every other branch that is ahead; `git reset --hard upstream` on the landing branch; `git clean -fd` (uncommitted and untracked files, the ignored ones stay); `git branch -D` for every local-only branch. It then reads the clone again and reports anything still unsaved. What the user confirms is exactly what is thrown away: the preview (a GET, a few seconds because of the fetch) returns the list (`shared/unsaved.ts`) with a SHA-256 fingerprint of it, the page sends that fingerprint with the POST, and the discard re-reads the clone fresh and refuses when its list no longer gives the same fingerprint (a file added after the dialog was read, for example). Nothing is touched on GitHub.
- **Delete fork** (`actions/delete-fork.ts`, the proof in `fork-proof.ts`): `proveFork` trusts nothing the page said. It refuses a name that is not a repo name, a single-project target, a repo that is gone, renamed or not a fork. It then reads the fork's status again from GitHub (`readForkStatus`: the parent, every branch compared with the parent's default branch, the open pull requests from each branch, every failed call), reads its clone if it has one again with a fresh `git fetch` (several clones are refused), and runs the strict Sync rule `pristine-fork` on that fresh data: the delete goes ahead only if the rule still offers `delete-fork`, so the reason of a refusal is the rule's own message (a branch is 2 ahead, an open pull request, a comparison that failed is "cannot verify", the clone has an unpushed commit). The last proof is the token: `delete-scope.ts` reads the `X-OAuth-Scopes` header of `gh api -i user` and refuses with `gh auth refresh -s delete_repo` when the scope is missing (a token that sends no such header, a fine-grained token, is tried, and a 403 from GitHub gives the same command). `deleteFork` deletes on GitHub first, with `gh api --method DELETE repos/owner/name`, so a refusal leaves the clone alone, and only then removes the clean clone with `fs.rm`. `previewDeleteFork` (a GET) says the parent, how many branches were compared, and the clone that goes too with the ignored files in it.
- **Rescan** (`actions/rescan.ts`): after an action succeeded, `GET /api/projects/:name/rescan` scans only that project again: its repo from GitHub, its clone found by the repo it points to (or by its folder name for a broken one) and read with a fresh fetch, then the same checks as the scan (`checkProjects` on one project, so a fork gets its comparison). It answers `{ ok: true, project }` with the project as it is now, `{ ok: true }` without a project when it is gone (a deleted fork, a repo that does not exist and has no folder), or a refusal. It takes about 1 to 2.5 s on the real data, against about 12 s for the whole list. `scan/refresh-project.ts` puts the answer in the TanStack Query cache in place of the old entry (`replaceProject`), so the rest of the list stays and nothing blanks. When the project cannot be scanned alone (a refusal, an answer that is not JSON, a server that cannot be reached) the whole scan runs again.
- **Page**: the project view's Clone button opens a confirmation (HeroUI AlertDialog) that says what will be cloned and where, and nothing is sent before Clone is pressed. On success the project is scanned again alone and replaced in the list, and the dialog closes. A refusal stays in the dialog, with its reason. The Delete clone button opens a dialog that first asks the server for the preview ("Checking again, with a fresh git fetch…"), then shows the folder and the ignored files that would be lost (the first 20, and how many in all), or the reason the delete is refused. Delete is disabled until the proof holds, and the delete proves everything again when it is confirmed. The Unarchive & push button opens a dialog that lists the unsaved commits, branches, files and stashes (`unsaved-list.tsx`, shared with the next dialogs), says the repo is writable for a few seconds, and shows why it cannot run, with the confirm button disabled, while the clone has uncommitted files or a stash. Clone and Unarchive & push share `use-action-dialog.ts`. The Discard dialog reads the list when it opens ("Reading again, with a fresh git fetch, exactly what would be thrown away…"), shows every item, says there is no undo and that ignored files stay, and sends the fingerprint with the confirmation. The first action a project offers has its button right in the row of the list (the same `ActionButton` and the same dialogs as on the project page, decided in the review on 2026-10-13), so a confirmation can start from either place. The Delete fork dialog first checks again ("…comparing every branch with the parent, the open pull requests and your gh token…"), then says the fork is deleted on GitHub for good, how many branches were compared, and the clean clone that is deleted too with its ignored files, or the reason it is refused, such as the missing scope with its command. Every dialog is one `ConfirmDialog` (heading, what it says, Cancel, confirm, the test ids start with a prefix), and the actions that show what they would do first (delete clone, discard, delete fork) share `use-previewed-dialog.ts`.

## Testing

- Scan engine: unit tests against throwaway git repos created in a temp folder (clean, dirty, ahead, stash, local-only branch). `gh` is replaced by a fake that returns recorded JSON.
- Safety rules: one test per rule in `docs/features.md`, including the refusal paths.
- Web: vitest in happy-dom with Testing Library, `getByTestId` only, against a fake scan response (a real stream of server-sent events, cut in small chunks too).
- A real-`gh` smoke test is manual and read-only.

## Build

During development bun runs the TypeScript sources directly. For the npm package, Vite builds `src/web` and `tsdown` builds `src/server` to plain JavaScript, because Node does not strip types inside `node_modules`: users only need Node 24, not bun. Both outputs ship in the npm package.

## Distribution

Published to npm as `repo-check` (see `docs/designs/projects-dashboard.md`). Needs `git` and an authenticated `gh`.
