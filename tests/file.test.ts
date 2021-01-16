import test from 'ava'
import { unlinkSync } from 'fs'
import path from 'path'
import { dataDefaults, repoCheckerPath } from '../src/constants'
import { File } from '../src/file'
import { createFile } from '../src/utils'

test('file validator', async t => {
  class MyFile extends File {
    async start (): Promise<void> {
      const filename = 'some-file.log'
      await createFile(repoCheckerPath, filename, 'Foobar content')
      await this.inspectFile(filename)
      t.is(this.nbPassed, 0)
      this.shouldContains('Foobar')
      t.is(this.nbPassed, 1)
      this.shouldContains('plop')
      t.is(this.nbPassed, 1)
      this.couldContains('world')
      t.is(this.nbPassed, 1)
      await this.checkFileExists('package.json')
      t.is(this.nbPassed, 2)
      await this.checkNoFileExists('zorglub.exe')
      t.is(this.nbPassed, 3)
      unlinkSync(path.join(repoCheckerPath, filename))
    }
  }
  const instance = new MyFile(repoCheckerPath, dataDefaults)
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  t.is(nbPassed, 3)
  t.is(nbFailed, 1)
})

/*
test('file validator with fix', async (t) => {
  class MyFileFix extends File {
    async start (): Promise<void> {
      const filename = '.nvmrc'
      const exists = await this.checkFileExists(filename)
      if (exists) unlinkSync(path.join(repoCheckerPath, filename))
      await this.checkFileExists(filename)
      await this.checkFileExists('missing-template.csv')
      const sizeKo = await this.getFileSizeInKo(filename)
      this.test(sizeKo < 2, 'nvmrc should be a small text file')
    }
  }
  const instance = new MyFileFix(repoCheckerPath, dataDefaults, true)
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  t.is(nbPassed, 3)
  t.is(nbFailed, 1)
})

test('file validator with fix & force', async (t) => {
  class MyFileFixForce extends File {
    async start (): Promise<void> {
      const filename = '.nvmrc'
      await this.inspectFile(filename)
      this.shouldContains('two dots', /\./g, 2)
      this.shouldContains('something not in a nvmrc file', /travers/)
    }
  }
  const instance = new MyFileFixForce(repoCheckerPath, dataDefaults, true, true)
  await instance.start()
  await instance.end()
  const { nbPassed, nbFailed } = instance
  t.is(nbPassed, 1)
  t.is(nbFailed, 1)
})
*/
