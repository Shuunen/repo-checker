import type { LocalClone, Project } from '../shared/project.ts'
import type { ProjectResult } from './check-projects.ts'
import { fingerprintFolder } from './inventory/fingerprint.ts'

/** How long a project waits before the rate limit is looked at again once it was too low, in milliseconds */
export const pauseMs = 60_000

/** How long the GitHub side of a remembered result is trusted, in milliseconds. After that the project is read from GitHub again */
export const remoteTtlMs = 300_000

/** What is remembered about one project */
export interface MemoryEntry {
  /** True while GitHub's rate limit was too low to read the project again on time */
  isPaused: boolean
  /** The fingerprint of the clone when the result was checked, empty for a project without clone */
  fingerprint: string
  /** When the GitHub side of the result was read, in milliseconds */
  remoteAt: number
  /** The checked project, with everything a check needs to run again on a fresh clone */
  result: ProjectResult
}

/** The results of the projects between scans, in memory: a project whose clone did not change and whose GitHub side is recent is not checked again */
export interface ProjectMemory {
  /** The entry of a project, undefined when nothing is remembered */
  entry: (name: string) => MemoryEntry | undefined
  /** Forget a project, for example because it is gone */
  forget: (name: string) => void
  /** Postpone the next look at GitHub for a minute, because its rate limit is too low: the entry stays and says it is paused */
  pause: (entry: Readonly<MemoryEntry>) => MemoryEntry
  /** Tell if the GitHub side of an entry is older than the time to live */
  isStale: (entry: Readonly<MemoryEntry>) => boolean
  /** Fingerprint the clone of a project, and give back the remembered result when it is still good. `shouldReuse` false only fingerprints, for a scan the user asked to be fresh */
  recall: (project: Readonly<Project>, shouldReuse: boolean) => Promise<{ fingerprint: string; hit: ProjectResult | undefined }>
  /** Remember the result of a project, with the fingerprint taken before it was checked and, when only the local side was checked again, the entry whose GitHub side is kept */
  remember: (result: Readonly<ProjectResult>, fingerprint: string, kept?: Readonly<Pick<MemoryEntry, 'isPaused' | 'remoteAt'>>) => void
}

/**
 * Fingerprint the clone of a project
 * @param local the clone, undefined for a project that is not cloned
 * @returns the fingerprint, empty without clone
 */
export function fingerprintClone(local: Readonly<Pick<LocalClone, 'path'>> | undefined) {
  return local === undefined ? Promise.resolve('') : fingerprintFolder(local.path)
}

/**
 * Create the memory of a server
 * @param now gives the current time in milliseconds, replaced in tests
 * @returns the memory
 * @example const memory = createProjectMemory()
 */
export function createProjectMemory(now: () => number = Date.now): ProjectMemory {
  const entries = new Map<string, MemoryEntry>()
  const isStale = (entry: Readonly<MemoryEntry>) => now() - entry.remoteAt >= remoteTtlMs
  return {
    entry: name => entries.get(name),
    forget: name => void entries.delete(name),
    isStale,
    pause(entry) {
      const paused = { ...entry, isPaused: true, remoteAt: now() - remoteTtlMs + pauseMs }
      entries.set(entry.result.project.name, paused)
      return paused
    },
    async recall(project, shouldReuse) {
      const fingerprint = await fingerprintClone(project.local)
      const entry = entries.get(project.name)
      const isGood = shouldReuse && entry !== undefined && entry.fingerprint === fingerprint && !isStale(entry)
      return { fingerprint, hit: isGood ? entry.result : undefined }
    },
    remember(result, fingerprint, kept) {
      entries.set(result.project.name, { fingerprint, ...(kept ?? { isPaused: false, remoteAt: now() }), result })
    },
  }
}
