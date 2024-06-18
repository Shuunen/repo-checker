// biome-ignore lint/correctness/noNodejsModules: we are in a nodejs environment
import path from 'node:path'
import { clone, sleep } from 'shuutils'
import type { FileBase } from './file'
import { join } from './utils'

const baseKeys: (keyof FileBase)[] = ['fileExists', 'checkFileExists', 'folderPath', 'inspectFile', 'updateFile', 'initFile']

export async function promiseValue<Type>(value: Type) {
  await sleep(1)
  return value
}

export async function promiseTrue() {
  await sleep(1)
  return true
}

export async function promiseFalse() {
  await sleep(1)
  return false
}

export async function promiseVoid() {
  await sleep(1)
}

export const sourceFolder = path.dirname(__filename)

export const vueProjectFolder = join(sourceFolder, 'mocks', 'vueProject')

export const tsProjectFolder = join(sourceFolder, 'mocks', 'tsProject')

export const mocksProjectsFolder = join(sourceFolder, 'mocks')

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function cleanInstanceForSnap(instance: Readonly<FileBase>, ...bonusKeys: readonly string[]) {
  const clean = clone<Partial<FileBase>>(instance)
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-dynamic-delete
  for (const key of baseKeys) delete (clean as Record<string, unknown>)[key]
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/consistent-type-assertions
  for (const key of bonusKeys) if (key in clean) delete (clean as Record<string, unknown>)[key]
  return clean
}
