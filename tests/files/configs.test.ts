import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { ConfigsFile } from '../../src/files'
import { join } from '../../src/utils'

// base project folder
const testFolder = __dirname
const vueProjectFolder = join(testFolder, 'data', 'vueProject')

test('configs can detect a missing git ignore', async function () {
  const instance = new ConfigsFile(vueProjectFolder, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 0, 'nbPassed')
  equal(nbFailed, 1, 'nbFailed') // no gitignore
})

test('configs can detect fix a missing tailwind type', async function () {
  const instance = new ConfigsFile(vueProjectFolder, new ProjectData({ quiet: true, useTailwind: true }), true)
  instance.initFile = async (fileName: string): Promise<string> => fileName // prevent file creation
  await instance.start()
  instance.fileName = '' // prevent file update
  equal(instance.fileContent.includes('@type'), true, 'fileContent contains @type')
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 2, 'nbPassed') // has tailwind and type has been fixed
  equal(nbFailed, 1, 'nbFailed') // no gitignore
})
