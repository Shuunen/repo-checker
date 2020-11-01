import test from 'ava'
import { mkdirSync, rmdirSync } from 'fs'
import { join } from 'path'
import { dataDefaults } from '../src/constants'
import { augmentData, augmentDataWithGit, createFile, fillTemplate, folderContainsFile, getFileSizeInKo, getGitFolders, isGitFolder, readFileInFolder } from '../src/utils'

// base project folder
const testFolder = __dirname
const rootFolder = join(testFolder, '..')
const filename = 'test-file.log'

test('git folder detection', async (t) => {
  t.true(await isGitFolder(rootFolder))
})

test('git folders listing', async (t) => {
  t.deepEqual(await getGitFolders(rootFolder), [rootFolder])
  const projects = ['anotherProject', 'sampleProject']
  projects.forEach(async (name) => {
    const folder = join(testFolder, name, '.git')
    await mkdirSync(folder, { recursive: true })
    await createFile(folder, 'config')
  })
  const folders = await getGitFolders(testFolder)
  t.deepEqual(folders, projects.map(p => join(testFolder, p)))
  projects.forEach(name => rmdirSync(join(testFolder, name), { recursive: true }))
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
  }
  const augmentedData = await augmentData(rootFolder, {}, true)
  t.deepEqual(augmentedData, expectedAugmentedData)
  const augmentedDataFromTestFolder = await augmentData(testFolder, {})
  t.deepEqual(augmentedDataFromTestFolder, dataDefaults)
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
