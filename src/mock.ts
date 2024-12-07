/* eslint-disable jsdoc/require-jsdoc */
// biome-ignore lint/correctness/noNodejsModules: we are in a nodejs environment
import path from 'node:path'
import { clone, sleep } from 'shuutils'
import type { FileBase } from './file'
import { join } from './utils'
import type { check } from './check'

const fileBaseKeysToDelete: (keyof FileBase)[] = ['fileExists', 'checkFileExists', 'folderPath', 'inspectFile', 'updateFile', 'initFile']
const indicatorsKeys: ReadonlyArray<keyof Awaited<ReturnType<typeof check>>> = ['failed', 'passed', 'warnings'] as const

function cleanStringForSnap(input: string) {
  return input.replace(/repo-check-\d-\d+/gu, 'repo-check-x-yy') // replace repo-check-1-40 by repo-check-x-yy
}

function cleanUnknownValueForSnap<Type>(input: Type): Type {
  if (typeof input === 'string') return cleanStringForSnap(input) as Type
  if (Array.isArray(input)) return input.map(cleanUnknownValueForSnap) as Type
  if (typeof input === 'object') return JSON.parse(cleanStringForSnap(JSON.stringify(input))) as Type
  throw new Error(`cleanInstanceValueForSnap: unknown type ${typeof input}`)
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

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export function cleanInstanceForSnap(instance: Readonly<FileBase>, ...bonusKeys: readonly string[]) {
  const clean = clone<Partial<FileBase>>(instance) as Record<string, unknown>
  const keys = [...fileBaseKeysToDelete, ...bonusKeys] // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/consistent-type-assertions
  for (const key of keys) if (key in clean) delete (clean as Record<string, unknown>)[key]
  return cleanIndicatorsForSnap(clean)
}

export function cleanIndicatorsForSnap(record: Record<string, unknown>) {
  const clean = clone(record)
  for (const key of indicatorsKeys) if (key in clean) clean[key] = cleanUnknownValueForSnap(clean[key])
  return clean
}
