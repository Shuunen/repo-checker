import { Nb, sleep } from 'shuutils'
import { join } from '../src/utils'

export const promiseValue = async <T> (value: T): Promise<T> => {
  await sleep(Nb.One)
  return value
}

export const promiseTrue = async (): Promise<true> => {
  await sleep(Nb.One)
  return true
}

export const promiseFalse = async (): Promise<false> => {
  await sleep(Nb.One)
  return false
}

export const promiseVoid = async (): Promise<void> => {
  await sleep(Nb.One)
  return
}

export const testFolder = __dirname

export const vueProjectFolder = join(testFolder, 'data', 'vueProject')

export const tsProjectFolder = join(testFolder, 'data', 'tsProject')


