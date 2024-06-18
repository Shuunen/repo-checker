import { expect, it } from 'vitest'
import { log } from '../logger'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid } from '../mock'
import { EditorConfigFile } from './editor-config'

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
