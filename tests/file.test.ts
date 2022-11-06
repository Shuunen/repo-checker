import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { sleep } from 'shuutils/dist/functions'
import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { File } from '../src/file'
import { join } from '../src/utils'

const existingFilename = '.nvmrc'
const existingFilepath = join(repoCheckerPath, existingFilename)
const missingFilename = 'some-file.log'
const missingFilepath = join(repoCheckerPath, missingFilename)
const fakeContent = 'zorglub'

test('file : simple validator', async function () {
  class MyFile extends File {
    public async start (): Promise<void> {
      writeFileSync(missingFilepath, 'Foobar content')
      await this.inspectFile(missingFilename)
      equal(this.passed, [], 'test 1')
      this.shouldContains('Foobar')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 2')
      this.shouldContains('plop')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 3')
      this.couldContains('world')
      equal(this.passed, ['some-file-log-has-foobar'], 'test 4')
      await this.checkFileExists('package.json')
      equal(this.passed, ['some-file-log-has-foobar', 'has-a-package-json-file'], 'test 5')
      await this.checkNoFileExists('zorglub.exe')
      equal(this.passed, ['some-file-log-has-foobar', 'has-a-package-json-file', 'has-no-zorglub-exe-file'], 'test 6')
      unlinkSync(missingFilepath)
      this.shouldContains('two dots', /\./g, 2, true, 'hehe 2 dots', true)
    }
  }
  const instance = new MyFile(repoCheckerPath, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, ['some-file-log-has-foobar', 'has-a-package-json-file', 'has-no-zorglub-exe-file'], 'passed')
  equal(failed, ['some-file-log-does-not-have-plop-plop'], 'failed')
})

test('file : validator with fix', async function () {
  class MyFileFix extends File {
    public async start (): Promise<void> {
      await this.checkFileExists(existingFilename)
      unlinkSync(existingFilepath)
      await this.checkFileExists(existingFilename)
      await this.checkFileExists('missing-template.csv')
      const sizeKo = await this.getFileSizeInKo(existingFilename)
      this.test(sizeKo < 2, 'nvmrc should be a small text file')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }), true)
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
  class MyFileFixForce extends File {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      this.shouldContains('two dots', /\./g, 2)
      this.shouldContains('a regular nvmrc file content', /travers/)
      this.shouldContains('a super nvmrc file content', /travers is super/, 1, true, 'just say it', true)
      this.shouldContains('an extra nvmrc file content', /travers is extra/, 2, true, undefined, true)
      this.checkContains(/travers is extra/)
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ quiet: true }), true, true)
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, ['nvmrc-has-two-dots'], 'passed')
  equal(failed, ['nvmrc-does-not-have-a-regular-nvmrc-file-content-travers'], 'failed')
})

test('file : validator with fix & force, update a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends File {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ quiet: true }), true, true)
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, [], 'passed')
  equal(failed, [], 'failed')
  equal(readFileSync(existingFilepath, 'utf8'), fakeContent)
  writeFileSync(existingFilepath, originalContent) // restore the file
})

test('file : validator without force cannot fix a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends File {
    public async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.shouldContains('a weird stuff', /zorglub/)
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ quiet: true }), true, false)
  await instance.start()
  await instance.end()
  equal(readFileSync(existingFilepath, 'utf8'), originalContent)
})

test('file : validator with fix cannot fix if the template require data that is missing', async function () {
  class MyFileFix extends File {
    public async start (): Promise<void> {
      await this.checkFileExists('template-example.json')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }), true)
  await instance.start()
  await instance.end()
})

test('file : validator can detect a missing schema', async function () {
  class MyFileFix extends File {
    public async start (): Promise<void> {
      await sleep(1)
      this.fileContent = '{}'
      const ok = this.couldContainsSchema('does-not-exist')
      equal(ok, false)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
})

test('file : validator can detect an existing schema', async function () {
  class MyFileFix extends File {
    public async start (): Promise<void> {
      await sleep(1)
      this.fileContent = `{
        "something": "else",
        "$schema": "https://json.schemastore.org/does-exist",
        "age": 42
      }`
      const ok = this.couldContainsSchema('https://json.schemastore.org/does-exist')
      equal(ok, true)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
})

test('file : validator can fix a missing schema', async function () {
  class MyFileFix extends File {
    public async start (): Promise<void> {
      await sleep(1)
      this.fileContent = `{
        "something": "else",
        "age": 42
      }`
      const ok = this.couldContainsSchema('https://json.schemastore.org/does-exist-too')
      equal(ok, true)
      equal(this.fileContent, `{
        "$schema": "https://json.schemastore.org/does-exist-too",
        "something": "else",
        "age": 42
      }`)
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }), true)
  await instance.start()
  await instance.end()
})

test.run()
