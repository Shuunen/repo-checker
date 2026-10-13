import type { RuleOutcome, Severity } from '../shared/scan-event.ts'
import type { Finding } from './engine/define-rule.ts'
import { formatReport } from './report.ts'
import type { ProjectResult } from './check-projects.ts'

const options = { durationMs: 1234, hasColors: false, isVerbose: false, owner: 'owner', target: '/projects' }

/**
 * Build a finding
 * @param ruleId the rule id
 * @param severity the severity
 * @returns the finding
 */
function finding(ruleId: string, severity: Severity): Finding {
  return { actions: [], edits: [], message: `${ruleId} message`, messageId: 'found', ruleId, scope: 'file', severity }
}

/**
 * Build a project result, each finding's rule failed, the other outcomes are given
 * @param name the project name
 * @param findings the findings
 * @param outcomes the outcomes of the rules that reported nothing
 * @returns the result
 */
function result(name: string, findings: readonly Finding[], outcomes: readonly RuleOutcome[] = []): ProjectResult {
  const failed = findings.map(item => ({ ruleId: item.ruleId, status: 'failed' as const }))
  return { findings: [...findings], outcomes: [...failed, ...outcomes], project: { github: undefined, isOtherOwner: false, local: undefined, name } }
}

const passed = (ruleId: string): RuleOutcome => ({ ruleId, status: 'passed' })
const skipped = (ruleId: string): RuleOutcome => ({ ruleId, status: 'skipped' })

describe('report', () => {
  it('groups the findings by severity, most important first, in aligned columns, then sums up', () => {
    expect.hasAssertions()
    const jozzo = result('jozzo', [finding('archived-clone', 'info'), finding('broken-clone', 'error')], [passed('not-cloned')])
    const { hasErrors, text } = formatReport([jozzo, result('finga', [finding('not-cloned', 'info')], [skipped('broken-clone')])], options)
    expect(hasErrors).toBe(true)
    expect(text.split('\n')).toStrictEqual([
      'repo-check · /projects · owner · 2 projects in 1.2s',
      '',
      '🔴 errors (1)',
      '  jozzo  broken-clone  broken-clone message',
      '',
      '🔵 info (2)',
      '  jozzo  archived-clone  archived-clone message',
      '  finga  not-cloned      not-cloned message',
      '',
      '4 checks run, 1 skipped · 1 error · 0 warnings · 2 info',
      'Run repo-check ui to fix them.',
    ])
  })

  it('says all is well after the summary, and is not an error', () => {
    expect.hasAssertions()
    const app = result('app', [], [passed('package-name'), skipped('publish-main-field')])
    expect(formatReport([app], options)).toStrictEqual({ hasErrors: false, text: 'repo-check · /projects · owner · 1 project in 1.2s\n\n1 check run, 1 skipped · 0 errors · 0 warnings · 0 info\n✔ all good' })
  })

  it('lists every passed and skipped check when verbose', () => {
    expect.hasAssertions()
    const app = result('app', [], [passed('package-name'), skipped('publish-main-field')])
    const lib = result('lib-long-name', [], [passed('package-name')])
    const lines = formatReport([app, lib], { ...options, isVerbose: true }).text.split('\n')
    expect(lines.slice(1, -3)).toStrictEqual(['', '✔ passed (2)', '  app            package-name', '  lib-long-name  package-name', '', '– skipped (1)', '  app  publish-main-field'])
  })

  it('shows no empty verbose section', () => {
    expect.hasAssertions()
    const app = result('app', [finding('package-files', 'warning')])
    expect(formatReport([app], { ...options, isVerbose: true }).text).not.toContain('passed (')
  })

  it('is not an error with warnings only', () => {
    expect.hasAssertions()
    const app = result('app', [finding('package-files', 'warning')])
    expect(formatReport([app], options).hasErrors).toBe(false)
  })

  it('colors the output for a terminal', () => {
    expect.hasAssertions()
    const app = result('app', [finding('broken-clone', 'error')], [passed('package-name'), skipped('publish-main-field')])
    const { text } = formatReport([app], { ...options, hasColors: true, isVerbose: true })
    expect(text).toContain('\u001B[31m🔴 errors (1)')
    expect(text).toContain('\u001B[32m✔ passed (1)')
  })
})
