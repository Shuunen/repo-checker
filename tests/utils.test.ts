import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { dataDefaults, dataFileName, ProjectData } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findStringInFolder, getFileSizeInKo, getGitFolders, isGitFolder, join, readFileInFolder } from '../src/utils'

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
  projects.forEach(name => rmSync(join(testFolder, name), { recursive: true }))
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
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    repo_id: 'repo-checker',
  })
  const dataFromGit = await augmentDataWithGit(rootFolder, dataDefaults)
  equal(dataFromGit, expectedDataFromGit)
})

test('data augment : repo-check & local', async function () {
  const expectedAugmentedData = new ProjectData({
    auto_merge: true,
    is_module: false,
    max_size_ko: 40,
    npm_package: true,
    package_name: 'repo-check',
    repo_id: 'repo-checker',
    use_typescript: true,
    useC8: true,
  })
  const augmentedData = await augmentData(rootFolder, dataDefaults, true)
  equal(augmentedData, expectedAugmentedData)
})

test('data augment : test folder', async function () {
  const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
  equal(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package', async function () {
  const data = await augmentDataWithPackageJson(rootFolder, dataDefaults)
  const expectedData = new ProjectData({
    is_module: false,
    npm_package: true,
    package_name: 'repo-check',
    use_typescript: true,
    useC8: true,
  })
  equal(data, expectedData, 'RC set')
  const vueData = await augmentDataWithPackageJson(join(testFolder, 'data', 'vueProject'), dataDefaults)
  const expectedVueData = new ProjectData({
    package_name: 'name',
    use_vue: true,
    user_id_lowercase: 'kevin_malone',
    user_id: 'Kevin_Malone',
    web_published: true,
    useTailwind: true,
  })
  equal(vueData, expectedVueData, 'Vue set')
  const tsData = await augmentData(join(testFolder, 'data', 'tsProject'), dataDefaults, true)
  const expectedTsData = new ProjectData({
    ban_sass: false,
    license: 'MIT',
    package_name: '',
    use_typescript: true,
    user_name: 'Dwight Schrute',
    web_url: 'https://my-website.com',
  })
  equal(tsData, expectedTsData, 'TS set')
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

test('find is stopped when scanning too much files', async function () {
  const result = await findStringInFolder(rootFolder, 'blob volley').catch(() => 'failed')
  equal(result, 'failed')
})

test.run()
