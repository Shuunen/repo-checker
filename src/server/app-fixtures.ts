import type { Actions } from './actions/actions.ts'
import { createApp, type ScanRunner } from './app.ts'

export const worksFine: Actions = {
  clone: () => Promise.resolve({ message: 'cloned', ok: true }),
  deleteClone: () => Promise.resolve({ message: 'deleted', ok: true }),
  discard: () => Promise.resolve({ message: 'discarded', ok: true }),
  previewDeleteClone: () => Promise.resolve({ ignoredFiles: ['.env'], ok: true, path: '/projects/old' }),
  previewDiscard: () => Promise.resolve({ fingerprint: 'abc', groups: [{ items: ['master: fix'], title: 'Unpushed commits' }], ok: true, path: '/projects/old' }),
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
