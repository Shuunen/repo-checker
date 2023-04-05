import { expect, it } from 'vitest'
import { ProjectData } from '../../src/constants'
import { GitFile } from '../../src/files'
import { vueProjectFolder } from '../utils'

it('git : detect a missing git ignore', async () => {
  const instance = new GitFile(vueProjectFolder, new ProjectData({ isQuiet: true }))
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
