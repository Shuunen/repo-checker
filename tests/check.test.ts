import { strictEqual as equal } from 'assert'
import { ensureFile, remove } from 'fs-extra'
import { check, report } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { join } from '../src/utils'

const folder = join(__dirname, 'checkFolder')

describe('check', function () {
  it('repo-checker folder fails with low max size', async function () {
    const message = await check(repoCheckerPath, new ProjectData({ max_size_ko: 2, npm_package: true, quiet: true })).catch(() => 'failed')
    equal(message, 'failed')
  })
  it('repo-checker folder succeed with acceptable max size', async function () {
    const { nbPassed, nbFailed } = await check(repoCheckerPath, new ProjectData({ max_size_ko: 120, npm_package: true, quiet: true }))
    equal(nbPassed >= 20, true)
    equal(nbFailed, 0)
  })
  it('check & fix test folder', async function () {
    const gitConfig = join(folder, '.git', 'config')
    await ensureFile(gitConfig)
    const data = new ProjectData({ quiet: true })
    let status = await check(folder, data, true).catch(() => 'failed')
    if (typeof status === 'string') return
    equal(status.nbFailed, 0)
    status = await check(folder, data, true, true).catch(() => 'failed')
    if (typeof status === 'string') return
    equal(status.nbFailed, 0)
  })
  after(function () {
    remove(folder).catch(error => console.error(error))
  })
  it('report does nothing by default', function () {
    report()
  })
})
