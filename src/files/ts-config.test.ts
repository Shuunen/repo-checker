import { ProjectData } from '../constants'
import { log } from '../logger'
import { cleanInstanceForSnap, promiseVoid } from '../mock'
import { TsConfigFile } from './ts-config'

describe('ts-config', () => {
  it('ts config file no check', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: false }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('ts config file fix', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }), true)
    const fileInitial = '{ "name": "John", "files": ["src/main.ts"] }'
    instance.inspectFile = promiseVoid
    instance.fileContent = fileInitial
    instance.updateFile = promiseVoid
    expect(instance.fileContent).toStrictEqual(fileInitial)
    await instance.start()
    await instance.end()
    expect(instance.fileContent).toMatchSnapshot('file content')
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot('instance')
  })

  it('ts config empty file is handled like an empty object', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }))
    instance.inspectFile = promiseVoid
    instance.fileContent = ''
    await instance.start()
    await instance.end()
    expect(instance.passed.length + instance.warnings.length + instance.failed.length).toBeGreaterThan(0)
  })

  it('ts config malformed', async () => {
    expect.hasAssertions()
    log.disable()
    const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }))
    const fileInitial = '"name": "John" }'
    instance.inspectFile = promiseVoid
    instance.fileContent = fileInitial
    expect(instance.fileContent).toStrictEqual(fileInitial)
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })
})
