import { expect, it } from 'vitest'
import { DependencyCruiserFile } from '../../src/files'
import { log } from '../../src/logger'
import { cleanInstanceForSnap, promiseFalse } from '../utils'

it('dependency cruiser config missing file', async () => {
  log.disable()
  const instance = new DependencyCruiserFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
