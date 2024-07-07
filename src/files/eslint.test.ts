import { expect, it } from 'vitest'
import { log } from '../logger'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid } from '../mock'
import { EsLintFile } from './eslint.file'

it('eslint A config missing file', async () => {
  log.disable()
  const instance = new EsLintFile()
  instance.fileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('eslint B config file empty', async () => {
  log.disable()
  const instance = new EsLintFile()
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
