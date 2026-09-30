import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { Result } from 'shuutils'
import { dataDefaults, dataFileName, repoCheckerPath } from './constants'
// eslint-disable-next-line max-dependencies
import { cleanIndicatorsForSnap, promiseValue, sourceFolder, tsProjectFolder, vueProjectFolder } from './mock'
import { augmentData, augmentDataWithGit, augmentDataWithPackageJson, findInFolder, getFileSizeInKo, getProjectFolders, isProjectFolder, join, jsToJson, messageToCode, objectToJson, readFileInFolder, writeFile } from './utils'

describe('mock', () => {
  it('isProjectFolder A', async () => {
    expect.hasAssertions()
    await expect(isProjectFolder(repoCheckerPath)).resolves.toBe(true)
  })

  it('isProjectFolder B folders listing', async () => {
    expect.hasAssertions()
    await expect(getProjectFolders(repoCheckerPath)).resolves.toStrictEqual([repoCheckerPath])
    const projects = ['anotherProject', 'sampleProject']
    for (const name of projects) {
      const folderPath = join(sourceFolder, name, '.git')
      // eslint-disable-next-line @typescript-eslint/naming-convention
      mkdirSync(folderPath, { recursive: true })
      // eslint-disable-next-line no-await-in-loop
      await writeFile(join(folderPath, 'config'), '', 'utf8')
    }
    const folders = await getProjectFolders(sourceFolder)
    expect(folders.length).toBeGreaterThanOrEqual(2)
    // eslint-disable-next-line @typescript-eslint/naming-convention
    for (const name of projects) rmSync(join(sourceFolder, name), { recursive: true })
  })

  it('readFileInFolder A read folder instead of file', async () => {
    expect.hasAssertions()
    const result = Result.unwrap(await readFileInFolder(sourceFolder, ''))
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('is a directory')
  })

  const filename = 'test-file.log'

  it('readFileInFolder B file does not exists', async () => {
    expect.hasAssertions()
    const result = Result.unwrap(await readFileInFolder('/', filename))
    expect(result.value).toBeUndefined()
    expect(result.error).toContain('does not exists')
  })

  it('file size calculation', async () => {
    expect.hasAssertions()
    const nonExistingFileSize = await getFileSizeInKo(filename)
    expect(nonExistingFileSize).toBe(0)
    const existingFileSize = await getFileSizeInKo('package.json')
    expect(existingFileSize).toBeGreaterThanOrEqual(1)
  })

  it('augmentData A repoCheckerPath', async () => {
    expect.hasAssertions()
    await expect(augmentData(repoCheckerPath, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentData B vueProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentData(vueProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentData C tsProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentData(tsProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentData D testFolder', async () => {
    expect.hasAssertions()
    await expect(augmentData(sourceFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentData A repoCheckerPath with local', async () => {
    expect.hasAssertions()
    await expect(augmentData(repoCheckerPath, dataDefaults, true)).resolves.toMatchSnapshot()
  })

  it('augmentData B vueProjectFolder with local', async () => {
    expect.hasAssertions()
    await expect(augmentData(vueProjectFolder, dataDefaults, true)).resolves.toMatchSnapshot()
  })

  it('augmentData C tsProjectFolder with local', async () => {
    expect.hasAssertions()
    await expect(augmentData(tsProjectFolder, dataDefaults, true)).resolves.toMatchSnapshot()
  })

  it('augmentData D testFolder with local', async () => {
    expect.hasAssertions()
    await expect(augmentData(sourceFolder, dataDefaults, true)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithGit A repoCheckerPath', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithGit(repoCheckerPath, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithGit B vueProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithGit(vueProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithGit C tsProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithGit(tsProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithGit D testFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithGit(sourceFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithGit E non-existing folder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithGit('/non-existing-folder', dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithPackageJson A repoCheckerPath', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithPackageJson(repoCheckerPath, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithPackageJson B vueProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithPackageJson(vueProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithPackageJson C tsProjectFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithPackageJson(tsProjectFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('augmentDataWithPackageJson D testFolder', async () => {
    expect.hasAssertions()
    await expect(augmentDataWithPackageJson(sourceFolder, dataDefaults)).resolves.toMatchSnapshot()
  })

  it('find pattern in folder', async () => {
    expect.hasAssertions()
    const result = await findInFolder(tsProjectFolder, /Dwight Schrute/u)
    expect(result[0]).toBe(dataFileName)
  })

  it('find pattern in sub folder', async () => {
    expect.hasAssertions()
    const result = await findInFolder(tsProjectFolder, /Alice/u)
    expect(result[0]).toBe('here.txt')
  })

  it('find no pattern in folder', async () => {
    expect.hasAssertions()
    const result = await findInFolder(tsProjectFolder, /Bob/u)
    expect(result).toHaveLength(0)
  })

  it('find is skipped when scanning node_modules or git folders', async () => {
    expect.hasAssertions()
    const result = await findInFolder(repoCheckerPath, /blob volley/u)
    expect(result).toStrictEqual(['mock.test.ts'])
  })

  it('message to code', () => {
    expect.hasAssertions()
    expect(messageToCode('hello world')).toBe('hello-world')
    expect(messageToCode('hello/world::!')).toBe('hello-world')
    expect(messageToCode('Hey this is :)the _Hello/world::!')).toBe('hey-this-is-the-hello-world')
  })

  it('jsToJson A', () => {
    expect.hasAssertions()
    expect(jsToJson('a')).toBe('a')
  })

  it('jsToJson B', () => {
    expect.hasAssertions()
    expect(
      jsToJson(`/* some comment */
module.exports = {
  userName: 'Dwight Schrute',
  banSass: false,
}`),
    ).toBe(`{
  "userName": "Dwight Schrute",
  "banSass": false
}`)
  })

  it('objectToJson A nothing to sort', () => {
    expect.hasAssertions()
    expect(objectToJson({ keyA: 'A' })).toMatchSnapshot()
  })

  it('objectToJson B already sorted', () => {
    expect.hasAssertions()
    expect(objectToJson({ keyA: 'A', keyB: 'B' })).toMatchSnapshot()
  })

  it('objectToJson C sort', () => {
    expect.hasAssertions()
    expect(objectToJson({ keyA: 'A', keyB: 'B' })).toMatchSnapshot()
  })

  it('isProjectFolder C non-existing folder', async () => {
    expect.hasAssertions()
    await expect(isProjectFolder('/non-existing-folder')).resolves.toBe(false)
  })

  it('augmentDataWithGit F git config without any url', async () => {
    expect.hasAssertions()
    const folderPath = mkdtempSync(join(tmpdir(), 'repo-checker-'))
    mkdirSync(join(folderPath, '.git'))
    await writeFile(join(folderPath, '.git', 'config'), '[core]\n\tbare = false\n')
    const result = await augmentDataWithGit(folderPath, dataDefaults)
    rmSync(folderPath, { force: true, recursive: true })
    expect(result.userId).toBe(dataDefaults.userId)
    expect(result.repoId).toBe(dataDefaults.repoId)
  })

  it('findInFolder ignores entries that cannot be read', async () => {
    expect.hasAssertions()
    const folderPath = mkdtempSync(join(tmpdir(), 'repo-checker-'))
    symlinkSync(join(folderPath, 'missing-target'), join(folderPath, 'broken-link'))
    const result = await findInFolder(folderPath, /anything/u)
    rmSync(folderPath, { force: true, recursive: true })
    expect(result).toStrictEqual([])
  })

  it('cleanIndicatorsForSnap leaves an object without indicators untouched', () => {
    expect.hasAssertions()
    expect(cleanIndicatorsForSnap({ other: 'value' })).toStrictEqual({ other: 'value' })
  })

  it('promiseValue A', async () => {
    expect.hasAssertions()
    await expect(promiseValue('a')).resolves.toBe('a')
  })
})
