/**
 * Test a rule ESLint RuleTester style: a list of valid cases that must report nothing, and invalid cases with the expected message ids and fixed package.json.
 * Cases run on in-memory files, never on the disk.
 * @module
 */
import type { ActionKind } from '../../shared/action.ts'
import type { GithubRepo, LocalClone, Project } from '../../shared/project.ts'
import { buildContext } from './context.ts'
import type { ProjectRule } from './define-project-rule.ts'
import type { Rule } from './define-rule.ts'
import type { ProjectFlags } from './flags.ts'
import { memoryIo } from './io.ts'
import type { PackageJson } from './package-json.ts'
import { checkProject, checkProjectRules, fixProject } from './runner.ts'

/** The json indent of the fake package.json, the most common one */
const indent = 2

/** A fake project on which the rule must report nothing */
interface ValidCase {
  /** Other files of the fake project, by path */
  files?: Record<string, string>
  /** The project flags */
  flags?: ProjectFlags
  /** The test name, shown as `valid: <name>` or `invalid: <name>` */
  name: string
  /** Written as package.json with a two spaces indent, leave it out for a project without package.json */
  pkg?: PackageJson
}

/** A fake project on which the rule must report the given errors */
interface InvalidCase extends ValidCase {
  /** The expected message ids, in report order */
  errors: string[]
  /** The package.json expected after every fix is applied, leave it out when the rule cannot fix. When set, nothing must be reported after the fix */
  output?: PackageJson
}

/**
 * Serialize a package.json like most projects do: two spaces indent and a final new line
 * @param pkg the package.json content
 * @returns the text
 */
export function toJsonText(pkg: Readonly<PackageJson>) {
  return `${JSON.stringify(pkg, undefined, indent)}\n`
}

/**
 * Build the fake files of a case
 * @param testCase the case
 * @param testCase.files the other files
 * @param testCase.pkg the package.json content
 * @returns the files by path
 */
function toFiles({ files = {}, pkg }: Readonly<ValidCase>) {
  return pkg === undefined ? { ...files } : { ...files, 'package.json': toJsonText(pkg) }
}

/**
 * Check a valid case
 * @param rule the rule
 * @param testCase the case
 * @returns the findings, expected to be empty
 */
async function checkValid(rule: Readonly<Rule>, testCase: Readonly<ValidCase>) {
  const context = await buildContext(memoryIo(toFiles(testCase)), testCase.flags)
  return await checkProject([rule], context)
}

/**
 * Check an invalid case, then fix it and check again
 * @param rule the rule
 * @param testCase the case
 * @returns the reported message ids, the fixed files and the count of findings left, to compare with `expectedInvalid`
 */
async function runInvalid(rule: Readonly<Rule>, testCase: Readonly<InvalidCase>) {
  const io = memoryIo(toFiles(testCase))
  const findings = await checkProject([rule], await buildContext(io, testCase.flags))
  const fixed = await fixProject({ confirm: () => Promise.resolve(true), flags: testCase.flags, io, rules: [rule] })
  return { errors: findings.map(finding => finding.messageId), outputs: fixed.applied.map(plan => plan.after), remaining: fixed.findings.length }
}

/**
 * What `runInvalid` should give: the errors, the fixed package.json and nothing left once fixed, or no fix and every error left
 * @param testCase the case
 * @param testCase.errors the expected message ids
 * @param testCase.output the expected package.json once fixed
 * @returns the expected result
 */
function expectedInvalid({ errors, output }: Readonly<InvalidCase>) {
  return { errors, outputs: output === undefined ? [] : [toJsonText(output)], remaining: output === undefined ? errors.length : 0 }
}

/**
 * Run a rule on valid and invalid cases, ESLint RuleTester style. Call it at the top level of a test file, it creates one `describe` named after the rule id
 * @param rule the rule to test
 * @param cases the cases
 * @param cases.valid cases that must report nothing
 * @param cases.invalid cases that must report the given errors, and give the output once fixed
 * @example
 * testRule(scriptsNoNpmRun, {
 *   invalid: [{ errors: ['found'], name: 'one script', output: { scripts: { check: 'pnpm lint' } }, pkg: { scripts: { check: 'npm run lint' } } }],
 *   valid: [{ name: 'pnpm scripts', pkg: { scripts: { check: 'pnpm lint' } } }],
 * })
 */
export function testRule(rule: Readonly<Rule>, { invalid, valid }: Readonly<{ invalid: readonly InvalidCase[]; valid: readonly ValidCase[] }>) {
  describe(rule.meta.id, () => {
    it.each(valid)('valid: $name', async testCase => {
      expect.hasAssertions()
      await expect(checkValid(rule, testCase)).resolves.toStrictEqual([])
    })
    it.each(invalid)('invalid: $name', async testCase => {
      expect.hasAssertions()
      await expect(runInvalid(rule, testCase)).resolves.toStrictEqual(expectedInvalid(testCase))
    })
  })
}

/** A fake project for a project rule: only what differs from a clean clone and a plain public repo */
interface ProjectCase {
  /** The GitHub repo fields to change, leave it out for a project that is not on GitHub */
  github?: Partial<GithubRepo>
  /** True when the clone belongs to another owner */
  isOtherOwner?: boolean
  /** The local clone fields to change, leave it out for a project that is not cloned */
  local?: Partial<LocalClone>
  /** The test name */
  name: string
}

/** A fake project on which the project rule must report the given errors */
interface InvalidProjectCase extends ProjectCase {
  /** The actions expected on each finding, in order, no action at all when left out */
  actions?: ActionKind[][]
  /** The expected message ids, in report order */
  errors: string[]
}

/**
 * Build the project of a case, from a clean clone of `owner/app` and its plain public repo
 * @param testCase the case
 * @returns the project
 */
function toProject(testCase: Readonly<ProjectCase>): Project {
  const local: LocalClone = { branches: [], changedFiles: [], currentBranch: 'master', fetchFailed: false, folderName: 'app', localOnlyBranches: [], origin: 'git@github.com:owner/app.git', path: '/projects/app', problem: undefined, slug: 'owner/app', stashes: [], unpushed: [], ...testCase.local }
  const github: GithubRepo = { forkStatus: undefined, isArchived: false, isFork: false, isPrivate: false, name: 'app', owner: 'owner', pushedAt: '2026-01-01T00:00:00Z', slug: 'owner/app', ...testCase.github }
  return { github: testCase.github === undefined ? undefined : github, isOtherOwner: testCase.isOtherOwner ?? false, local: testCase.local === undefined ? undefined : local, name: 'app' }
}

/**
 * Check a project case
 * @param rule the project rule
 * @param testCase the case
 * @returns the reported message ids and actions
 */
async function runProjectCase(rule: Readonly<ProjectRule>, testCase: Readonly<ProjectCase>) {
  const findings = await checkProjectRules([rule], toProject(testCase))
  return { actions: findings.map(finding => finding.actions), errors: findings.map(finding => finding.messageId) }
}

/**
 * What `runProjectCase` should give for an invalid case: its errors, and its actions or none
 * @param testCase the case
 * @param testCase.actions the expected actions per finding
 * @param testCase.errors the expected message ids
 * @returns the expected result
 */
function expectedProjectCase({ actions, errors }: Readonly<InvalidProjectCase>) {
  return { actions: actions ?? errors.map(() => []), errors }
}

/**
 * Run a project rule on valid and invalid projects, ESLint RuleTester style. Call it at the top level of a test file
 * @param rule the project rule to test
 * @param cases the cases
 * @param cases.valid projects on which the rule must report nothing
 * @param cases.invalid projects on which the rule must report the given errors and actions
 * @example
 * testProjectRule(notCloned, {
 *   invalid: [{ actions: [['clone']], errors: ['missing'], github: {}, name: 'on GitHub only' }],
 *   valid: [{ github: {}, local: {}, name: 'cloned' }],
 * })
 */
export function testProjectRule(rule: Readonly<ProjectRule>, { invalid, valid }: Readonly<{ invalid: readonly InvalidProjectCase[]; valid: readonly ProjectCase[] }>) {
  describe(rule.meta.id, () => {
    it.each(valid)('valid: $name', async testCase => {
      expect.hasAssertions()
      await expect(runProjectCase(rule, testCase)).resolves.toStrictEqual({ actions: [], errors: [] })
    })
    it.each(invalid)('invalid: $name', async testCase => {
      expect.hasAssertions()
      await expect(runProjectCase(rule, testCase)).resolves.toStrictEqual(expectedProjectCase(testCase))
    })
  })
}
