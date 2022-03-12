import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { TsConfigFile } from '../../src/files'
import { log } from '../../src/logger'

test('ts config file no check', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ use_typescript: false, quiet: true }), true)
  await instance.start()
  await instance.end()
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test('ts config file fix', async function () {
  log.consoleLog = false
  log.fileLog = false
  const instance = new TsConfigFile('', new ProjectData({ use_typescript: true, quiet: true }), true)
  const fileInitial = '{ "name": "John" }'
  const fileFixed = JSON.stringify({
    name: 'John',
    include: ['src'],
    compilerOptions: {
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      strict: true,
      outDir: './dist',
      moduleResolution: 'Node',
      target: 'ES2020',
    },
  }, undefined, 2)
  instance.inspectFile = async () => void 0
  instance.fileContent = fileInitial
  instance.updateFile = async () => true
  equal(instance.fileContent, fileInitial)
  await instance.start()
  await instance.end()
  equal(instance.fileContent, fileFixed)
  equal(instance.nbPassed, 0)
  equal(instance.nbFailed, 0)
})

test.run()
