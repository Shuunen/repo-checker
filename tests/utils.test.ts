import { deepStrictEqual as deepEqual, strictEqual as equal } from 'assert'
import { ensureFileSync, removeSync } from 'fs-extra'
import { dataDefaults, ProjectData } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, getFileSizeInKo, getGitFolders, isGitFolder, join, readFileInFolder } from '../src/utils'

// base project folder
const testFolder = __dirname
const rootFolder = join(testFolder, '..')
const filename = 'test-file.log'

describe('utils', function () {

  it('git folder detection', async function () {
    equal(await isGitFolder(rootFolder), true)
  })

  it('git folders listing', async function () {
    deepEqual(await getGitFolders(rootFolder), [rootFolder])
    const projects = ['anotherProject', 'sampleProject']
    projects.map(name => ensureFileSync(join(testFolder, name, '.git', 'config')))
    const folders = await getGitFolders(testFolder)
    equal(folders.length >= 2, true)
    projects.map(name => removeSync(join(testFolder, name)))
  })

  it('file creation, detection, read', async function () {
    equal(await readFileInFolder('/', filename).catch(() => 'failed'), '')
  })

  it('file size calculation', async function () {
    const nonExistingFileSize = await getFileSizeInKo(filename)
    equal(nonExistingFileSize, 0)
    const existingFileSize = await getFileSizeInKo('package.json')
    equal(existingFileSize >= 1, true)
  })

  it('data augment with git : repo-check & no-local', async function () {
    const expectedDataFromGit = new ProjectData({
      user_id: 'Shuunen',
      user_id_lowercase: 'shuunen',
      repo_id: 'repo-checker',
    })
    const dataFromGit = await augmentDataWithGit(rootFolder, dataDefaults)
    deepEqual(dataFromGit, expectedDataFromGit)
  })

  it('data augment : repo-check & local', async function () {
    const expectedAugmentedData = new ProjectData({
      auto_merge: true,
      is_module: false,
      max_size_ko: 40,
      npm_package: true,
      package_name: 'repo-check',
      repo_id: 'repo-checker',
      use_stack: true,
      use_typescript: true,
    })
    const augmentedData = await augmentData(rootFolder, dataDefaults, true)
    deepEqual(augmentedData, expectedAugmentedData)
  })

  it('data augment : test folder', async function () {
    const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
    deepEqual(augmentedDataFromTestFolder, dataDefaults)
  })

  it('data augment with package', async function () {
    const data = await augmentDataWithPackageJson(rootFolder, dataDefaults)
    const expectedData = new ProjectData({
      is_module: false,
      npm_package: true,
      package_name: 'repo-check',
      use_stack: true,
      use_typescript: true,
    })
    deepEqual(data, expectedData)
    const vueData = await augmentDataWithPackageJson(join(testFolder, 'data', 'vueProject'), dataDefaults)
    const expectedVueData = new ProjectData({
      package_name: 'name',
      use_vue: true,
      user_id_lowercase: 'kevin_malone',
      user_id: 'Kevin_Malone',
      web_published: true,
    })
    deepEqual(vueData, expectedVueData)
    const tsData = await augmentData(join(testFolder, 'data', 'tsProject'), dataDefaults, true)
    const expectedTsData = new ProjectData({
      ban_sass: false,
      license: 'MIT',
      package_name: '',
      use_typescript: true,
      user_mail: '',
      user_name: 'Dwight Schrute',
      web_url: 'https://my-website.com',
    })
    deepEqual(tsData, expectedTsData)
  })
})
