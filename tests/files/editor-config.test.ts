import { expect, it } from 'vitest'
import { EditorConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid } from '../utils'

it('editor config A missing file', async () => {
  log.disable()
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('editor config B file', async () => {
  log.disable()
  const instance = new EditorConfigFile()
  instance.checkFileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
