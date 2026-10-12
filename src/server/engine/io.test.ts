import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { diskIo, memoryIo } from './io.ts'

/**
 * Create a throwaway project folder with a 3Ko file, removed when the test ends
 * @returns the folder path
 */
async function makeFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), 'repo-check-io-'))
  await writeFile(path.join(folder, 'big.txt'), 'x'.repeat(3000))
  onTestFinished(() => rm(folder, { force: true, recursive: true }))
  return folder
}

describe('disk io', () => {
  it('reads a file', async () => {
    expect.hasAssertions()
    await expect(diskIo(await makeFolder()).readText('big.txt')).resolves.toHaveLength(3000)
  })

  it('reads a missing file as undefined', async () => {
    expect.hasAssertions()
    await expect(diskIo(await makeFolder()).readText('nope.txt')).resolves.toBeUndefined()
  })

  it('gives the size in Ko, rounded', async () => {
    expect.hasAssertions()
    await expect(diskIo(await makeFolder()).sizeKo('big.txt')).resolves.toBe(3)
  })

  it('gives no size for a missing file', async () => {
    expect.hasAssertions()
    await expect(diskIo(await makeFolder()).sizeKo('nope.txt')).resolves.toBeUndefined()
  })

  it('writes a file and serves the new content from its cache', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    const io = diskIo(folder)
    await expect(io.readText('new.txt')).resolves.toBeUndefined()
    await io.writeText('new.txt', 'hello')
    await expect(io.readText('new.txt')).resolves.toBe('hello')
    await expect(readFile(path.join(folder, 'new.txt'), 'utf8')).resolves.toBe('hello')
  })

  it('searches the files by content, skipping node_modules', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await mkdir(path.join(folder, 'src/deep'), { recursive: true })
    await mkdir(path.join(folder, 'node_modules/lib'), { recursive: true })
    await writeFile(path.join(folder, 'src/deep/a.ts'), 'ts-node src\n')
    await writeFile(path.join(folder, 'src/b.ts'), 'nothing\n')
    await writeFile(path.join(folder, 'node_modules/lib/c.ts'), 'ts-node src\n')
    const io = diskIo(folder)
    await expect(io.search(/ts-node/u)).resolves.toStrictEqual([path.join('src', 'deep', 'a.ts')])
    await expect(io.search(/ts-node/u, 'node_modules')).resolves.toStrictEqual([])
    await expect(io.search(/x{3000}/u, 'missing')).resolves.toStrictEqual([])
  })

  it('skips the files it cannot read when searching', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await writeFile(path.join(folder, 'locked.txt'), 'needle', { mode: 0o000 })
    await writeFile(path.join(folder, 'open.txt'), 'needle')
    await expect(diskIo(folder).search(/needle/u)).resolves.toStrictEqual(['open.txt'])
  })
})

describe('memory io', () => {
  it('reads, sizes and writes in the given object', async () => {
    expect.hasAssertions()
    const files: Record<string, string> = { 'a.txt': 'x'.repeat(1024) }
    const io = memoryIo(files)
    await expect(io.sizeKo('a.txt')).resolves.toBe(1)
    await expect(io.sizeKo('b.txt')).resolves.toBeUndefined()
    await io.writeText('b.txt', 'hello')
    expect(files['b.txt']).toBe('hello')
  })

  it('searches the files by content, under a folder, skipping node_modules', async () => {
    expect.hasAssertions()
    const io = memoryIo({ 'node_modules/x/a.js': 'needle', 'src/b.js': 'needle', 'src/c.js': 'hay', 'tests/d.js': 'needle' })
    await expect(io.search(/needle/gu)).resolves.toStrictEqual(['src/b.js', 'tests/d.js'])
    await expect(io.search(/needle/u, 'tests')).resolves.toStrictEqual(['tests/d.js'])
  })

  it('starts empty by default', async () => {
    expect.hasAssertions()
    await expect(memoryIo().readText('package.json')).resolves.toBeUndefined()
  })
})
