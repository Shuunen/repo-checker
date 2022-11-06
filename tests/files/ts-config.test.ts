import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { TsConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseTrue, promiseVoid } from '../utils'

test('ts config file no check', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ useTypescript: false }))
  await instance.start()
  await instance.end()
  equal(instance.passed, [])
  equal(instance.failed, [])
})

test('ts config file fix', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ useTypescript: true }), true)
  const fileInitial = '{ "name": "John" }'
  const fileFixed = JSON.stringify({
    name: 'John',
    include: ['src'],
    compilerOptions: {
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      checkJs: true,
      esModuleInterop: true,
      exactOptionalPropertyTypes: true,
      forceConsistentCasingInFileNames: true,
      importsNotUsedAsValues: 'error',
      noFallthroughCasesInSwitch: true,
      noImplicitAny: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noPropertyAccessFromIndexSignature: true,
      noUncheckedIndexedAccess: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      strict: true,
      outDir: './dist',
      moduleResolution: 'Node',
      target: 'ES2020',
    },
  }, undefined, 2)
  instance.inspectFile = promiseVoid
  instance.fileContent = fileInitial
  instance.updateFile = promiseTrue
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.fileContent, fileFixed)
  equal(instance.passed, [])
  equal(instance.failed, [])
})

test('ts config malformed', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ useTypescript: true }))
  const fileInitial = '"name": "John" }'
  instance.inspectFile = promiseVoid
  instance.fileContent = fileInitial
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.passed, [])
  equal(instance.failed, [])
})

test.run()
