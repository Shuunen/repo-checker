import { strictEqual as equal } from 'assert'
import { test } from 'uvu'
import { check, report } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'

test('repo-checker folder fails with low max size', async function () {
  const message = await check(repoCheckerPath, new ProjectData({ max_size_ko: 2, npm_package: true, quiet: true })).catch(() => 'failed')
  equal(message, 'failed')
})

test('repo-checker folder succeed with acceptable max size', async function () {
  const { nbPassed, nbFailed } = await check(repoCheckerPath, new ProjectData({ max_size_ko: 120, npm_package: true, quiet: true }))
  equal(nbPassed >= 20, true)
  equal(nbFailed, 0)
})

// const folder = join(__dirname, 'checkFolder')
// test('check & fix test folder', async function () {
//   const gitConfig = join(folder, '.git', 'config')
//   await ensureFile(gitConfig)
//   const data = new ProjectData({ quiet: true })
//   const status = await check(folder, data, true)
//   equal(status.nbFailed, 0)
//   console.log('clearing folder', folder)
//   // status = await check(folder, data, true, true)
//   // equal(status.nbFailed, 0)
// })

test('report does nothing by default', function () {
  report()
})

test.run()
