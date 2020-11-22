import test from 'ava'
import { mkdirSync } from 'fs'
import path from 'path'
import { dataDefaults } from '../src/constants'
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
    max_size_ko: 40,
    npm_package: true,
    package_name: 'repo-check',
    user_mail: 'romain.racamier@gmail.com',
    user_name: 'Romain Racamier-Lafon',
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    repo_id: 'repo-checker',
    use_typescript: false,
    use_vue: false,
    web_published: false,
  }
  const augmentedData = await augmentData(rootFolder, {}, true)
  t.deepEqual(augmentedData, expectedAugmentedData)
  const augmentedDataFromTestFolder = await augmentData(testFolder, {})
  t.deepEqual(augmentedDataFromTestFolder, dataDefaults)
})

test('data augment with package', async (t) => {
  const data = await augmentDataWithPackageJson(rootFolder, {})
  t.deepEqual(data, {
    license: 'GPL-3.0',
    npm_package: true,
    package_name: 'repo-check',
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    user_mail: 'romain.racamier@gmail.com',
    user_name: 'Romain Racamier-Lafon',
  })
  const vueData = await augmentDataWithPackageJson(path.join(testFolder, 'data', 'vueProject'), {})
  t.deepEqual(vueData, {
    license: 'GPL-3.0',
    use_vue: true,
    user_id: 'Kevin_Malone',
    user_id_lowercase: 'kevin_malone',
    package_name: 'name',
    web_published: true,
  })
  const tsData = await augmentData(path.join(testFolder, 'data', 'tsProject'), {}, true)
  t.deepEqual(tsData, {
    auto_merge: true,
    ban_sass: false,
    dev_deps_only: true,
    license: 'MIT',
    max_size_ko: 10,
    npm_package: false,
    package_name: '',
    repo_id: 'a-great-repo',
    use_typescript: true,
    use_vue: false,
    user_id: 'Shuunen',
    user_id_lowercase: 'shuunen',
    user_mail: '',
    user_name: 'Dwight Schrute',
    web_published: false,
  })
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
