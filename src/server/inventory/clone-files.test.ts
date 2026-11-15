import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { readCloneFiles } from './clone-files.ts'

/**
 * Read the files of a clone made of the given files
 * @param files the files by name
 * @returns the facts
 */
async function readWith(files: Readonly<Record<string, string>>) {
  const folder = await mkdtemp(path.join(tmpdir(), 'clone-files-'))
  try {
    await Promise.all(Object.entries(files).map(([name, text]) => writeFile(path.join(folder, name), text)))
    return await readCloneFiles(folder)
  } finally {
    await rm(folder, { force: true, recursive: true })
  }
}

describe(readCloneFiles, () => {
  it('reads the version and the vite ports', async () => {
    expect.hasAssertions()
    await expect(readWith({ 'package.json': '{"version":"1.2.0"}', 'vite.config.ts': 'server: { port: 5105 }' })).resolves.toStrictEqual({ hasPackageJson: true, packageVersion: '1.2.0', vitePorts: { preview: undefined, server: 5105 } })
  })

  it('has nothing for an empty clone', async () => {
    expect.hasAssertions()
    await expect(readWith({})).resolves.toStrictEqual({ hasPackageJson: false, packageVersion: undefined, vitePorts: undefined })
  })

  it('has no version for a package.json without one or that is broken', async () => {
    expect.hasAssertions()
    await expect(readWith({ 'package.json': '{"version":2}' })).resolves.toMatchObject({ hasPackageJson: true, packageVersion: undefined })
    await expect(readWith({ 'package.json': '{' })).resolves.toMatchObject({ hasPackageJson: true, packageVersion: undefined })
  })
})
