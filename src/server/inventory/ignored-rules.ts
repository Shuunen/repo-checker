import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { Result } from 'shuutils'

/** How long an ignored rule stays ignored, in milliseconds: 24 hours */
const ignoreMs = 86_400_000

/** How many spaces indent the file on disk */
const indent = 2

/** When each ignored rule stops being ignored, in milliseconds since the epoch, per project name then rule id. This is the content of the file on disk */
type Expiries = Record<string, Record<string, number>>

/** The rules the user ignored for a while, one project at a time */
export interface IgnoredRules {
  /** Ignore a rule on a project for 24 hours, resolves once it is saved on disk */
  ignore: (project: string, ruleId: string) => Promise<void>
  /** Tell if a rule is ignored on a project right now */
  isIgnored: (project: string, ruleId: string) => boolean
}

/** Ignores nothing and saves nothing, the default where no ignore is wanted */
export const neverIgnored: IgnoredRules = { ignore: () => Promise.resolve(), isIgnored: () => false }

/**
 * Where the ignored rules are saved: in the state folder of the user, so they survive a crash and a restart
 * @param env the environment variables, `XDG_STATE_HOME` moves the folder
 * @param home the home folder of the user
 * @returns the path of the file
 * @example ignoredRulesFile({}, '/home/me') // '/home/me/.local/state/repo-checker/ignored-rules.json'
 */
export function ignoredRulesFile(env: Readonly<Record<string, string | undefined>> = process.env, home = homedir()) {
  const state = env.XDG_STATE_HOME === undefined || env.XDG_STATE_HOME === '' ? path.join(home, '.local', 'state') : env.XDG_STATE_HOME
  return path.join(state, 'repo-checker', 'ignored-rules.json')
}

/**
 * Keep the entries that are still ignored
 * @param expiries every entry
 * @param at the current time in milliseconds
 * @returns the entries that expire after `at`
 */
function stillIgnored(expiries: Readonly<Expiries>, at: number) {
  const kept: Expiries = {}
  for (const [project, rules] of Object.entries(expiries)) {
    const live = Object.entries(rules).filter(([, until]) => until > at)
    if (live.length > 0) kept[project] = Object.fromEntries(live)
  }
  return kept
}

/**
 * Read the file, an unreadable or broken file is the same as no file: nothing is ignored
 * @param file the path of the file
 * @returns the entries it holds
 */
async function readExpiries(file: string) {
  const read = await Result.trySafe(
    (async () => {
      const data: unknown = JSON.parse(await readFile(file, 'utf8'))
      return typeof data === 'object' && data !== null ? (data as Expiries) : {}
    })(),
  )
  return read.ok ? read.value : {}
}

/**
 * Open the ignored rules saved on disk. Every change is written at once, to a temporary file that replaces the real one, so a crash never leaves a half written file
 * @param file the path of the file, see `ignoredRulesFile`
 * @param now gives the current time in milliseconds, replaced in tests
 * @returns the ignored rules
 * @example const ignored = await createIgnoredRules(ignoredRulesFile())
 */
export async function createIgnoredRules(file: string, now: () => number = Date.now): Promise<IgnoredRules> {
  let expiries = stillIgnored(await readExpiries(file), now())
  let saving = Promise.resolve()
  const save = (content: string) => {
    saving = (async () => {
      await saving
      await mkdir(path.dirname(file), { recursive: true })
      const temporary = `${file}.tmp`
      await writeFile(temporary, content)
      await rename(temporary, file)
    })()
    return saving
  }
  return {
    ignore(project, ruleId) {
      expiries = stillIgnored({ ...expiries, [project]: { ...expiries[project], [ruleId]: now() + ignoreMs } }, now())
      return save(`${JSON.stringify(expiries, undefined, indent)}\n`)
    },
    isIgnored: (project, ruleId) => (expiries[project]?.[ruleId] ?? 0) > now(),
  }
}
