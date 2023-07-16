import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { NpmRcFile } from '../../src/files/npmrc.file'
import { cleanInstanceForSnap, promiseTrue, promiseVoid, tsProjectFolder } from '../utils'

it('npm rc A file exists & hasTaskPrefix', async () => {
  const instance = new NpmRcFile(repoCheckerPath, new ProjectData({ hasTaskPrefix: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('npm rc B file exists & !hasTaskPrefix', async () => {
  const instance = new NpmRcFile(repoCheckerPath, new ProjectData({ hasTaskPrefix: false, isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('npm rc C file !exists & hasTaskPrefix', async () => {
  const instance = new NpmRcFile(tsProjectFolder, new ProjectData({ hasTaskPrefix: true, isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('npm rc D fix file', async () => {
  const instance = new NpmRcFile('', new ProjectData({ hasTaskPrefix: true, isQuiet: true }), true)
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = ''
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
