import { expect, it } from 'vitest'
import { ProjectData } from '../../src/constants'
import { TailwindFile } from '../../src/files'
import { promiseValue, vueProjectFolder } from '../utils'

it('tailwind : can detect valid config', async () => {
  const instance = new TailwindFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingTailwind: true }), true)
  instance.initFile = promiseValue // prevent file creation
  await instance.start()
  instance.fileName = '' // prevent file update
  expect(instance.fileContent.includes('@type'), 'fileContent contains @type').toBe(true)
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
