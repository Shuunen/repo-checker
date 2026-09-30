import { ProjectData } from '../constants'
import { cleanInstanceForSnap, vueProjectFolder } from '../mock'
import { GitFile } from './git'

describe('git', () => {
  it('git : detect a missing git ignore', async () => {
    expect.hasAssertions()
    const instance = new GitFile(vueProjectFolder, new ProjectData({ isQuiet: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })
})
