import type { ProjectResult } from './check-projects.ts'
import type { SplitRules } from './check-project.ts'
import { fixFiles, previewFixFiles } from './actions/fix-files.ts'
import { type GitReaders, realGit } from './actions/action-options.ts'
import type { GhRunner } from './inventory/github.ts'

/** What fixing the projects needs */
interface FixProjectsOptions {
  /** How the clones are read, the real git when omitted */
  git?: GitReaders
  /** Runs gh, only to read what GitHub says of a repo, a failing gh is not a problem */
  gh: GhRunner
  /** The rules split by flavor, the file rules plan the fixes */
  rules: SplitRules
}

/**
 * Tell if a project has a file fix to apply
 * @param result the project result
 * @param result.findings the findings
 * @param result.project the project
 * @returns true when a finding comes with a file edit and the clone is usable
 */
function hasFileFix({ findings, project }: Readonly<ProjectResult>) {
  return project.local?.problem === undefined && project.local?.slug !== undefined && findings.some(finding => finding.edits.length > 0)
}

/**
 * Apply the file fixes of every project that has some, the same fixes the ui applies after a confirmation: a file with uncommitted changes gets the fix merged into those changes. Nothing is committed, `git diff` shows what changed. A project that cannot be fixed gives a line saying why and the others go on
 * @param results the project results of a scan
 * @param options what fixing needs
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.rules the rules split by flavor
 * @returns one line per project that had a fix to apply
 * @example const lines = await fixProjects(projects, { gh: ghCli, rules: splitRules(rules) })
 */
export async function fixProjects(results: readonly ProjectResult[], { gh, git = realGit, rules }: Readonly<FixProjectsOptions>) {
  const lines: string[] = []
  for (const result of results.filter(item => hasFileFix(item))) {
    const { project } = result
    const slug = String(project.local?.slug)
    const [owner = '', name = ''] = slug.split('/')
    const options = { gh, git, name, owner, rules, target: String(project.local?.path) }
    // oxlint-disable-next-line no-await-in-loop -- one project after the other, the installs and the output stay in order
    const preview = await previewFixFiles(options)
    // oxlint-disable-next-line no-await-in-loop -- needs the preview
    const done = preview.ok ? await fixFiles({ ...options, fingerprint: preview.fingerprint }) : preview
    lines.push(`${project.name}: ${done.ok ? done.message : `not fixed, ${done.reason}`}`)
  }
  return lines
}
