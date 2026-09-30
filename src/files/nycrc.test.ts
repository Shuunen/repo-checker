import { ProjectData, repoCheckerPath } from '../constants'
import { cleanInstanceForSnap, promiseFalse, vueProjectFolder } from '../mock'
import { NycRcFile } from './nycrc'

describe('nycrc', () => {
  it('nyc rc A file exists', async () => {
    expect.hasAssertions()
    const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isQuiet: true, isUsingNyc: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('nyc rc B check skip on a non nyc/c8 project', async () => {
    expect.hasAssertions()
    const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('nyc rc C file missing', async () => {
    expect.hasAssertions()
    const instance = new NycRcFile(repoCheckerPath, new ProjectData({ isQuiet: true, isUsingNyc: true }))
    instance.fileExists = promiseFalse
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('nyc rc D file exists but not a json ext file', async () => {
    expect.hasAssertions()
    const instance = new NycRcFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingNyc: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })
})
