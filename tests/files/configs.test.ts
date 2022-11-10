import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { ConfigsFile } from '../../src/files'
import { promiseValue, vueProjectFolder } from '../utils'

test('configs can detect a missing git ignore', async function () {
  const instance = new ConfigsFile(vueProjectFolder, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [], 'passed')
  equal(failed, ['has-a-gitignore-file'], 'failed')
})

test('configs can detect fix a missing tailwind type', async function () {
  const instance = new ConfigsFile(vueProjectFolder, new ProjectData({ quiet: true, useTailwind: true }), true)
  instance.initFile = promiseValue // prevent file creation
  await instance.start()
  instance.fileName = '' // prevent file update
  equal(instance.fileContent.includes('@type'), true, 'fileContent contains @type')
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [
    'has-a-gitignore-file',
    'gitignore-has-a-tailwind-config-js-file',
    'tailwind-config-js-has-a-content-previously-named-purge-option',
  ], 'passed')
  equal(failed, [], 'failed')
})
