import test from 'ava'
import { mkdirSync } from 'fs'
import path from 'path'
import { check } from '../src/check'
import { repoCheckerPath } from '../src/constants'
import { createFile, deleteFolderRecursive } from '../src/utils'

const testFolder = __dirname

test('check repo-checker folder', async (t) => {
  // should fail due to really low max size
  const message = await check(repoCheckerPath, { max_size_ko: 2, npm_package: true }).catch(() => 'failed')
  t.is(message, 'failed')
  // should succeed
  const { nbPassed, nbFailed } = await check(repoCheckerPath, { max_size_ko: 50, npm_package: true })
  t.true(nbPassed >= 20)
  t.is(nbFailed, 0)
})

test('check & fix test folder', async (t) => {
  const folder = path.join(testFolder, 'checkFolder')
  mkdirSync(path.join(folder, '.git'), { recursive: true })
  await createFile(path.join(folder, '.git'), 'config')
  let message = await check(folder, {}, true).catch(() => 'failed')
  t.is(message, 'failed')
  message = await check(folder, {}, true, true).catch(() => 'failed')
  t.is(message, 'failed')
  deleteFolderRecursive(folder)
})
