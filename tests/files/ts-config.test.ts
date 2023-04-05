import { expect, it } from 'vitest'
import { ProjectData } from '../../src/constants'
import { TsConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseVoid } from '../utils'

it('ts config file no check', async () => {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: false }))
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
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
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
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
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
