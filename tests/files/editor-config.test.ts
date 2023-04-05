import { expect, it } from 'vitest'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse, promiseTrue, promiseVoid } from '../utils'

it('editor config A missing file', async () => {
  log.disable()
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})

it('editor config B file', async () => {
  log.disable()
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
