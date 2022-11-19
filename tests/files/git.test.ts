import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { ProjectData } from '../../src/constants'
import { GitFile } from '../../src/files'
import { vueProjectFolder } from '../utils'

test('git : detect a missing git ignore', async function () {
  const instance = new GitFile(vueProjectFolder, new ProjectData({ quiet: true }))
  await instance.start()
  await instance.end()
  const { passed, failed } = instance
  equal(passed, ['gitignore-has-no-pnpm-lock-exclusion'], 'passed')
  equal(failed, ['has-a-gitignore-file'], 'failed')
})
