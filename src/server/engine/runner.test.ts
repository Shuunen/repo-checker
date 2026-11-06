import { buildContext } from './context.ts'
import { defineRule, formatMessage } from './define-rule.ts'
import { memoryIo } from './io.ts'
import { toJsonText } from './rule-tester.ts'
import type { FixPlan } from '../../shared/action.ts'
import { checkProject, fixProject, planAllFixes, planFixes } from './runner.ts'

const schema = 'https://json.schemastore.org/package'

const nameRule = defineRule({
  check({ pkg, report }) {
    if (pkg?.name === undefined) report({ messageId: 'missing' })
  },
  meta: { id: 'needs-name', messages: { missing: 'no name' }, severity: 'error' },
})

const schemaRule = defineRule({
  check({ pkg, report }) {
    if (pkg?.$schema === undefined) report({ fix: fixer => fixer.json('package.json').set(['$schema'], schema, { isFirst: true }), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'needs-schema', messages: { missing: 'no schema' }, severity: 'warning' },
})

const versionRule = defineRule({
  check({ pkg, report }) {
    if (pkg?.version === undefined) report({ fix: fixer => fixer.json('package.json').set(['version'], '0.0.0'), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'needs-version', messages: { missing: 'no version' }, severity: 'warning' },
})

const brokenRule = defineRule({
  check: ({ report }) => report({ fix: fixer => fixer.json('package.json').remove(['name']), messageId: 'oops' }),
  meta: { id: 'broken', messages: { oops: 'oops' }, severity: 'info' },
})

const renovateRule = defineRule({
  check: ({ report }) => report({ fix: fixer => fixer.json('renovate.json').set(['extends'], ['config:semverAllMonthly']), messageId: 'missing' }),
  meta: { fixable: true, id: 'renovate-config-exists', messages: { missing: 'no renovate.json' }, severity: 'warning' },
})

/**
 * A confirm callback that records its calls
 * @param answer what the user answers
 * @returns the mock
 */
function mockConfirm(answer: boolean) {
  const calls: (readonly FixPlan[])[] = []
  const confirm = (plans: readonly FixPlan[]) => {
    calls.push(plans)
    return Promise.resolve(answer)
  }
  return { calls, confirm }
}

describe('runner', () => {
  it('plans a fix that creates a missing file', async () => {
    expect.hasAssertions()
    const io = memoryIo()
    const { findings } = await checkProject([renovateRule], await buildContext(io))
    await expect(planFixes(findings, io)).resolves.toStrictEqual([{ after: '{\n  "extends": [\n    "config:semverAllMonthly"\n  ]\n}', before: '', file: 'renovate.json' }])
  })

  it('refuses a message id missing from meta.messages', async () => {
    expect.hasAssertions()
    const rule = { ...renovateRule, meta: { ...renovateRule.meta, messages: {} } }
    const context = await buildContext(memoryIo())
    await expect(checkProject([rule as typeof renovateRule], context)).rejects.toThrow('rule renovate-config-exists reported an unknown message id missing')
  })

  it('chains the fixes of several rules on the same file', async () => {
    expect.hasAssertions()
    const io = memoryIo({ 'package.json': toJsonText({ name: 'foo' }) })
    const { findings } = await checkProject([schemaRule, versionRule], await buildContext(io))
    expect(findings.map(finding => finding.ruleId)).toStrictEqual(['needs-schema', 'needs-version'])
    const plans = await planFixes(findings, io)
    expect(plans.map(plan => plan.after)).toStrictEqual([toJsonText({ $schema: schema, name: 'foo', version: '0.0.0' })])
  })

  it('plans the fixes that only apply once other fixes are in', async () => {
    expect.hasAssertions()
    const files = { 'package.json': toJsonText({ name: 'foo' }) }
    const followRule = defineRule({
      appliesTo: ({ pkg }) => pkg?.version !== undefined,
      check({ report }) {
        report({ fix: fixer => fixer.json('package.json').set(['private'], true), messageId: 'missing' })
      },
      meta: { fixable: true, id: 'needs-private', messages: { missing: 'not private' }, severity: 'warning' },
    })
    const { findings, plans } = await planAllFixes([followRule, versionRule], memoryIo(files))
    expect(new Set(findings.map(finding => finding.ruleId))).toStrictEqual(new Set(['needs-version', 'needs-private']))
    expect(plans.map(plan => JSON.parse(plan.after) as unknown)).toStrictEqual([{ name: 'foo', private: true, version: '0.0.0' }])
    expect(files['package.json']).toBe(toJsonText({ name: 'foo' }))
  })

  it('plans nothing when nothing changes', async () => {
    expect.hasAssertions()
    const { plans } = await planAllFixes([schemaRule], memoryIo({ 'package.json': toJsonText({ $schema: schema }) }))
    expect(plans).toStrictEqual([])
  })

  it('stops after a few rounds when fixes never settle', async () => {
    expect.hasAssertions()
    const growRule = defineRule({
      check({ report }) {
        report({ fix: fixer => fixer.text('a.txt', text => `${text}x`), messageId: 'missing' })
      },
      meta: { fixable: true, id: 'grows', messages: { missing: 'grows' }, severity: 'warning' },
    })
    const { plans } = await planAllFixes([growRule], memoryIo())
    expect(plans.map(plan => plan.after)).toStrictEqual(['xxxxx'])
  })

  it('writes nothing when the user does not confirm', async () => {
    expect.hasAssertions()
    const files = { 'package.json': toJsonText({ name: 'foo' }) }
    const { calls, confirm } = mockConfirm(false)
    const result = await fixProject({ confirm, io: memoryIo(files), rules: [schemaRule] })
    expect(calls).toHaveLength(1)
    expect(result.applied).toStrictEqual([])
    expect(files['package.json']).toBe(toJsonText({ name: 'foo' }))
  })

  it('does not ask when there is nothing to fix', async () => {
    expect.hasAssertions()
    const { calls, confirm } = mockConfirm(true)
    const result = await fixProject({ confirm, io: memoryIo({ 'package.json': '{}' }), rules: [nameRule] })
    expect(calls).toStrictEqual([])
    expect(result.findings.map(finding => finding.ruleId)).toStrictEqual(['needs-name'])
  })

  it('re-checks after applying, only unfixable findings are left', async () => {
    expect.hasAssertions()
    const result = await fixProject({ confirm: mockConfirm(true).confirm, io: memoryIo({ 'package.json': '{}' }), rules: [nameRule, schemaRule, versionRule] })
    expect(result.applied).toHaveLength(1)
    expect(result.findings.map(finding => finding.ruleId)).toStrictEqual(['needs-name'])
  })

  it('refuses a fix from a rule that is not fixable', async () => {
    expect.hasAssertions()
    const context = await buildContext(memoryIo())
    await expect(checkProject([brokenRule], context)).rejects.toThrow('rule broken reported a fix but its meta.fixable is not true')
  })
})

describe('message format', () => {
  it('fills the placeholders', () => {
    expect.hasAssertions()
    expect(formatMessage('{{name}} is {{size}}Ko', { name: 'a.js', size: 3 })).toBe('a.js is 3Ko')
  })

  it('keeps unknown placeholders and works without data', () => {
    expect.hasAssertions()
    expect(formatMessage('{{name}} is here')).toBe('{{name}} is here')
  })
})
