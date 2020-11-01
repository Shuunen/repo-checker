import test from 'ava'
import { check } from '../src/check'
import { repoCheckerPath } from '../src/constants'

test('check repo-checker folder', async (t) => {
  // should fail due to really low max size
  const message = await check(repoCheckerPath, { max_size_ko: 2, npm_package: true }).catch(() => 'failed')
  t.is(message, 'failed')
  // should succeed
  const { nbPassed, nbFailed } = await check(repoCheckerPath, { max_size_ko: 50, npm_package: true })
  t.true(nbPassed >= 65)
  t.is(nbFailed, 0)
})
