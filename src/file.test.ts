/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable max-classes-per-file */
import { sleep } from 'shuutils'
import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from './constants'
import { FileBase } from './file'
import { cleanInstanceForSnap } from './mock'
import { deleteFile, join, readFile, writeFile } from './utils'

const existingFilename = '.nvmrc'
const existingFilepath = join(repoCheckerPath, existingFilename)
const missingFilename = 'some-file.log'
const missingFilepath = join(repoCheckerPath, missingFilename)
const fakeContent = 'zorglub'

it('file A simple validator', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFile extends FileBase {
    public async start() {
      await writeFile(missingFilepath, 'Foobar content')
      await this.inspectFile(missingFilename)
      expect(this.passed, 'test 1').toStrictEqual([])
      this.shouldContains('Foobar')
      expect(this.passed, 'test 2').toStrictEqual(['some-file-log-has-foobar'])
      this.shouldContains('plop')
      expect(this.passed, 'test 3').toStrictEqual(['some-file-log-has-foobar'])
      this.couldContains('world')
      expect(this.passed, 'test 4').toStrictEqual(['some-file-log-has-foobar'])
      await this.checkFileExists('package.json')
      expect(this.passed, 'test 5').toStrictEqual(['some-file-log-has-foobar', 'some-file-log-has-a-package-json-file'])
      await this.checkNoFileExists('zorglub.exe')
      expect(this.passed, 'test 6').toStrictEqual(['some-file-log-has-foobar', 'some-file-log-has-a-package-json-file', 'some-file-log-has-no-zorglub-exe-file'])
      await deleteFile(missingFilepath)
      this.shouldContains('two dots', /\./gu, 2, true, 'should contains 2 dots', true)
    }
  }
  const instance = new MyFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('file B validator with fix', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFix extends FileBase {
    public async start() {
      await this.checkFileExists(existingFilename)
      await deleteFile(existingFilepath)
      await this.checkFileExists(existingFilename)
      await this.checkFileExists('missing-template.csv')
      const sizeKo = await this.getFileSizeInKo(existingFilename)
      this.test(sizeKo < 2, 'nvmrc should be a small text file')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('file C validator with fix & force, overwrite a problematic file with template', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFixForce extends FileBase {
    public async start() {
      await this.inspectFile(existingFilename)
      this.shouldContains('two dots', /\./gu, 2)
      this.shouldContains('a regular nvmrc file content', /travers/u)
      this.shouldContains('a super nvmrc file content', /travers is super/u, 1, true, 'just say it', true)
      this.shouldContains('an extra nvmrc file content', /travers is extra/u, 2, true, undefined, true)
      this.checkContains(/travers is extra/u)
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, true)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance, 'fileContent', 'originalFileContent')).toMatchSnapshot() // remove fileContent & originalFileContent to avoid snap being polluted by nvrmc content
})

it('file D validator with fix & force, update a problematic file on the go', async () => {
  let originalContent = ''
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFixForce extends FileBase {
    public async start() {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, true)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance, 'originalFileContent')).toMatchSnapshot() // remove originalFileContent to avoid snap being polluted by nvrmc content
  expect(await readFile(existingFilepath), 'file content updated').toBe(fakeContent)
  await writeFile(existingFilepath, originalContent) // restore the file
})

it('file E validator without force cannot fix a problematic file on the go', async () => {
  let originalContent = ''
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFixForce extends FileBase {
    public async start() {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.shouldContains('a weird stuff', /zorglub/u)
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, false)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance, 'originalFileContent')).toMatchSnapshot() // remove originalFileContent to avoid snap being polluted by nvrmc content
  expect(await readFile(existingFilepath)).toBe(originalContent)
})

it('file F validator with fix cannot fix if the template require data that is missing', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFix extends FileBase {
    public async start() {
      await this.checkFileExists('template-example.json')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('file G validator can detect a missing schema', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFix extends FileBase {
    public async start() {
      await sleep(1)
      this.fileContent = '{}'
      expect(this.couldContainsSchema('does-not-exist')).toBe(false)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('file H validator can detect an existing schema', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFix extends FileBase {
    public async start() {
      await sleep(1)
      this.fileContent = `{
        "something": "else",
        "$schema": "https://json.schemastore.org/does-exist",
        "age": 42
      }`
      expect(this.couldContainsSchema('https://json.schemastore.org/does-exist')).toBe(true)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('file I validator can fix a missing schema', async () => {
  // eslint-disable-next-line no-restricted-syntax
  class MyFileFix extends FileBase {
    public async start() {
      await sleep(1)
      this.fileContent = `{
        "something": "else",
        "age": 42
      }`
      expect(this.couldContainsSchema('https://json.schemastore.org/does-exist-too')).toBe(true)
      expect(this.fileContent).toBe(`{
        "$schema": "https://json.schemastore.org/does-exist-too",
        "something": "else",
        "age": 42
      }`)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
