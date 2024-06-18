import { expect, it } from 'vitest'
import { ProjectData } from '../constants'
import { cleanInstanceForSnap, vueProjectFolder } from '../mock'
import { GitFile } from './git'

it('git : detect a missing git ignore', async () => {
  const instance = new GitFile(vueProjectFolder, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
