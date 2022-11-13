import { sleep } from 'shuutils/dist/functions'
import { join } from '../src/utils'

export const promiseValue = async <T> (value: T): Promise<T> => {
  await sleep(1)
  return value
}

export const promiseTrue = async (): Promise<true> => {
  await sleep(1)
  return true
}

export const promiseFalse = async (): Promise<false> => {
  await sleep(1)
  return false
}

export const promiseVoid = async (): Promise<void> => {
  await sleep(1)
  return
}

export const testFolder = __dirname

export const vueProjectFolder = join(testFolder, 'data', 'vueProject')

export const tsProjectFolder = join(testFolder, 'data', 'tsProject')


