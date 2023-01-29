// eslint-disable-next-line no-restricted-imports, unicorn/import-style
import { dirname } from 'path'
import { Nb, sleep } from 'shuutils'
import { join } from '../src/utils'

export async function promiseValue<Type> (value: Type): Promise<Type> {
  await sleep(Nb.One)
  return value
}

export async function promiseTrue (): Promise<true> {
  await sleep(Nb.One)
  return true
}

export async function promiseFalse (): Promise<false> {
  await sleep(Nb.One)
  return false
}

export async function promiseVoid (): Promise<void> {
  await sleep(Nb.One)
}

// eslint-disable-next-line putout/putout
export const testFolder = dirname(__filename)

export const vueProjectFolder = join(testFolder, 'data', 'vueProject')

export const tsProjectFolder = join(testFolder, 'data', 'tsProject')
