# Improvements

A review of the `rewrite/projects-dashboard` branch (135 commits, ~15k lines of source) for DRY, readable, maintainable and fast code. One item per section, ranked by gain. An item is ticked once it is done and `pnpm check` passes.

Legend: **Speed** makes something faster, **DRY** removes a repeated thing, **Read** makes the code easier to read.

Status: 13 of the 16 items are done. Items 12, 15 and 16 wait for a decision, see their sections.

## 1. Find one clone without reading every clone — Speed, DRY

- [x] Done

**Was.** To find the clone of one repo, the actions read the full git state of every clone in the folder: about 9 git processes per clone, so ~500 for 59 projects. They kept one clone and read it again. This happened on every preview, every confirm, and on the `rescan` after every action. The lookup was written 7 times, each with slightly different rules.

**Done.**

- `listClones` in [inventory/git.ts](../src/server/inventory/git.ts) only reads where each folder is and its origin: 2 git processes per folder. `readClone` reuses the same `pointTo`.
- `GitReaders.readClones` became `listClones`.
- `findCloneOf` and `requireCloneOf` in [guards.ts](../src/server/actions/guards.ts) replace the copies, with one wording: "no clone of X in T" and "N clones of X in T, delete the extra ones by hand".
- `rescan`, `fix-plan` and `delete-project`, which match by folder name too, use `listClones` and then read only the clone they found.

**Gain.** An action costs about 10 git processes instead of about 1000. A side effect: the server test run dropped from about 31 s to 27 s.

## 2. One registry of the actions — DRY

- [x] Done

**Done.**

- `postedActions` in [shared/action.ts](../src/shared/action.ts) is the one list of the actions the page posts, with the toast of each and whether it has a preview and a fingerprint.
- `PostedAction`, `PreviewedAction` and `FingerprintedAction` are derived from it, and so are the toasts (`doneMessage`), the server routes, and whether the dialog asks for a preview.
- `unarchive-push-rearchive` is renamed `unarchive-push` everywhere. The test id is now `action-unarchive-push`.

Labels and icons stay in `action-meta.ts`, typed `Record<ProjectAction, …>`, since they are web only and one label depends on the project.

## 3. Routes from a table, guards in one middleware — DRY, Read

- [x] Done

**Done.**

- [app-actions.ts](../src/server/app-actions.ts) builds the plain routes from three typed tables (previews, actions with a fingerprint, actions by name). They are `Record`s keyed by the registry, so a missing route is a type error.
- Only `fix-files` (it streams), `sync-github-metadata` (it takes a body), `live`, `rescan` and `update-project` are written by hand.
- A middleware on `/api/projects/:name/*` refuses a name that is not a repo name, with a 409. `repoNameOf` in `options(name)` ([actions.ts](../src/server/actions/actions.ts)) checks it again with an `invariant` before any action runs.
- The 11 `isRepoName` checks inside the actions and their tests are gone. [app-names.test.ts](../src/server/app-names.test.ts) covers the middleware.

## 4. One `attempt` wrapper for the actions — DRY, Read

- [x] Done

**Done.**

- `attempt(run)` in [shared/action.ts](../src/shared/action.ts) turns anything thrown into a refusal with the error message. It replaces 23 `try/catch` blocks in the actions.
- `errorMessage` in [shared/text.ts](../src/shared/text.ts) replaces the 3 other copies.
- `refused(reason)` replaces 74 `{ ok: false, reason }` literals.

The actions keep their direct-call contract (they still resolve to a refusal), so their tests did not change.

## 5. A `Refusable<T>` type for the previews — DRY, Read

- [x] Done

**Done.** `Refused` and `Refusable<Data>` in [shared/action.ts](../src/shared/action.ts). Every preview type, `ActionResult`, `RescanResult`, `LiveResult` and `RescanOutcome` use them.

## 6. One dialog per action, fed by one `dialog` prop — DRY, Read

- [x] Done

**Done.**

- `ConfirmDialog` takes the hook result as a single `dialog` prop. `isDanger` and `isWide` are optional, and `isBlocked` replaces the hand-made `canConfirm` for the dialogs that need it (unarchive-push, sync).
- [preview-body.tsx](../src/web/layout/preview-body.tsx) renders the checking, refused and error states with the dialog prefix, so each body keeps only what the action would do.
- [action-trigger.tsx](../src/web/layout/action-trigger.tsx) is the button that opens a dialog.
- Each action is now one `*-button.tsx` that holds its button and its dialog.
- Removed: 11 `*-dialog.tsx` files, 6 `*-body.tsx` files, `use-previewed-dialog.ts` and `use-fix-git.ts`.
- The test ids are unchanged, and every web test passes as is.

## 7. Open a dialog from the menu without clicking a hidden button — Read

- [x] Done

**Done.**

- The Actions menu keeps the chosen action and a counter. It mounts the action inside `OpensAtOnce` (in [use-action-dialog.ts](../src/web/layout/use-action-dialog.ts)), keyed by the counter, so choosing the same action again opens it again.
- `useOpensAtOnce` opens the dialog once and hides the button.
- The hidden span, the ref, the DOM `click()` and `use-chosen-action.ts` are gone.
- The icon-only variant of Delete project was only reachable through that hidden button, so it is gone too.

## 8. Merge `useActionDialog` into `usePreviewedDialog` — DRY

- [x] Done

**Done.**

- One `useActionDialog(name, action, options)`. It asks for the preview only when the registry says the action has one. It sends back `preview.fingerprint` when the preview has one, so no caller passes `fingerprintOf` any more. It gives `canConfirm`.
- The mutation lives in a small `useRun`.
- `useFixes(name)` in [use-fixes.ts](../src/web/layout/use-fixes.ts) builds the dialogs of the file fixes, the git fixes and both at once, so `fix-files-card` uses one hook.

## 9. One `fingerprint()` helper — DRY

- [x] Done

**Done.** [actions/fingerprint.ts](../src/server/actions/fingerprint.ts) has `fingerprintOf(value)` and `staleReason(what, done)`. They replace the 4 sha256 copies and the 4 stale-list messages.

## 10. `FilePlan` and `FixPlan` are the same type — DRY

- [x] Done

**Done.** The runner uses `FixPlan` from `shared/action.ts`, and `FilePlan` is gone.

## 11. One ordered SSE sender — DRY

- [x] Done

**Done.**

- `eventSender` lives in [sse.ts](../src/server/sse.ts) and is used by the scan stream and by the Claude session stream.
- The scan stream moved to [stream-scan.ts](../src/server/stream-scan.ts), which keeps `app.ts` under the import limit.

## 12. Live watch with TanStack Query — Read (needs your input)

- [ ] Done

**Now.** [use-live-project.ts](../src/web/layout/use-live-project.ts) runs a `setTimeout` loop. It skips a tick while the tab is hidden or while any `[role="dialog"]` is in the DOM.

**Why it is not done.** `useQuery` with `refetchInterval` would change behavior that `live.test.tsx` pins down:

- It fetches at once on mount, instead of after the first `pollMs`.
- It fetches on mount even in a hidden tab.
- It needs an abort check so an answer that arrives after leaving the page does not touch the cache.
- The pause while a dialog is open needs app state, and the DOM check covers every dialog today (confirmations, the Claude chat, the commit notice).

The code would come out about the same size, with more risk. **Your call:** keep it as is, or accept "first fetch at once" and "a dialog registers itself as open".

## 13. Fewer git processes per clone — Speed

- [x] Done

**Done.**

- `readState` reads `refs/heads` and `refs/remotes/origin` in one `for-each-ref` with the full ref name, and splits it by prefix.
- One `for-each-ref --merged=origin/HEAD` covers both kinds of refs.
- The parsing goes through one `splitRef`.

That makes 6 git processes per clone instead of 8, checked against plain git on this repo.

## 14. Inject git into every action — Read, tests

- [x] Done

**Done.**

- `ActionOptions.runGit?: GitRunner` defaults to `realRunGit`, and every action that writes uses it: clone, checkout, delete-branches, fix-git, discard, the commit of fix-files, and the push of unarchive-push.
- The 3 copies of the `runGit?` type and its default are gone.
- The two copies of `deleteBranches` are now one, in [fix-git.ts](../src/server/actions/fix-git.ts).
- `ignored-files.ts` still runs git itself, since it only reads.

## 15. Fewer duplicate prop docs — Read (needs your input: lint config)

- [ ] Done

**Now.** In the `.tsx` files, every prop is documented on the props interface and again as `@param props.x`. Items 6 and 8 removed many of these lines, but the pattern stays.

**Proposal.** Set `checkDestructured: false` on `jsdoc/require-param` for `src/web`, so the interface docs are the only ones. This changes a lint rule, so per `docs/conventions.md` it waits for your go-ahead.

## 16. Content rules read their file twice — Read (needs your input: engine API)

- [ ] Done

**Now.** In [file-rules.ts](../src/server/engine/file-rules.ts), `contentApplies` finds the file and `check` finds it again. The reads are cached, so this costs nothing.

**Why it is not done.** Dropping `appliesTo` would turn "skipped" into "passed" for those rules, unless `check` can report "skipped". That changes the rule contract of the engine. **Your call:** keep the passed/skipped split (leave it as is), or let `check` return `'skipped'`.

## Found on the way

- **A flaky coverage gap**: `claude-process.ts` had an anonymous `stdin` error listener that only ran when a write raced the exit, so function coverage was sometimes 99.93%. It now uses `noop` from es-toolkit.
- **A slow discard fixture**: the fake `listClones` of `discard-fixtures.ts` did a full `readClone`. It now returns a pointer, like the real one, and the discard test that sat at the 5 s limit has room again.
- **Docs**: `docs/architecture.md` now describes the routes from the registry, the name middleware, `findCloneOf`, `useActionDialog`, `PreviewBody` and `OpensAtOnce`.
