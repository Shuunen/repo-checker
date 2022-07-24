import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { TsConfigFile } from '../../src/files'
import { log } from '../../src/logger'

test('ts config file no check', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ use_typescript: false }))
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('ts config file fix', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ use_typescript: true }), true)
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
      moduleResolution: 'Node',
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
      target: 'ES2020',
    },
  }, undefined, 2)
  instance.inspectFile = async (): Promise<undefined> => void 0
  instance.fileContent = fileInitial
  instance.updateFile = async (): Promise<true> => true
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.fileContent, fileFixed)
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('ts config malformed', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ use_typescript: true }))
  const fileInitial = '"name": "John" }'
  instance.inspectFile = async (): Promise<undefined> => void 0
  instance.fileContent = fileInitial
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test.run()
