import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { NycRcFile } from '../../src/files'
import { promiseFalse, vueProjectFolder } from '../utils'

test('nyc rc A file exists', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [
    'nycrc-file-exists',
    'has-a-nycrc-json-file',
    'nycrc-json-has-a-schema-declaration',
  ], 'passed')
  equal(failed, [], 'failed')
})

test('nyc rc B check skip on a non nyc/c8 project', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [], 'passed')
  equal(failed, [], 'failed')
})

test('nyc rc C file missing', async function () {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [], 'passed')
  equal(failed, ['nycrc-file-exists'], 'failed')
})

test('nyc rc D file exists but not a json ext file', async function () {
  const instance = new NycRcFile(vueProjectFolder, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [
    'nycrc-file-exists',
    'has-a-nycrc-file',
    'nycrc-has-a-schema-declaration',
  ], 'passed')
  equal(failed, [], 'failed')
})

test.run()
