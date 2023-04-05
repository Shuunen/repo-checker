import { expect, it } from 'vitest'
import { DependencyCruiserFile } from '../../src/files'
import { log } from '../../src/logger'
import { promiseFalse } from '../utils'

it('dependency cruiser config missing file', async () => {
  log.disable()
  const instance = new DependencyCruiserFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(instance.passed, 'passed').toMatchSnapshot()
  expect(instance.failed, 'failed').toMatchSnapshot()
  expect(instance.warnings, 'warnings').toMatchSnapshot()
})
