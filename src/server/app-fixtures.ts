import type { Actions } from './actions/actions-contract.ts'
import { createApp, type ScanRunner } from './app.ts'

export const worksFine: Actions = {
  archive: () => Promise.resolve({ message: 'archived', ok: true }),
  checkoutDefault: () => Promise.resolve({ message: 'checked out', ok: true }),
  clone: () => Promise.resolve({ message: 'cloned', ok: true }),
  deleteClone: () => Promise.resolve({ message: 'deleted', ok: true }),
  deleteFork: () => Promise.resolve({ message: 'deleted the fork', ok: true }),
  deleteProject: () => Promise.resolve({ message: 'deleted the project', ok: true }),
  discard: () => Promise.resolve({ message: 'discarded', ok: true }),
  fixFiles: () => Promise.resolve({ message: 'fixed', ok: true }),
  previewDeleteClone: () => Promise.resolve({ ignoredFiles: ['.env'], ok: true, path: '/projects/old' }),
  previewDeleteFork: () => Promise.resolve({ branches: 1, clone: undefined, ok: true, parent: 'them/lib' }),
  previewDeleteProject: () => Promise.resolve({ clone: { ignoredFiles: [], path: '/projects/old', unsaved: [] }, ok: true, repo: 'owner/old' }),
  previewDiscard: () => Promise.resolve({ fingerprint: 'abc', groups: [{ items: ['master: fix'], title: 'Unpushed commits' }], ok: true, path: '/projects/old' }),
  previewFixFiles: () => Promise.resolve({ blocked: [], fingerprint: 'abc', installs: [], ok: true, path: '/projects/app', plans: [{ after: 'b', before: 'a', file: 'package.json' }] }),
  rescan: () => Promise.resolve({ ok: true, project: undefined, target: '/projects' }),
  unarchive: () => Promise.resolve({ message: 'unarchived', ok: true }),
  unarchivePush: () => Promise.resolve({ message: 'pushed', ok: true }),
}

/**
 * Create the app on the /projects target, serving the given web folder
 * @param runScan runs the scan
 * @param webFolder the built web app, this folder by default
 * @param actions the actions, a clone that works by default
 * @returns the app
 */
export function app(runScan: ScanRunner, webFolder = import.meta.dirname, actions = worksFine) {
  return createApp(runScan, { actions, target: '/projects', webFolder })
}
