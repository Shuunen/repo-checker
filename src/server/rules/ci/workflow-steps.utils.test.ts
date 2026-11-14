import { appendRunStep, editStep, moveStepBefore, setStepOption } from './workflow-steps.utils.ts'

const steps = ['jobs:', '  ci:', '    steps:', '      - uses: actions/setup-node@v7', '        with:', '          node-version: 26', '', '      - uses: pnpm/action-setup@v6', '', '  other:', '    steps:', '      - run: echo']
const text = `${steps.join('\n')}\n`

describe(setStepOption, () => {
  it('adds the option after the others of the with block', () => {
    expect.hasAssertions()
    expect(setStepOption(text, 'actions/setup-node', { key: 'cache', value: 'pnpm' })).toBe(text.replace('node-version: 26\n', 'node-version: 26\n          cache: pnpm\n'))
  })

  it('creates the with block of a step that has none', () => {
    expect.hasAssertions()
    expect(setStepOption(text, 'pnpm/action-setup', { key: 'run_install', value: 'false' })).toBe(text.replace('action-setup@v6\n', 'action-setup@v6\n        with:\n          run_install: false\n'))
  })

  it('replaces the value of an option that is there', () => {
    expect.hasAssertions()
    expect(setStepOption(text, 'actions/setup-node', { key: 'node-version', value: '24' })).toBe(text.replace('node-version: 26', 'node-version: 24'))
  })

  it('fills an empty with block', () => {
    expect.hasAssertions()
    expect(setStepOption('    steps:\n      - uses: a/b@v1\n        with:\n', 'a/b', { key: 'key', value: 'value' })).toBe('    steps:\n      - uses: a/b@v1\n        with:\n          key: value\n')
  })

  it('leaves a workflow that has no step with this action as it is', () => {
    expect.hasAssertions()
    expect(setStepOption(text, 'oven-sh/setup-bun', { key: 'a', value: 'b' })).toBe(text)
    expect(setStepOption('jobs: {}\n', 'a/b', { key: 'a', value: 'b' })).toBe('jobs: {}\n')
  })
})

describe(editStep, () => {
  it('only changes the first list of steps and keeps what follows', () => {
    expect.hasAssertions()
    expect(editStep(text, 'actions/setup-node', step => [...step, '        # a comment'])).toContain('node-version: 26\n        # a comment\n\n      - uses: pnpm/action-setup@v6\n\n  other:\n    steps:\n      - run: echo\n')
  })
})

describe(moveStepBefore, () => {
  it('moves a step before another and keeps the blank lines between the steps', () => {
    expect.hasAssertions()
    expect(moveStepBefore(text, 'pnpm/action-setup', 'actions/setup-node')).toBe(
      ['jobs:', '  ci:', '    steps:', '      - uses: pnpm/action-setup@v6', '', '      - uses: actions/setup-node@v7', '        with:', '          node-version: 26', '', '  other:', '    steps:', '      - run: echo', ''].join('\n'),
    )
  })

  it('leaves a step that is before already, a missing step, and a workflow without steps', () => {
    expect.hasAssertions()
    expect(moveStepBefore(text, 'actions/setup-node', 'pnpm/action-setup')).toBe(text)
    expect(moveStepBefore(text, 'oven-sh/setup-bun', 'pnpm/action-setup')).toBe(text)
    expect(moveStepBefore(text, 'pnpm/action-setup', 'oven-sh/setup-bun')).toBe(text)
    expect(moveStepBefore('jobs: {}\n', 'a/b', 'c/d')).toBe('jobs: {}\n')
  })
})

describe(appendRunStep, () => {
  it('adds a step at the end of the steps with their indentation', () => {
    expect.hasAssertions()
    expect(appendRunStep('jobs:\n  ci:\n    steps:\n      - run: a\n', 'Run check', 'pnpm run check')).toBe('jobs:\n  ci:\n    steps:\n      - run: a\n      - name: Run check\n        run: pnpm run check\n')
  })

  it('leaves a workflow without steps as it is', () => {
    expect.hasAssertions()
    expect(appendRunStep('jobs: {}\n', 'Run check', 'pnpm run check')).toBe('jobs: {}\n')
  })
})
