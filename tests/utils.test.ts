import { mkdirSync, rmSync } from 'fs' // eslint-disable-line no-restricted-imports
import { Nb } from 'shuutils'
import { expect, it } from 'vitest'
import { ProjectData, dataDefaults, dataFileName, repoCheckerPath } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findInFolder, getFileSizeInKo, getProjectFolders, isProjectFolder, join, jsToJson, messageToCode, readFileInFolder, writeFile } from '../src/utils'
import { testFolder } from './utils'

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

it('data augment A with git : repo-check & no-local', async () => {
  const expectedDataFromGit = new ProjectData({
    userId: 'Shuunen',
    userIdLowercase: 'shuunen',
    repoId: 'repo-checker',
  })
  const dataFromGit = await augmentDataWithGit(repoCheckerPath, dataDefaults)
  expect(dataFromGit).toStrictEqual(expectedDataFromGit)
})

it('data augment B repo-check & local', async () => {
  const expectedAugmentedData = new ProjectData({
    canAutoMergeDeps: true,
    hasTaskPrefix: true,
    isModule: false,
    maxSizeKo: 45,
    isPublishedPackage: true,
    packageName: 'repo-check',
    repoId: 'repo-checker',
    isUsingTypescript: true,
    isUsingC8: true,
    isUsingEslint: true,
    isUsingDependencyCruiser: true,
  })
  const augmentedData = await augmentData(repoCheckerPath, dataDefaults, true)
  expect(augmentedData).toStrictEqual(expectedAugmentedData)
})

it('data augment C test folder', async () => {
  const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
  expect(augmentedDataFromTestFolder).toStrictEqual(dataDefaults)
})

it('data augment D with package : rootFolder', async () => {
  const data = await augmentDataWithPackageJson(repoCheckerPath, dataDefaults)
  const expectedData = new ProjectData({
    hasTaskPrefix: true,
    isModule: false,
    isPublishedPackage: true,
    packageName: 'repo-check',
    isUsingTypescript: true,
    isUsingC8: true,
    isUsingEslint: true,
    isUsingDependencyCruiser: true,
  })
  expect(data).toStrictEqual(expectedData)
})

it('data augment E with package : vueProject', async () => {
  const vueData = await augmentDataWithPackageJson(join(testFolder, 'data', 'vueProject'), dataDefaults)
  const expectedVueData = new ProjectData({
    packageName: 'name',
    isUsingVue: true,
    userIdLowercase: 'kevin_malone',
    userId: 'Kevin_Malone',
    isWebPublished: true,
    isUsingTailwind: true,
    isUsingEslint: false,
  })
  expect(vueData).toStrictEqual(expectedVueData)
})

it('data augment F with package : tsProject', async () => {
  const tsData = await augmentData(join(testFolder, 'data', 'tsProject'), dataDefaults, true)
  const expectedTsData = new ProjectData({
    shouldAvoidSass: false,
    license: 'MIT',
    packageName: '',
    isUsingTypescript: true,
    userName: 'Dwight Schrute',
    webUrl: 'https://my-website.com',
  })
  expect(tsData).toStrictEqual(expectedTsData)
})

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
