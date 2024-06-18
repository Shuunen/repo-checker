import { expect, it } from 'vitest'
import { log } from '../logger'
import { cleanInstanceForSnap, promiseFalse } from '../mock'
import { DependencyCruiserFile } from './dependency-cruiser'

it('dependency cruiser config missing file', async () => {
  log.disable()
  const instance = new DependencyCruiserFile()
  instance.checkFileExists = promiseFalse
  await instance.start()
  await instance.end()
  expect(cleanInstanceForSnap(instance)).toMatchSnapshot()
})
