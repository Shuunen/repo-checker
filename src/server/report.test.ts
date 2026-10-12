import type { Finding, Severity } from './engine/define-rule.ts'
import { formatReport } from './report.ts'
import type { ProjectResult } from './scan.ts'

const options = { durationMs: 1234, hasColors: false, owner: 'owner', target: '/projects' }

/**
 * Build a finding
 * @param ruleId the rule id
 * @param severity the severity
 * @returns the finding
 */
function finding(ruleId: string, severity: Severity): Finding {
  return { actions: [], edits: [], message: `${ruleId} message`, messageId: 'found', ruleId, severity }
}

/**
 * Build a project result
 * @param name the project name
 * @param findings the findings
 * @returns the result
 */
function result(name: string, findings: readonly Finding[]): ProjectResult {
  return { findings: [...findings], project: { github: undefined, isOtherOwner: false, local: undefined, name } }
}

describe('report', () => {
  it('groups the findings by severity, most important first, in aligned columns', () => {
    expect.hasAssertions()
    const jozzo = result('jozzo', [finding('archived-clone', 'info'), finding('broken-clone', 'error')])
    const { hasErrors, text } = formatReport([jozzo, result('finga', [finding('not-cloned', 'info')])], options)
    expect(hasErrors).toBe(true)
    expect(text).toBe(
      ['repo-check · /projects · owner · 2 projects in 1.2s', '', '🔴 errors (1)', '  jozzo  broken-clone  broken-clone message', '', '🔵 info (2)', '  jozzo  archived-clone  archived-clone message', '  finga  not-cloned      not-cloned message', '', 'Run repo-check ui to fix them.'].join('\n'),
    )
  })

  it('says all is well in one line, and is not an error', () => {
    expect.hasAssertions()
    expect(formatReport([result('app', [])], options)).toStrictEqual({ hasErrors: false, text: 'repo-check · /projects · owner · 1 project in 1.2s\n✔ all good' })
  })

  it('is not an error with warnings only', () => {
    expect.hasAssertions()
    const app = result('app', [finding('package-files', 'warning')])
    expect(formatReport([app], options).hasErrors).toBe(false)
  })

  it('colors the output for a terminal', () => {
    expect.hasAssertions()
    const app = result('app', [finding('broken-clone', 'error')])
    expect(formatReport([app], { ...options, hasColors: true }).text).toContain('\u001B[31m🔴 errors (1)')
  })
})
