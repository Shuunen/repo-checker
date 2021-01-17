import { deepStrictEqual as deepEqual, strictEqual as equal } from 'assert'
import { ensureFileSync, removeSync } from 'fs-extra'
import { join } from 'path'
import { dataDefaults, ProjectData } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, fillTemplate, getFileSizeInKo, getGitFolders, isGitFolder, readFileInFolder } from '../src/utils'

describe('utils', () => {
  // base project folder
  const testFolder = __dirname
  const rootFolder = join(testFolder, '..')
  const filename = 'test-file.log'

  it('git folder detection', async () => {
    equal(await isGitFolder(rootFolder), true)
  })

  it('git folders listing', async () => {
    deepEqual(await getGitFolders(rootFolder), [rootFolder])
    const projects = ['anotherProject', 'sampleProject']
    projects.map(name => ensureFileSync(join(testFolder, name, '.git', 'config')))
    const folders = await getGitFolders(testFolder)
    equal(folders.length >= 2, true)
    projects.map(name => removeSync(join(testFolder, name)))
  })

  it('file creation, detection, read', async () => {
    equal(await readFileInFolder('/', filename).catch(() => 'failed'), '')
  })

  it('file size calculation', async () => {
    equal(await getFileSizeInKo(filename), 0)
  })

  it('data augment with git', async () => {
    const expectedDataFromGit = new ProjectData({
      user_id: 'Shuunen',
      user_id_lowercase: 'shuunen',
      repo_id: 'repo-checker',
    })
    const dataFromGit = await augmentDataWithGit(rootFolder, dataDefaults)
    deepEqual(dataFromGit, expectedDataFromGit)
    const expectedAugmentedData = new ProjectData({
      auto_merge: true,
      is_module: false,
      max_size_ko: 120,
      npm_package: true,
      package_name: 'repo-check',
      repo_id: 'repo-checker',
      use_typescript: true,
    })
    const augmentedData = await augmentData(rootFolder, dataDefaults, true)
    deepEqual(augmentedData, expectedAugmentedData)
    const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
    deepEqual(augmentedDataFromTestFolder, dataDefaults)
  })

  it('data augment with package', async () => {
    const data = await augmentDataWithPackageJson(rootFolder, dataDefaults)
    const expectedData = new ProjectData({
      is_module: false,
      npm_package: true,
      package_name: 'repo-check',
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
      repo_id: 'a-great-repo',
      use_typescript: true,
      user_mail: '',
      user_name: 'Dwight Schrute',
      web_url: 'https://my-website.com',
    })
    deepEqual(tsData, expectedTsData)
  })

  it('template filling', () => {
    const data = { key_to_happiness: 'Roo-doo-doot-da-doo' }
    // string
    equal(fillTemplate('Andy : {{ key_to_happiness }} !', data), `Andy : ${data.key_to_happiness} !`)
    equal(fillTemplate('Hello {{ wtf_key }} !', data), '')
    // object
    const expected = `{
  "Andy": "${data.key_to_happiness} !"
}`
    equal(fillTemplate({ Andy: '{{ key_to_happiness }} !' }, data), expected)
    // without keys
    const quote = 'Bears. Beets. Battlestar Galactica.'
    equal(fillTemplate(quote), quote)
    // empty template
    equal(fillTemplate(''), '')
  })
})
