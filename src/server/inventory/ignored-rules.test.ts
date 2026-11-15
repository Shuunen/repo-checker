import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createIgnoredRules, ignoredRulesFile, neverIgnored } from './ignored-rules.ts'

/** 24 hours in milliseconds */
const ignoreMs = 86_400_000

/**
 * Run a test with a file in a folder that is removed after it
 * @param run the test
 */
async function inFolder(run: (file: string) => Promise<void>) {
  const folder = await mkdtemp(path.join(tmpdir(), 'ignored-rules-'))
  try {
    await run(path.join(folder, 'nested', 'ignored-rules.json'))
  } finally {
    await rm(folder, { force: true, recursive: true })
  }
}

describe(ignoredRulesFile, () => {
  it('lives in the state folder of the user', () => {
    expect.hasAssertions()
    const expected = path.join('/home/me', '.local', 'state', 'repo-checker', 'ignored-rules.json')
    expect(ignoredRulesFile({}, '/home/me')).toBe(expected)
    expect(ignoredRulesFile({ XDG_STATE_HOME: '' }, '/home/me')).toBe(expected)
  })

  it('follows XDG_STATE_HOME', () => {
    expect.hasAssertions()
    expect(ignoredRulesFile({ XDG_STATE_HOME: '/state' }, '/home/me')).toBe(path.join('/state', 'repo-checker', 'ignored-rules.json'))
  })

  it('reads the real environment and home by default', () => {
    expect.hasAssertions()
    expect(ignoredRulesFile()).toContain('ignored-rules.json')
  })
})

describe('never ignoring', () => {
  it('ignores nothing and saves nothing', async () => {
    expect.hasAssertions()
    await expect(neverIgnored.ignore('finga', 'deploy-down')).resolves.toBeUndefined()
    expect(neverIgnored.isIgnored('finga', 'deploy-down')).toBe(false)
  })
})

describe(createIgnoredRules, () => {
  const start = 1_000_000

  it('ignores a rule of one project for 24 hours', () => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      let time = start
      const ignored = await createIgnoredRules(file, () => time)
      await ignored.ignore('finga', 'deploy-down')
      expect(ignored.isIgnored('finga', 'deploy-down')).toBe(true)
      expect(ignored.isIgnored('finga', 'other-rule')).toBe(false)
      expect(ignored.isIgnored('jozzo', 'deploy-down')).toBe(false)
      time += ignoreMs - 1
      expect(ignored.isIgnored('finga', 'deploy-down')).toBe(true)
      time += 1
      expect(ignored.isIgnored('finga', 'deploy-down')).toBe(false)
    })
  })

  it('survives a restart: a new instance reads what the first one saved', () => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      const first = await createIgnoredRules(file, () => start)
      await first.ignore('finga', 'deploy-down')
      const restarted = await createIgnoredRules(file, () => start + 1000)
      expect(restarted.isIgnored('finga', 'deploy-down')).toBe(true)
      expect(JSON.parse(await readFile(file, 'utf8'))).toStrictEqual({ finga: { 'deploy-down': start + ignoreMs } })
    })
  })

  it('forgets the expired entries when it saves', () => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      let time = start
      const ignored = await createIgnoredRules(file, () => time)
      await ignored.ignore('finga', 'old-rule')
      time += ignoreMs + 1
      await ignored.ignore('jozzo', 'new-rule')
      expect(JSON.parse(await readFile(file, 'utf8'))).toStrictEqual({ jozzo: { 'new-rule': time + ignoreMs } })
    })
  })

  it('keeps several rules of the same project', () => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      const ignored = await createIgnoredRules(file, () => start)
      await Promise.all([ignored.ignore('finga', 'a-rule'), ignored.ignore('finga', 'b-rule')])
      expect(JSON.parse(await readFile(file, 'utf8'))).toStrictEqual({ finga: { 'a-rule': start + ignoreMs, 'b-rule': start + ignoreMs } })
    })
  })

  it.each(['{ broken', 'null', ''])('starts with nothing ignored when the file holds %j', content => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      const first = await createIgnoredRules(file, () => start)
      await first.ignore('x', 'y-rule')
      await writeFile(file, content)
      const ignored = await createIgnoredRules(file, () => start)
      expect(ignored.isIgnored('x', 'y-rule')).toBe(false)
    })
  })

  it('starts with nothing ignored without a file, and uses the clock by default', () => {
    expect.hasAssertions()
    return inFolder(async file => {
      expect.hasAssertions()
      const ignored = await createIgnoredRules(file)
      expect(ignored.isIgnored('finga', 'deploy-down')).toBe(false)
      await ignored.ignore('finga', 'deploy-down')
      expect(ignored.isIgnored('finga', 'deploy-down')).toBe(true)
    })
  })
})
