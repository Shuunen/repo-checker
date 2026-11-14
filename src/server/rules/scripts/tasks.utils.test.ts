import { endTask, parseTask, taskScript } from './tasks.utils.ts'

describe(parseTask, () => {
  it('splits the command from the echo and the hint', () => {
    expect.hasAssertions()
    expect(parseTask('oxfmt --check && echo lint:format completed successfully || (echo Please run pnpm run lint:format:fix && exit 1)')).toStrictEqual({ command: 'oxfmt --check', hint: 'Please run pnpm run lint:format:fix' })
  })

  it('has no hint without one', () => {
    expect.hasAssertions()
    expect(parseTask('knip && echo lint:knip completed successfully')).toStrictEqual({ command: 'knip', hint: undefined })
  })

  it('keeps a script without echo as the command', () => {
    expect.hasAssertions()
    expect(parseTask('vitest')).toStrictEqual({ command: 'vitest', hint: undefined })
  })

  it('reads an empty script', () => {
    expect.hasAssertions()
    expect(parseTask('')).toStrictEqual({ command: '', hint: undefined })
  })
})

describe(taskScript, () => {
  it('leaves a task that keeps running alone', () => {
    expect.hasAssertions()
    expect(taskScript('test:watch', 'vitest')).toBe('vitest')
  })

  it('ends a task with the echo', () => {
    expect.hasAssertions()
    expect(taskScript('lint:knip', 'knip')).toBe('knip && echo lint:knip completed successfully')
  })

  it('adds the hint that points to the fix task', () => {
    expect.hasAssertions()
    expect(taskScript('lint:issues', 'oxlint')).toBe('oxlint && echo lint:issues completed successfully || (echo Please run pnpm run lint:issues:fix to fix the lint issues && exit 1)')
  })

  it('keeps the hint of a task without fix task', () => {
    expect.hasAssertions()
    expect(taskScript('lint:types', 'tsc', 'Please fix the types')).toBe('tsc && echo lint:types completed successfully || (echo Please fix the types && exit 1)')
  })
})

describe(endTask, () => {
  it('rewrites an old ending', () => {
    expect.hasAssertions()
    expect(endTask('build', 'tsc && echo build success')).toBe('tsc && echo build completed successfully')
  })
})
