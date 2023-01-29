import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { TailwindFile } from '../../src/files'
import { promiseValue, vueProjectFolder } from '../utils'

test('tailwind : can detect valid config', async function () {
  const instance = new TailwindFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingTailwind: true }), true)
  instance.initFile = promiseValue // prevent file creation
  await instance.start()
  instance.fileName = '' // prevent file update
  equal(instance.fileContent.includes('@type'), true, 'fileContent contains @type')
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [
    'has-a-tailwind-config-js-file',
    'tailwind-config-js-has-a-content-previously-named-purge-option',
  ], 'passed')
  equal(failed, [], 'failed')
})
