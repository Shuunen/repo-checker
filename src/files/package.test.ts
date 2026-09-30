import { ProjectData, repoCheckerPath } from '../constants'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid, tsProjectFolder, vueProjectFolder } from '../mock'
// eslint-disable-next-line max-dependencies
import { PackageJsonFile } from './package.file'

describe('package', () => {
  it('package A on repo checker', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance, 'fileContent', 'originalFileContent')).toMatchSnapshot() // need to remove fileContent & originalFileContent because they are polluting the snapshot
  })

  it('package B on ts project', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile(tsProjectFolder, new ProjectData({ isQuiet: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('package C ts project isUsing*', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile(tsProjectFolder, new ProjectData({ isPublishedPackage: true, isQuiet: true, isUsingC8: true, isUsingDependencyCruiser: true, isUsingEslint: true, isUsingShuutils: true, isUsingTailwind: true, isUsingTypescript: true, maxSizeKo: 0 }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('package D no file exists', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile('', new ProjectData({ isQuiet: true }))
    instance.checkFileExists = promiseFalse
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('package E vue project', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingVue: true }))
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('package F fix project', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile('', new ProjectData({ isQuiet: true, isUsingEslint: true, isUsingTypescript: true }), true)
    instance.fileExists = promiseTrue
    instance.inspectFile = promiseVoid
    instance.fileContent = `{
  "devDependencies": {
    "@types/jest": "^26.0.23",
    "node": "14.14.37",
  },
  "pnpm": {
    "overrides": {
      "tinypool": "0.8.0"
    }
  },
  "scripts": {
    "eslint": "eslint --ext .js,.ts,.vue src",
    "test": "npm run jest",
  }
}`
    await instance.start()
    await instance.end()
    expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
  })

  it('package G eslint cli without cache flag is left untouched when fix is disabled', async () => {
    expect.hasAssertions()
    const instance = new PackageJsonFile('', new ProjectData({ isQuiet: true, isUsingEslint: true }))
    const fileInitial = `{
  "devDependencies": {
    "eslint": "^9.0.0"
  },
  "scripts": {
    "lint": "eslint src"
  }
}`
    instance.fileExists = promiseTrue
    instance.inspectFile = promiseVoid
    instance.fileContent = fileInitial
    instance.updateFile = promiseVoid
    await instance.start()
    await instance.end()
    expect(instance.fileContent).toStrictEqual(fileInitial)
  })
})
