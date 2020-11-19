import test from 'ava'
import { mkdirSync } from 'fs'
import path from 'path'
import { dataDefaults } from '../src/constants'
import { augmentData, augmentDataWithGit, augmentDataWithPackage, createFile, deleteFolderRecursive, fillTemplate, folderContainsFile, getFileSizeInKo, getGitFolders, isGitFolder, readFileInFolder } from '../src/utils'

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
  projects.forEach(async (name) => {
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
  t.is(await readFileInFolder('/', filename).catch(() => 'failed'), 'failed')
})

test('file size calculation', async (t) => {
  t.is(await getFileSizeInKo(filename), 0)
})

test('data augment with git', async (t) => {
  const expectedDataFromGit = {
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    repo_id: 'repo-checker',
  }
  const dataFromGit = await augmentDataWithGit(rootFolder, {})
  t.deepEqual(dataFromGit, expectedDataFromGit)
  const expectedAugmentedData = {
    auto_merge: true,
    ban_sass: true,
    dev_deps_only: true,
    license: 'GPL-3.0',
    max_size_ko: 35,
    npm_package: true,
    user_mail: 'romain.racamier@gmail.com',
    user_name: 'Romain Racamier-Lafon',
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    repo_id: 'repo-checker',
    use_typescript: false,
    use_vue: false,
  }
  const augmentedData = await augmentData(rootFolder, {}, true)
  t.deepEqual(augmentedData, expectedAugmentedData)
  const augmentedDataFromTestFolder = await augmentData(testFolder, {})
  t.deepEqual(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package', async (t) => {
  const data = await augmentDataWithPackage(rootFolder, {})
  t.deepEqual(data, {})
  const vueData = await augmentDataWithPackage(path.join(testFolder, 'data', 'vueProject'), {})
  t.deepEqual(vueData, { use_vue: true })
  const tsData = await augmentDataWithPackage(path.join(testFolder, 'data', 'tsProject'), {})
  t.deepEqual(tsData, { use_typescript: true })
})

test('template filling', t => {
  const data = { user_id: 'Shuunen' }
  // string
  t.is(fillTemplate('Hello {{ user_id }} !', data), 'Hello Shuunen !')
  t.is(fillTemplate('Hello {{ wtf_key }} !', data), '')
  // object
  const expected = `{
  "hello": "Shuunen !"
}`
  t.is(fillTemplate({ hello: '{{ user_id }} !' }, data), expected)
  // without keys
  t.is(fillTemplate('Hello world !'), 'Hello world !')
  // empty template
  t.is(fillTemplate(''), '')
})

test('delete a non existing folder', t => {
  t.is(deleteFolderRecursive('zorglub'), undefined)
})
