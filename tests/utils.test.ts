import { mkdirSync, rmSync } from 'fs' // eslint-disable-line no-restricted-imports
import { check, Nb } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { dataDefaults, dataFileName, ProjectData, repoCheckerPath } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findStringInFolder, getFileSizeInKo, getGitFolders, isGitFolder, join, jsToJson, messageToCode, readFileInFolder, writeFile } from '../src/utils'
import { testFolder } from './utils'

test('git folder detection', async function () {
  equal(await isGitFolder(repoCheckerPath), true)
})

test('git folders listing', async function () {
  equal(await getGitFolders(repoCheckerPath), [repoCheckerPath])
  const projects = ['anotherProject', 'sampleProject']
  for (const name of projects) {
    const folderPath = join(testFolder, name, '.git')
    // eslint-disable-next-line @typescript-eslint/naming-convention
    mkdirSync(folderPath, { recursive: true })
    // eslint-disable-next-line no-await-in-loop
    await writeFile(join(folderPath, 'config'), '', 'utf8')
  }
  const folders = await getGitFolders(testFolder)
  equal(folders.length >= Nb.Two, true)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  projects.forEach(name => { rmSync(join(testFolder, name), { recursive: true }) })
})

test('read folder instead of file', async function () {
  equal(await readFileInFolder(testFolder, '').catch(() => 'failed'), 'failed')
})

const filename = 'test-file.log'

test('file creation, detection, read', async function () {
  equal(await readFileInFolder('/', filename).catch(() => 'failed'), 'failed')
})

test('file size calculation', async function () {
  const nonExistingFileSize = await getFileSizeInKo(filename)
  equal(nonExistingFileSize, Nb.None)
  const existingFileSize = await getFileSizeInKo('package.json')
  equal(existingFileSize >= Nb.One, true)
})

test('data augment with git : repo-check & no-local', async function () {
  const expectedDataFromGit = new ProjectData({
    userId: 'Shuunen',
    userIdLowercase: 'shuunen',
    repoId: 'repo-checker',
  })
  const dataFromGit = await augmentDataWithGit(repoCheckerPath, dataDefaults)
  equal(dataFromGit, expectedDataFromGit)
})

test('data augment : repo-check & local', async function () {
  const expectedAugmentedData = new ProjectData({
    canAutoMergeDeps: true,
    isModule: false,
    maxSizeKo: 40,
    isPublishedPackage: true,
    packageName: 'repo-check',
    repoId: 'repo-checker',
    isUsingTypescript: true,
    isUsingC8: true,
    isUsingEslint: true,
    isUsingDependencyCruiser: true,
  })
  const augmentedData = await augmentData(repoCheckerPath, dataDefaults, true)
  equal(augmentedData, expectedAugmentedData)
})

test('data augment : test folder', async function () {
  const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
  equal(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package : rootFolder', async function () {
  const data = await augmentDataWithPackageJson(repoCheckerPath, dataDefaults)
  const expectedData = new ProjectData({
    isModule: false,
    isPublishedPackage: true,
    packageName: 'repo-check',
    isUsingTypescript: true,
    isUsingC8: true,
    isUsingEslint: true,
    isUsingDependencyCruiser: true,
  })
  equal(data, expectedData)
})

test('data augment with package : vueProject', async function () {
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
  equal(vueData, expectedVueData)
})

test('data augment with package : tsProject', async function () {
  const tsData = await augmentData(join(testFolder, 'data', 'tsProject'), dataDefaults, true)
  const expectedTsData = new ProjectData({
    shouldAvoidSass: false,
    license: 'MIT',
    packageName: '',
    isUsingTypescript: true,
    userName: 'Dwight Schrute',
    webUrl: 'https://my-website.com',
  })
  equal(tsData, expectedTsData)
})

test('find string in folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Dwight Schrute'
  const result = await findStringInFolder(folder, string)
  equal(result[Nb.First], dataFileName)
})

test('find string in sub folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Alice'
  const result = await findStringInFolder(folder, string)
  equal(result[Nb.First], 'here.txt')
})

test('find no string in folder', async function () {
  const folder = join(testFolder, 'data', 'tsProject')
  const string = 'Bob'
  const result = await findStringInFolder(folder, string)
  equal(result.length, Nb.None)
})

test('find is skipped when scanning node_modules or git folders', async function () {
  const result = await findStringInFolder(repoCheckerPath, 'blob volley')
  equal(result, ['utils.test.ts'])
})

test('message to code', function () {
  equal(messageToCode('hello world'), 'hello-world', 'test 1')
  equal(messageToCode('hello/world::!'), 'hello-world', 'test 2')
  equal(messageToCode('Hey this is :)the _Hello/world::!'), 'hey-this-is-the-hello-world', 'test 3')
})

check('jsToJson A', jsToJson('a'), 'a')
check('jsToJson B', jsToJson(`/* some comment */
module.exports = {
  userName: 'Dwight Schrute',
  banSass: false,
}`), `{
  "userName": "Dwight Schrute",
  "banSass": false
}`)

test.run()
