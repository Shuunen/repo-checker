import test from 'ava'
import { mkdirSync } from 'fs'
import path from 'path'
import { dataDefaults, ProjectData } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, createFile, deleteFolderRecursive, fillTemplate, folderContainsFile, getFileSizeInKo, getGitFolders, isGitFolder, readFileInFolder } from '../src/utils'

// base project folder
const testFolder = __dirname
const rootFolder = path.join(testFolder, '..')
const filename = 'test-file.log'

test('git folder detection', async (t) => {
  t.true(await isGitFolder(rootFolder))
})

test('git folders listing', async (t) => {
  t.deepEqual(await getGitFolders(rootFolder), [rootFolder])
  const projects = ['anotherProject', 'sampleProject']
  projects.map(async (name) => {
    const folder = path.join(testFolder, name, '.git')
    mkdirSync(folder, { recursive: true })
    await createFile(folder, 'config')
  })
  const folders = await getGitFolders(testFolder)
  t.true(folders.length >= 2)
  projects.map(name => deleteFolderRecursive(path.join(testFolder, name)))
})

test('file creation, detection, read', async (t) => {
  t.true(await createFile(rootFolder, filename))
  t.true(await folderContainsFile(rootFolder, filename))
  t.false(await folderContainsFile(filename))
  t.false(await createFile('/', filename, 'plop'))
  t.is(await readFileInFolder('/', filename).catch(() => 'failed'), '')
})

test('file size calculation', async (t) => {
  t.is(await getFileSizeInKo(filename), 0)
})

test('data augment with git', async (t) => {
  const expectedDataFromGit = new ProjectData({
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    repo_id: 'repo-checker',
  })
  const dataFromGit = await augmentDataWithGit(rootFolder, dataDefaults)
  t.deepEqual(dataFromGit, expectedDataFromGit)
  const expectedAugmentedData = new ProjectData({
    auto_merge: true,
    is_module: true,
    max_size_ko: 45,
    npm_package: true,
    package_name: 'repo-check',
    repo_id: 'repo-checker',
    use_typescript: true,
  })
  const augmentedData = await augmentData(rootFolder, dataDefaults, true)
  t.deepEqual(augmentedData, expectedAugmentedData)
  const augmentedDataFromTestFolder = await augmentData(testFolder, dataDefaults)
  t.deepEqual(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package', async (t) => {
  const data = await augmentDataWithPackageJson(rootFolder, dataDefaults)
  const expectedData = new ProjectData({
    is_module: true,
    npm_package: true,
    package_name: 'repo-check',
    use_typescript: true,
  })
  t.deepEqual(data, expectedData)
  const vueData = await augmentDataWithPackageJson(path.join(testFolder, 'data', 'vueProject'), dataDefaults)
  const expectedVueData = new ProjectData({
    package_name: 'name',
    use_vue: true,
    user_id_lowercase: 'kevin_malone',
    user_id: 'Kevin_Malone',
    web_published: true,
  })
  t.deepEqual(vueData, expectedVueData)
  const tsData = await augmentData(path.join(testFolder, 'data', 'tsProject'), dataDefaults, true)
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
  t.deepEqual(tsData, expectedTsData)
})

test('template filling', t => {
  const data = { key_to_happiness: 'Roo-doo-doot-da-doo' }
  // string
  t.is(fillTemplate('Andy : {{ key_to_happiness }} !', data), `Andy : ${data.key_to_happiness} !`)
  t.is(fillTemplate('Hello {{ wtf_key }} !', data), '')
  // object
  const expected = `{
  "Andy": "${data.key_to_happiness} !"
}`
  t.is(fillTemplate({ Andy: '{{ key_to_happiness }} !' }, data), expected)
  // without keys
  const quote = 'Bears. Beets. Battlestar Galactica.'
  t.is(fillTemplate(quote), quote)
  // empty template
  t.is(fillTemplate(''), '')
})

test('delete a non existing folder', t => {
  t.is(deleteFolderRecursive('Pam-Beesly.jpg'), undefined)
})
