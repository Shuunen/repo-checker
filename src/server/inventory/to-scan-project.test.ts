import type { Project } from '../../shared/project.ts'
import type { ProjectResult } from './check-projects.ts'
import type { IgnoredRules } from './ignored-rules.ts'
import { toScanProject } from './to-scan-project.ts'

const project: Project = { github: undefined, isOtherOwner: false, local: undefined, name: 'finga' }
const result: ProjectResult = {
  findings: [
    { actions: [], edits: [{ file: 'a.json' } as never, { file: 'a.json' } as never], installs: [], message: 'down', messageId: 'error', ruleId: 'deploy-down', scope: 'file', severity: 'error' },
    { actions: [], edits: [], installs: [], message: 'old', messageId: 'old', ruleId: 'stale', scope: 'project', severity: 'info' },
  ],
  outcomes: [
    { ruleId: 'deploy-down', status: 'failed' },
    { ruleId: 'stale', status: 'failed' },
  ],
  project,
}

describe(toScanProject, () => {
  it('keeps the files of the fixes and every finding by default', () => {
    expect.hasAssertions()
    const scanned = toScanProject(result)
    expect(scanned.findings.map(finding => finding.ruleId)).toStrictEqual(['deploy-down', 'stale'])
    expect(scanned.findings[0]?.fixFiles).toStrictEqual(['a.json'])
    expect(scanned.outcomes.map(outcome => outcome.status)).toStrictEqual(['failed', 'failed'])
  })

  it('leaves out an ignored rule and skips its outcome', () => {
    expect.hasAssertions()
    const ignoredKeys = new Set(['finga/deploy-down'])
    const ignored: IgnoredRules = { ignore: () => Promise.resolve(), isIgnored: (name, ruleId) => ignoredKeys.has(`${name}/${ruleId}`) }
    const scanned = toScanProject(result, ignored)
    expect(scanned.findings.map(finding => finding.ruleId)).toStrictEqual(['stale'])
    expect(scanned.outcomes).toStrictEqual([
      { ruleId: 'deploy-down', status: 'skipped' },
      { ruleId: 'stale', status: 'failed' },
    ])
  })
})
