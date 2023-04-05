import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { NycRcFile } from '../../src/files'
import { promiseFalse, vueProjectFolder } from '../utils'

it('nyc rc A file exists', async () => {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})

it('nyc rc B check skip on a non nyc/c8 project', async () => {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})

it('nyc rc C file missing', async () => {
  const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})

it('nyc rc D file exists but not a json ext file', async () => {
  const instance = new NycRcFile(vueProjectFolder, new ProjectData({ isUsingNyc: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
