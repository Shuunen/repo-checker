import path from 'path'
import { sleep } from 'shuutils/dist/functions'

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

export const vueProjectFolder = path.join(testFolder, 'data', 'vueProject')

export const tsProjectFolder = path.join(testFolder, 'data', 'tsProject')


