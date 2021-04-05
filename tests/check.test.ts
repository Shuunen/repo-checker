import { strictEqual as equal } from 'assert'
import { ensureFile, remove } from 'fs-extra'
import { join } from 'path'
import { check, report } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'

describe('check', () => {
  it('repo-checker folder fails with low max size', async () => {
    const message = await check(repoCheckerPath, new ProjectData({ max_size_ko: 2, npm_package: true, quiet: true })).catch(() => 'failed')
    equal(message, 'failed')
  })
  it('repo-checker folder succeed with acceptable max size', async () => {
    const { nbPassed, nbFailed } = await check(repoCheckerPath, new ProjectData({ max_size_ko: 120, npm_package: true, quiet: true }))
    equal(nbPassed >= 20, true)
    equal(nbFailed, 0)
  })
  it('check & fix test folder', async () => {
    const folder = join(__dirname, 'checkFolder')
    const gitConfig = join(folder, '.git', 'config')
    await ensureFile(gitConfig)
    const data = new ProjectData({ quiet: true })
    let status = await check(folder, data, true).catch(() => 'failed')
    if (typeof status === 'string') return
    equal(status.nbFailed, 0)
    status = await check(folder, data, true, true).catch(() => 'failed')
    if (typeof status === 'string') return
    equal(status.nbFailed, 0)
    remove(folder).catch(error => console.error(error))
  })
  it('report does nothing by default', () => {
    report()
  })
})
