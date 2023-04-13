// eslint-disable-next-line unicorn/import-style
import { dirname } from 'path'
import { clone, sleep } from 'shuutils'
import type { FileBase } from '../src/file'
import { join } from '../src/utils'

export async function promiseValue<Type> (value: Type): Promise<Type> {
  await sleep(1)
  return value
}

export async function promiseTrue (): Promise<true> {
  await sleep(1)
  return true
}

export async function promiseFalse (): Promise<false> {
  await sleep(1)
  return false
}

export async function promiseVoid (): Promise<void> {
  await sleep(1)
}

// eslint-disable-next-line putout/putout
export const testFolder = dirname(__filename)

export const vueProjectFolder = join(testFolder, 'data', 'vueProject')

export const tsProjectFolder = join(testFolder, 'data', 'tsProject')

export const dataProjectsFolder = join(testFolder, 'data')

export function cleanInstanceForSnap (instance: FileBase, ...bonusKeys: string[]) {
  const clean = clone<Partial<FileBase>>(instance)
  delete clean.folderPath
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/consistent-type-assertions
  for (const key of bonusKeys) if (key in clean) delete (clean as Record<string, unknown>)[key]
  return clean
}
