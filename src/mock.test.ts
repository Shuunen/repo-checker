import { mkdirSync, rmSync } from 'node:fs'
import { Result } from 'shuutils'
import { expect, it } from 'vitest'
import { dataDefaults, dataFileName, repoCheckerPath } from './constants'
// eslint-disable-next-line max-dependencies
import { promiseValue, sourceFolder, tsProjectFolder, vueProjectFolder } from './mock'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findInFolder, getFileSizeInKo, getProjectFolders, isProjectFolder, join, jsToJson, messageToCode, objectToJson, readFileInFolder, writeFile } from './utils'

it('isProjectFolder A', async () => {
  expect(await isProjectFolder(repoCheckerPath)).toBe(true)
})

it('isProjectFolder B folders listing', async () => {
  expect(await getProjectFolders(repoCheckerPath)).toStrictEqual([repoCheckerPath])
  const projects = ['anotherProject', 'sampleProject']
  for (const name of projects) {
    const folderPath = join(sourceFolder, name, '.git')
    // eslint-disable-next-line @typescript-eslint/naming-convention
    mkdirSync(folderPath, { recursive: true })
    // eslint-disable-next-line no-await-in-loop
    await writeFile(join(folderPath, 'config'), '', 'utf8')
  }
  const folders = await getProjectFolders(sourceFolder)
  expect(folders.length >= 2).toBe(true)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  for (const name of projects) rmSync(join(sourceFolder, name), { recursive: true })
})

it('readFileInFolder A read folder instead of file', async () => {
  const result = Result.unwrap(await readFileInFolder(sourceFolder, ''))
  expect(result.value).toBeUndefined()
  expect(result.error).toContain('is a directory')
})

const filename = 'test-file.log'

it('readFileInFolder B file does not exists', async () => {
  const result = Result.unwrap(await readFileInFolder('/', filename))
  expect(result.value).toBeUndefined()
  expect(result.error).toContain('does not exists')
})

it('file size calculation', async () => {
  const nonExistingFileSize = await getFileSizeInKo(filename)
  expect(nonExistingFileSize).toBe(0)
  const existingFileSize = await getFileSizeInKo('package.json')
  expect(existingFileSize >= 1).toBe(true)
})

it('augmentData A repoCheckerPath', async () => {
  expect(await augmentData(repoCheckerPath, dataDefaults)).toMatchSnapshot()
})
it('augmentData B vueProjectFolder', async () => {
  expect(await augmentData(vueProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentData C tsProjectFolder', async () => {
  expect(await augmentData(tsProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentData D testFolder', async () => {
  expect(await augmentData(sourceFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentData A repoCheckerPath with local', async () => {
  expect(await augmentData(repoCheckerPath, dataDefaults, true)).toMatchSnapshot()
})
it('augmentData B vueProjectFolder with local', async () => {
  expect(await augmentData(vueProjectFolder, dataDefaults, true)).toMatchSnapshot()
})
it('augmentData C tsProjectFolder with local', async () => {
  expect(await augmentData(tsProjectFolder, dataDefaults, true)).toMatchSnapshot()
})
it('augmentData D testFolder with local', async () => {
  expect(await augmentData(sourceFolder, dataDefaults, true)).toMatchSnapshot()
})

it('augmentDataWithGit A repoCheckerPath', async () => {
  expect(await augmentDataWithGit(repoCheckerPath, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithGit B vueProjectFolder', async () => {
  expect(await augmentDataWithGit(vueProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithGit C tsProjectFolder', async () => {
  expect(await augmentDataWithGit(tsProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithGit D testFolder', async () => {
  expect(await augmentDataWithGit(sourceFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithGit E non-existing folder', async () => {
  expect(await augmentDataWithGit('/non-existing-folder', dataDefaults)).toMatchSnapshot()
})

it('augmentDataWithPackageJson A repoCheckerPath', async () => {
  expect(await augmentDataWithPackageJson(repoCheckerPath, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithPackageJson B vueProjectFolder', async () => {
  expect(await augmentDataWithPackageJson(vueProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithPackageJson C tsProjectFolder', async () => {
  expect(await augmentDataWithPackageJson(tsProjectFolder, dataDefaults)).toMatchSnapshot()
})
it('augmentDataWithPackageJson D testFolder', async () => {
  expect(await augmentDataWithPackageJson(sourceFolder, dataDefaults)).toMatchSnapshot()
})

it('find pattern in folder', async () => {
  const result = await findInFolder(tsProjectFolder, /Dwight Schrute/u)
  expect(result[0]).toBe(dataFileName)
})

it('find pattern in sub folder', async () => {
  const result = await findInFolder(tsProjectFolder, /Alice/u)
  expect(result[0]).toBe('here.txt')
})

it('find no pattern in folder', async () => {
  const result = await findInFolder(tsProjectFolder, /Bob/u)
  expect(result.length).toBe(0)
})

it('find is skipped when scanning node_modules or git folders', async () => {
  const result = await findInFolder(repoCheckerPath, /blob volley/u)
  expect(result).toStrictEqual(['mock.test.ts'])
})

it('message to code', () => {
  expect(messageToCode('hello world')).toBe('hello-world')
  expect(messageToCode('hello/world::!')).toBe('hello-world')
  expect(messageToCode('Hey this is :)the _Hello/world::!')).toBe('hey-this-is-the-hello-world')
})

it('jsToJson A', () => {
  expect(jsToJson('a')).toBe('a')
})

it('jsToJson B', () => {
  expect(
    jsToJson(`/* some comment */
module.exports = {
  userName: 'Dwight Schrute',
  banSass: false,
}`),
  ).toBe(`{
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
  expect(objectToJson({ keyA: 'A', keyB: 'B' })).toMatchSnapshot()
})

it('promiseValue A', async () => {
  expect(await promiseValue('a')).toBe('a')
})
