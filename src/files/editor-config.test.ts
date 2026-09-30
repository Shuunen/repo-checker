import { log } from '../logger'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid } from '../mock'
import { EditorConfigFile } from './editor-config'

describe('editor-config', () => {
  it('editor config A missing file', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new EditorConfigFile()
    instance.checkFileExists = promiseFalse
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('editor config B file', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new EditorConfigFile()
    instance.checkFileExists = promiseTrue
    instance.inspectFile = promiseVoid
    instance.fileContent = ''
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })
})
