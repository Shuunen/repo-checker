/* eslint-disable jsdoc/require-jsdoc */
import path from 'node:path'
import { clone, sleep } from 'shuutils'
import type { Indicators } from './check.ts'
import type { FileBase } from './file.ts'
import { join } from './utils.ts'

const fileBaseKeysToDelete: (keyof FileBase)[] = ['fileExists', 'checkFileExists', 'folderPath', 'inspectFile', 'updateFile', 'initFile']
const indicatorsKeys: ReadonlyArray<keyof Indicators> = ['failed', 'passed', 'warnings'] as const

function cleanStringForSnap(input: string) {
  return (
    input
      // replace repo-check-1-40 by repo-check-x-yy
      .replace(/repo-check-\d-\d+/gu, 'repo-check-x-yy')
      // replace package-json-main-file-size-63ko by package-json-main-file-size-XYZko
      .replace(/package-json-main-file-size-\d+ko/gu, 'package-json-main-file-size-XYZko')
  )
}

// eslint-disable-next-line no-restricted-syntax
export function cleanUnknownValueForSnap<Type>(input: Type): Type {
  /* c8 ignore next 8 */
  /* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-type-assertion */
  if (typeof input === 'string') return cleanStringForSnap(input) as Type
  if (Array.isArray(input)) return input.map(item => cleanUnknownValueForSnap(item)) as Type
  if (typeof input === 'object') return JSON.parse(cleanStringForSnap(JSON.stringify(input))) as Type
  // eslint-disable-next-line no-restricted-syntax
  throw new Error(`cleanInstanceValueForSnap: unknown type ${typeof input}`)
  /* eslint-enable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-type-assertion */
}

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

// eslint-disable-next-line unicorn/prefer-module
export const sourceFolder = path.dirname(__filename)

export const vueProjectFolder = join(sourceFolder, 'mocks', 'vueProject')

export const tsProjectFolder = join(sourceFolder, 'mocks', 'tsProject')

export const mocksProjectsFolder = join(sourceFolder, 'mocks')

export function cleanIndicatorsForSnap(record?: Readonly<Record<string, unknown>>) {
  if (!record) return record
  const clean = clone(record)
  for (const key of indicatorsKeys) if (key in clean) clean[key] = cleanUnknownValueForSnap(clean[key])
  return clean
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function cleanInstanceForSnap(instance: Readonly<FileBase>, ...bonusKeys: readonly string[]) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const clean = clone<Partial<FileBase>>(instance) as Record<string, unknown>
  const keys = [...fileBaseKeysToDelete, ...bonusKeys] // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  for (const key of keys) if (key in clean) delete clean[key]
  return cleanIndicatorsForSnap(clean)
}
