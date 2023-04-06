import { expect, it } from 'vitest'
import { check } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'
import { tsProjectFolder } from './utils'

it('check A folder fails with low max size', async () => {
  const data = new ProjectData({ maxSizeKo: 2, isPublishedPackage: true, isQuiet: true })
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const message = await check({ folderPath: repoCheckerPath, data }).catch((error: unknown) => (error as Error).message)
  expect(message).toMatchSnapshot()
})

it('check B folder succeed', async () => {
  const data = new ProjectData({ maxSizeKo: 120, isPublishedPackage: true, isQuiet: true })
  const { passed, failed, warnings } = await check({ folderPath: repoCheckerPath, data })
  expect(passed, 'passed').toMatchSnapshot()
  expect(failed, 'failed').toMatchSnapshot()
  expect(warnings, 'warnings').toMatchSnapshot()
})

it('check C data/tsProject', async () => {
  const data = new ProjectData({ isQuiet: true })
  const { passed, failed, warnings } = await check({ folderPath: tsProjectFolder, data, canThrow: false })
  expect(passed, 'passed').toMatchSnapshot()
  expect(failed, 'failed').toMatchSnapshot()
  expect(warnings, 'warnings').toMatchSnapshot()
})
