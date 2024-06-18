import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../constants'
import { cleanInstanceForSnap, promiseTrue, promiseVoid, tsProjectFolder } from '../mock'
import { NpmRcFile } from './npmrc.file'

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
