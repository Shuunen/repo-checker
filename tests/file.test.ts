import { Nb, sleep } from 'shuutils'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { FileBase } from '../src/file'
import { deleteFile, join, readFile, writeFile } from '../src/utils'

const existingFilename = '.nvmrc'
const existingFilepath = join(repoCheckerPath, existingFilename)
const missingFilename = 'some-file.log'
const missingFilepath = join(repoCheckerPath, missingFilename)
const fakeContent = 'zorglub'

test('file : simple validator', async function () {
  class MyFile extends FileBase {
    public async start (): Promise<void> {
      await writeFile(missingFilepath, 'Foobar content')
      await this.inspectFile(missingFilename)
      equal(this.passed, [], 'test 1')
      this.shouldContains('Foobar')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 2')
      this.shouldContains('plop')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 3')
      this.couldContains('world')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 4')
      await this.checkFileExists('package.json')
      equal(this.passed, ['some-file-log-has-foobar', 'some-file-log-has-a-package-json-file'], 'test 5')
      await this.checkNoFileExists('zorglub.exe')
      equal(this.passed, ['some-file-log-has-foobar', 'some-file-log-has-a-package-json-file', 'some-file-log-has-no-zorglub-exe-file'], 'test 6')
      await deleteFile(missingFilepath)
      this.shouldContains('two dots', /\./gu, Nb.Two, true, 'hehe 2 dots', true)
    }
  }
  const instance = new MyFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, ['some-file-log-has-foobar', 'some-file-log-has-a-package-json-file', 'some-file-log-has-no-zorglub-exe-file'], 'passed')
  equal(failed, ['some-file-log-does-not-have-plop-plop'], 'failed')
})

test('file : validator with fix', async function () {
  class MyFileFix extends FileBase {
    public async start (): Promise<void> {
      await this.checkFileExists(existingFilename)
      await deleteFile(existingFilepath)
      await this.checkFileExists(existingFilename)
      await this.checkFileExists('missing-template.csv')
      const sizeKo = await this.getFileSizeInKo(existingFilename)
      this.test(sizeKo < Nb.Two, 'nvmrc should be a small text file')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [
    'has-a-nvmrc-file',
    'has-a-nvmrc-file',
    'nvmrc-should-be-a-small-text-file',
  ], 'passed')
  equal(failed, ['has-a-missing-template-csv-file'], 'failed')
})

test('file : validator with fix & force, overwrite a problematic file with template', async function () {
  class MyFileFixForce extends FileBase {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      this.shouldContains('two dots', /\./gu, Nb.Two)
      this.shouldContains('a regular nvmrc file content', /travers/u)
      this.shouldContains('a super nvmrc file content', /travers is super/u, Nb.One, true, 'just say it', true)
      this.shouldContains('an extra nvmrc file content', /travers is extra/u, Nb.Two, true, undefined, true)
      this.checkContains(/travers is extra/u)
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, true)
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, ['nvmrc-has-two-dots'], 'passed')
  equal(failed, ['nvmrc-does-not-have-a-regular-nvmrc-file-content-travers'], 'failed')
})

test('file : validator with fix & force, update a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends FileBase {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, true)
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [], 'passed')
  equal(failed, [], 'failed')
  equal(await readFile(existingFilepath), fakeContent, 'file content updated')
  await writeFile(existingFilepath, originalContent) // restore the file
})

test('file : validator without force cannot fix a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends FileBase {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.shouldContains('a weird stuff', /zorglub/u)
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ isQuiet: true }), true, false)
  await instance.start()
  await instance.end()
  equal(await readFile(existingFilepath), originalContent)
})

test('file : validator with fix cannot fix if the template require data that is missing', async function () {
  class MyFileFix extends FileBase {
    public async start (): Promise<void> {
      await this.checkFileExists('template-example.json')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
})

test('file : validator can detect a missing schema', async function () {
  class MyFileFix extends FileBase {
    public async start (): Promise<void> {
      await sleep(Nb.One)
      this.fileContent = '{}'
      equal(this.couldContainsSchema('does-not-exist'), false)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
})

test('file : validator can detect an existing schema', async function () {
  class MyFileFix extends FileBase {
    public async start (): Promise<void> {
      await sleep(Nb.One)
      this.fileContent = `{
        "something": "else",
        "$schema": "https://json.schemastore.org/does-exist",
        "age": 42
      }`
      equal(this.couldContainsSchema('https://json.schemastore.org/does-exist'), true)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
})

test('file : validator can fix a missing schema', async function () {
  class MyFileFix extends FileBase {
    public async start (): Promise<void> {
      await sleep(Nb.One)
      this.fileContent = `{
        "something": "else",
        "age": 42
      }`
      equal(this.couldContainsSchema('https://json.schemastore.org/does-exist-too'), true)
      equal(this.fileContent, `{
        "$schema": "https://json.schemastore.org/does-exist-too",
        "something": "else",
        "age": 42
      }`)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ isQuiet: true }), true)
  await instance.start()
  await instance.end()
})

test.run()
