import { readFileSync, unlinkSync, writeFileSync } from 'fs'
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

test('simple validator', async function () {
  class MyFile extends File {
    async start (): Promise<void> {
      writeFileSync(missingFilepath, 'Foobar content')
      await this.inspectFile(missingFilename)
      equal(this.nbPassed, 0)
      this.shouldContains('Foobar')
      equal(this.nbPassed, 1)
      this.shouldContains('plop')
      equal(this.nbPassed, 1)
      this.couldContains('world')
      equal(this.nbPassed, 1)
      await this.checkFileExists('package.json')
      equal(this.nbPassed, 2)
      await this.checkNoFileExists('zorglub.exe')
      equal(this.nbPassed, 3)
      unlinkSync(missingFilepath)
      this.shouldContains('two dots', /\./g, 2, true, 'hehe 2 dots', true)
    }
  }
  const instance = new MyFile(repoCheckerPath, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 3)
  equal(nbFailed, 1)
})

test('validator with fix', async function () {
  class MyFileFix extends File {
    async start (): Promise<void> {
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
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 3)
  equal(nbFailed, 1)
})

test('validator with fix & force, overwrite a problematic file with template', async function () {
  class MyFileFixForce extends File {
    async start (): Promise<void> {
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
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 1)
  equal(nbFailed, 1)
})

test('validator with fix & force, update a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends File {
    async start (): Promise<void> {
      await this.inspectFile(existingFilename)
      originalContent = this.fileContent
      this.fileContent = fakeContent
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, new ProjectData({ quiet: true }), true, true)
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  equal(nbPassed, 0)
  equal(nbFailed, 0)
  equal(readFileSync(existingFilepath, 'utf8'), fakeContent)
  writeFileSync(existingFilepath, originalContent) // restore the file
})

test('validator without force cannot fix a problematic file on the go', async function () {
  let originalContent = ''
  class MyFileFixForce extends File {
    async start (): Promise<void> {
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

test('validator with fix cannot fix if the template require data that is missing', async function () {
  class MyFileFix extends File {
    async start (): Promise<void> {
      await this.checkFileExists('template-example.json')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, new ProjectData({ quiet: true }), true)
  await instance.start()
  await instance.end()
})

test.run()
