import { expect, it } from 'vitest'
import { ProjectData, repoCheckerPath } from '../../src/constants'
import { PackageJsonFile } from '../../src/files'
import { cleanInstanceForSnap, promiseFalse, promiseTrue, promiseVoid, tsProjectFolder, vueProjectFolder } from '../utils'

it('package A on repo checker', async () => {
  const instance = new PackageJsonFile(repoCheckerPath, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance, 'fileContent', 'originalFileContent')).toMatchSnapshot() // need to remove fileContent & originalFileContent because they are polluting the snapshot
})

it('package B on ts project', async () => {
  const instance = new PackageJsonFile(tsProjectFolder, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('package C ts project isUsing*', async () => {
  const instance = new PackageJsonFile(tsProjectFolder, new ProjectData({ isPublishedPackage: true, isQuiet: true, isUsingC8: true, isUsingDependencyCruiser: true, isUsingEslint: true, isUsingShuutils: true, isUsingTailwind: true, isUsingTypescript: true, maxSizeKo: 0 }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('package D no file exists', async () => {
  const instance = new PackageJsonFile('', new ProjectData({ isQuiet: true }))
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('package E vue project', async () => {
  const instance = new PackageJsonFile(vueProjectFolder, new ProjectData({ isQuiet: true, isUsingVue: true }))
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})

it('package F fix project', async () => {
  const instance = new PackageJsonFile('', new ProjectData({ isQuiet: true, isUsingEslint: true, isUsingTypescript: true }), true)
  instance.fileExists = promiseTrue
  instance.inspectFile = promiseVoid
  instance.fileContent = `{
    "devDependencies": {
      "@types/jest": "^26.0.23",
      "node": "14.14.37",
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
