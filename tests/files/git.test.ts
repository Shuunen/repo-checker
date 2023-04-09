import { expect, it } from 'vitest'
import { ProjectData } from '../../src/constants'
import { GitFile } from '../../src/files'
import { cleanInstanceForSnap, vueProjectFolder } from '../utils'

it('git : detect a missing git ignore', async () => {
  const instance = new GitFile(vueProjectFolder, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
