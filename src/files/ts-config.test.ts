import { expect, it } from 'vitest'
import { ProjectData } from '../constants'
import { log } from '../logger'
import { cleanInstanceForSnap, promiseVoid } from '../mock'
import { TsConfigFile } from './ts-config'

it('ts config file no check', async () => {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: false }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('ts config file fix', async () => {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }), true)
  const fileInitial = '{ "name": "John", "files": ["src/main.ts"] }'
  instance.inspectFile = promiseVoid
  instance.fileContent = fileInitial
  instance.updateFile = promiseVoid
  expect(instance.fileContent).toStrictEqual(fileInitial)
  await instance.start()
  await instance.end()
  expect(instance.fileContent).toMatchSnapshot()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('ts config malformed', async () => {
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
