import { ProjectData } from '../constants'
import { cleanInstanceForSnap, promiseValue, vueProjectFolder } from '../mock'
import { TailwindFile } from './tailwind'

describe('tailwind', () => {
  it('tailwind : can detect valid config', async () => {
    expect.hasAssertions()
    const instance = new TailwindFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingTailwind: true }), true)
    instance.initFile = promiseValue // prevent file creation
    await instance.start()
    instance.fileName = '' // prevent file update
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })
})
