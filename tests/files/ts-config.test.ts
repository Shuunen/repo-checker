import { Nb } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { TsConfigFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseVoid } from '../utils'

test('ts config file no check', async function () {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: false }))
  await instance.start()
  await instance.end()
  equal(instance.passed, [])
  equal(instance.failed, [])
})

test('ts config file fix', async function () {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }), true)
  const fileInitial = '{ "name": "John", "files": ["src/main.ts"] }'
  const fileFixed = JSON.stringify({
    name: 'John',
    files: ['src/main.ts'],
    include: ['src'],
    compilerOptions: {
      /* eslint-disable @typescript-eslint/naming-convention */
      allowUnreachableCode: false,
      allowUnusedLabels: false,
      checkJs: true,
      esModuleInterop: true,
      exactOptionalPropertyTypes: true,
      forceConsistentCasingInFileNames: true,
      noFallthroughCasesInSwitch: true,
      noImplicitAny: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noPropertyAccessFromIndexSignature: false,
      noUncheckedIndexedAccess: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      skipLibCheck: true,
      strict: true,
      outDir: './dist',
      moduleResolution: 'Node',
      target: 'ES2020',
      lib: ['ESNext'],
      types: [],
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  }, undefined, Nb.Two)
  instance.inspectFile = promiseVoid
  instance.fileContent = fileInitial
  instance.updateFile = promiseVoid
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.fileContent, fileFixed)
  equal(instance.passed, [
    'does-not-use-wildcard-in-files-section',
    'my-folder-is-not-needed-in-include-section-my-folder-is-enough',
  ], 'passed')
  equal(instance.failed, [], 'failed')
})

test('ts config malformed', async function () {
  log.disable()
  const instance = new TsConfigFile('', new ProjectData({ isUsingTypescript: true }))
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
