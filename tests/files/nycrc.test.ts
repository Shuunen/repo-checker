import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { NycRcFile } from '../../src/files'
import { promiseFalse } from '../utils'

test('nyc rc file exists', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ useNyc: true, quiet: true }))
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 3, 'nbPassed')
  equal(nbFailed, 0, 'nbFailed')
})

test('nyc rc check skip on a non nyc/c8 project', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 0, 'nbPassed')
  equal(nbFailed, 0, 'nbFailed')
})

test('nyc rc file missing', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ useNyc: true, quiet: true }))
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 0, 'nbPassed')
  equal(nbFailed, 1, 'nbFailed')
})
