import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { dataDefaults, dataFileName, ProjectData } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findStringInFolder, getFileSizeInKo, getGitFolders, isGitFolder, join, messageToCode, readFileInFolder } from '../src/utils'

// base project folder
const testFolder = __dirname
const rootFolder = join(testFolder, '..')
const filename = 'test-file.log'

test('git folder detection', async function () {
  equal(await isGitFolder(rootFolder), true)
})

test('git folders listing', async function () {
  equal(await getGitFolders(rootFolder), [rootFolder])
  const projects = ['anotherProject', 'sampleProject']
  projects.forEach(name => {
    const folderPath = join(testFolder, name, '.git')
    mkdirSync(folderPath, { recursive: true })
    writeFileSync(join(folderPath, 'config'), '', 'utf8')
  })
  const folders = await getGitFolders(testFolder)
  equal(folders.length >= 2, true)
  projects.forEach(name => { rmSync(join(testFolder, name), { recursive: true }) })
})

test('file creation, detection, read', async function () {
  equal(await readFileInFolder('/', filename).catch(() => 'failed'), 'failed')
})

test('read folder instead of file', async function () {
  equal(await readFileInFolder(testFolder, '').catch(() => 'failed'), 'failed')
})

test('file size calculation', async function () {
  const nonExistingFileSize = await getFileSizeInKo(filename)
  equal(nonExistingFileSize, 0)
  const existingFileSize = await getFileSizeInKo('package.json')
  equal(existingFileSize >= 1, true)
})

test('data augment with git : repo-check & no-local', async function () {
  const expectedDataFromGit = new ProjectData({
    userId: 'Shuunen',
    userIdLowercase: 'shuunen',
    repoId: 'repo-checker',
  })
  const dataFromGit = await augmentDataWithGit(rootFolder, dataDefaults)
  equal(dataFromGit, expectedDataFromGit)
})

test('data augment : repo-check & local', async function () {
  const expectedAugmentedData = new ProjectData({
    autoMerge: true,
    isModule: false,
    maxSizeKo: 40,
    npmPackage: true,
    packageName: 'repo-check',
    repoId: 'repo-checker',
    useTypescript: true,
    useC8: true,
    useEslint: true,
  })
  const augmentedData = await augmentData(rootFolder, dataDefaults, true)
  equal(augmentedData, expectedAugmentedData)
})

test('data augment : test folder', async function () {
  const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
  equal(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package : rootFolder', async function () {
  const data = await augmentDataWithPackageJson(rootFolder, dataDefaults)
  const expectedData = new ProjectData({
    isModule: false,
    npmPackage: true,
    packageName: 'repo-check',
    useTypescript: true,
    useC8: true,
    useEslint: true,
  })
  equal(data, expectedData)
})

test('data augment with package : vueProject', async function () {
  const vueData = await augmentDataWithPackageJson(join(testFolder, 'data', 'vueProject'), dataDefaults)
  const expectedVueData = new ProjectData({
    packageName: 'name',
    useVue: true,
    userIdLowercase: 'kevin_malone',
    userId: 'Kevin_Malone',
    webPublished: true,
    useTailwind: true,
    useEslint: false,
  })
  equal(vueData, expectedVueData)
})

test('data augment with package : tsProject', async function () {
  const tsData = await augmentData(join(testFolder, 'data', 'tsProject'), dataDefaults, true)
  const expectedTsData = new ProjectData({
    banSass: false,
    license: 'MIT',
    packageName: '',
    useTypescript: true,
    userName: 'Dwight Schrute',
    webUrl: 'https://my-website.com',
  })
  equal(tsData, expectedTsData)
})

test('find string in folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Dwight Schrute'
  const result = await findStringInFolder(folder, string)
  equal(result[0], dataFileName)
})

test('find string in sub folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Alice'
  const result = await findStringInFolder(folder, string)
  equal(result[0], 'here.txt')
})

test('find no string in folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Bob'
  const result = await findStringInFolder(folder, string)
  equal(result.length, 0)
})

test('find is skipped when scanning node_modules or git folders', async function () {
  const result = await findStringInFolder(rootFolder, 'blob volley')
  equal(result, ['utils.test.ts'])
})

test('message to code', function () {
  equal(messageToCode('hello world'), 'hello-world', 'test 1')
  equal(messageToCode('hello/world::!'), 'hello-world', 'test 2')
  equal(messageToCode('Hey this is :)the _Hello/world::!'), 'hey-this-is-the-hello-world', 'test 3')
})

test.run()
