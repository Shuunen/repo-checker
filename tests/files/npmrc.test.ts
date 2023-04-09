import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { NpmRcFile } from '../../src/files/npmrc.file'
import { cleanInstanceForSnap, tsProjectFolder } from '../utils'

it('npm rc A file exists & hasTaskPrefix', async () => {
  const instance = new NpmRcFile(repoCheckerPath, new ProjectData({ isQuiet: true, hasTaskPrefix: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('npm rc B file exists & !hasTaskPrefix', async () => {
  const instance = new NpmRcFile(repoCheckerPath, new ProjectData({ isQuiet: true, hasTaskPrefix: false }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('npm rc C file !exists & hasTaskPrefix', async () => {
  const instance = new NpmRcFile(tsProjectFolder, new ProjectData({ isQuiet: true, hasTaskPrefix: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
