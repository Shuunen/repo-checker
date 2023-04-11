import { mkdirSync, rmSync } from 'fs'
import { Nb } from 'shuutils'
import { expect, it } from 'vitest'
import { dataDefaults, dataFileName, repoCheckerPath } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findInFolder, getFileSizeInKo, getProjectFolders, isProjectFolder, join, jsToJson, messageToCode, objectToJson, readFileInFolder, writeFile } from '../src/utils'
import { testFolder, tsProjectFolder, vueProjectFolder } from './utils'

it('isProjectFolder A', async () => {
  expect(await isProjectFolder(repoCheckerPath)).toBe(true)
})

it('isProjectFolder B folders listing', async () => {
  expect(await getProjectFolders(repoCheckerPath)).toStrictEqual([repoCheckerPath])
  const projects = ['anotherProject', 'sampleProject']
  for (const name of projects) {
    const folderPath = join(testFolder, name, '.git')
    // eslint-disable-next-line @typescript-eslint/naming-convention
    mkdirSync(folderPath, { recursive: true })
    // eslint-disable-next-line no-await-in-loop
    await writeFile(join(folderPath, 'config'), '', 'utf8')
  }
  const folders = await getProjectFolders(testFolder)
  expect(folders.length >= Nb.Two).toBe(true)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  projects.forEach(name => { rmSync(join(testFolder, name), { recursive: true }) })
})

it('read folder instead of file', async () => {
  expect(await readFileInFolder(testFolder, '').catch(() => 'failed')).toBe('failed')
})

const filename = 'test-file.log'

it('file creation, detection, read', async () => {
  expect(await readFileInFolder('/', filename).catch(() => 'failed')).toBe('failed')
})

it('file size calculation', async () => {
  const nonExistingFileSize = await getFileSizeInKo(filename)
  expect(nonExistingFileSize).toBe(Nb.None)
  const existingFileSize = await getFileSizeInKo('package.json')
  expect(existingFileSize >= Nb.One).toBe(true)
})

it('augmentData A repoCheckerPath', async () => { expect(await augmentData(repoCheckerPath, dataDefaults)).toMatchSnapshot() })
it('augmentData B vueProjectFolder', async () => { expect(await augmentData(vueProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentData C tsProjectFolder', async () => { expect(await augmentData(tsProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentData D testFolder', async () => { expect(await augmentData(testFolder, dataDefaults)).toMatchSnapshot() })
it('augmentData A repoCheckerPath with local', async () => { expect(await augmentData(repoCheckerPath, dataDefaults, true)).toMatchSnapshot() })
it('augmentData B vueProjectFolder with local', async () => { expect(await augmentData(vueProjectFolder, dataDefaults, true)).toMatchSnapshot() })
it('augmentData C tsProjectFolder with local', async () => { expect(await augmentData(tsProjectFolder, dataDefaults, true)).toMatchSnapshot() })
it('augmentData D testFolder with local', async () => { expect(await augmentData(testFolder, dataDefaults, true)).toMatchSnapshot() })

it('augmentDataWithGit A repoCheckerPath', async () => { expect(await augmentDataWithGit(repoCheckerPath, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithGit B vueProjectFolder', async () => { expect(await augmentDataWithGit(vueProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithGit C tsProjectFolder', async () => { expect(await augmentDataWithGit(tsProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithGit D testFolder', async () => { expect(await augmentDataWithGit(testFolder, dataDefaults)).toMatchSnapshot() })

it('augmentDataWithPackageJson A repoCheckerPath', async () => { expect(await augmentDataWithPackageJson(repoCheckerPath, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithPackageJson B vueProjectFolder', async () => { expect(await augmentDataWithPackageJson(vueProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithPackageJson C tsProjectFolder', async () => { expect(await augmentDataWithPackageJson(tsProjectFolder, dataDefaults)).toMatchSnapshot() })
it('augmentDataWithPackageJson D testFolder', async () => { expect(await augmentDataWithPackageJson(testFolder, dataDefaults)).toMatchSnapshot() })

it('find pattern in folder', async () => {
  const folder = join(testFolder, 'data', 'tsProject')
  const result = await findInFolder(folder, /Dwight Schrute/u)
  expect(result[Nb.First]).toBe(dataFileName)
})

it('find pattern in sub folder', async () => {
  const folder = join(testFolder, 'data', 'tsProject')
  const result = await findInFolder(folder, /Alice/u)
  expect(result[Nb.First]).toBe('here.txt')
})

it('find no pattern in folder', async () => {
  const folder = join(testFolder, 'data', 'tsProject')
  const result = await findInFolder(folder, /Bob/u)
  expect(result.length).toBe(Nb.None)
})

it('find is skipped when scanning node_modules or git folders', async () => {
  const result = await findInFolder(repoCheckerPath, /blob volley/u)
  expect(result).toStrictEqual(['utils.test.ts'])
})

it('message to code', () => {
  expect(messageToCode('hello world')).toBe('hello-world')
  expect(messageToCode('hello/world::!')).toBe('hello-world')
  expect(messageToCode('Hey this is :)the _Hello/world::!')).toBe('hey-this-is-the-hello-world')
})

it('jsToJson A', () => { expect(jsToJson('a')).toBe('a') })

it('jsToJson B', () => {
  expect(jsToJson(`/* some comment */
module.exports = {
  userName: 'Dwight Schrute',
  banSass: false,
}`)).toBe(`{
  "userName": "Dwight Schrute",
  "banSass": false
}`)
})

it('objectToJson A nothing to sort', () => {
  expect(objectToJson({ keyA: 'A' })).toMatchSnapshot()
})

it('objectToJson B already sorted', () => {
  expect(objectToJson({ keyA: 'A', keyB: 'B' })).toMatchSnapshot()
})

it('objectToJson C sort', () => {
  expect(objectToJson({ keyB: 'B', keyA: 'A' })).toMatchSnapshot()
})
