import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildWorld } from './build-world.mjs'

/** The demo must keep working: its fake gh answers what the scan asks, and its projects show every kind of finding */
describe('demo', () => {
  it('builds projects whose scan finds every kind of project the dashboard knows', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'repo-check-demo-test-'))
    onTestFinished(() => rmSync(root, { force: true, recursive: true }))
    const projects = buildWorld(root)
    const bin = path.join(import.meta.dirname, '..', 'src', 'server', 'bin.ts')
    const env = { ...process.env, HOME: root, PATH: `${import.meta.dirname}${path.delimiter}${process.env.PATH}` }
    const { stdout, stderr } = spawnSync(process.execPath, [bin, `--target=${projects}`, '--no-fetch'], { encoding: 'utf8', env })
    expect(stderr).toContain('checking 11 projects')
    for (const id of ['archived-with-unsaved-work', 'archived-clone', 'behind-remote', 'uncommitted-files', 'forgotten-stash', 'not-on-default-branch', 'not-cloned', 'broken-clone', 'pristine-fork']) expect(stdout).toContain(id)
    expect(stdout).toMatch(/fork-with-work\s+pristine-fork\s+a fork of upstream\/fork-with-work with work to keep/u)
  }, 60_000)
})
