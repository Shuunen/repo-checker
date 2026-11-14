import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { run } from '../inventory/shell.ts'
import { diskIo, memoryIo, overlayIo } from './io.ts'

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

  it('gives the total size of a folder, nothing skipped', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await mkdir(path.join(folder, 'dist/deep'), { recursive: true })
    await writeFile(path.join(folder, 'dist/a.js'), 'x'.repeat(2000))
    await writeFile(path.join(folder, 'dist/deep/b.js'), 'x'.repeat(2000))
    await expect(diskIo(folder).sizeKo('dist')).resolves.toBe(4)
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

  it('creates the folders a new file needs', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await diskIo(folder).writeText('.github/workflows/ci.yml', 'name: ci')
    await expect(readFile(path.join(folder, '.github', 'workflows', 'ci.yml'), 'utf8')).resolves.toBe('name: ci')
  })

  it.each(['../outside.txt', 'a/../../outside.txt', '', '.'])('refuses to write the path "%s", it is outside the project or the folder itself', async file => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await expect(diskIo(folder).writeText(file, 'x')).rejects.toThrow('is outside the project folder, it is not written')
  })

  // Value: protects=a fix never writes outside the project through a symbolic link, to a folder or to a file; fails_when=writeInside stops resolving links; why_new=only `..` paths were refused; seam=none; no_claim=Windows junctions
  it.each([
    { file: 'link/x.txt', landing: 'x.txt', link: 'link', linkTarget: '', name: 'a linked folder' },
    { file: 'link.txt', landing: 'target.txt', link: 'link.txt', linkTarget: 'target.txt', name: 'a linked file' },
    { file: 'link/deep/x.txt', landing: 'deep/x.txt', link: 'link', linkTarget: '', name: 'a new folder under a linked folder' },
  ])('refuses to write through $name that points outside the project', async ({ file, landing, link, linkTarget }) => {
    expect.hasAssertions()
    const folder = await makeFolder()
    const outside = await makeFolder()
    await writeFile(path.join(outside, 'target.txt'), 'kept')
    await symlink(path.join(outside, linkTarget), path.join(folder, link))
    await expect(diskIo(folder).writeText(file, 'x')).rejects.toThrow('is outside the project folder, it is not written')
    await expect(readFile(path.join(outside, landing), 'utf8').catch(() => 'missing')).resolves.not.toBe('x')
  })

  it('writes through a linked folder that stays inside the project', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await mkdir(path.join(folder, 'real'))
    await symlink(path.join(folder, 'real'), path.join(folder, 'link'))
    await diskIo(folder).writeText('link/x.txt', 'hello')
    await expect(readFile(path.join(folder, 'real', 'x.txt'), 'utf8')).resolves.toBe('hello')
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
    await expect(io.search(/ts-node/u)).resolves.toStrictEqual(['src/deep/a.ts'])
    await expect(io.search(/ts-node/u, 'node_modules')).resolves.toStrictEqual([])
    await expect(io.search(/x{3000}/u, 'missing')).resolves.toStrictEqual([])
  })

  it('searches the files git knows when the folder is a repo, the ignored ones are left out', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await run('git', ['init', '--quiet'], folder)
    await mkdir(path.join(folder, '.next'), { recursive: true })
    await writeFile(path.join(folder, '.gitignore'), '.next\n')
    await writeFile(path.join(folder, '.next', 'built.js'), 'ts-node')
    await writeFile(path.join(folder, 'tracked.ts'), 'ts-node')
    await mkdir(path.join(folder, 'src'), { recursive: true })
    await writeFile(path.join(folder, 'src', 'new.ts'), 'ts-node')
    const io = diskIo(folder)
    await expect(io.search(/ts-node/u)).resolves.toStrictEqual(['src/new.ts', 'tracked.ts'])
    await expect(io.search(/ts-node/u, 'src')).resolves.toStrictEqual(['src/new.ts'])
  })

  it('skips the files it cannot read when searching', async () => {
    expect.hasAssertions()
    const folder = await makeFolder()
    await run('git', ['init', '--quiet'], folder)
    await writeFile(path.join(folder, 'gone.txt'), 'needle')
    await writeFile(path.join(folder, 'open.txt'), 'needle')
    await run('git', ['add', '--', 'gone.txt', 'open.txt'], folder)
    await rm(path.join(folder, 'gone.txt'))
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

describe('overlay io', () => {
  it('holds the writes in memory and leaves the base alone', async () => {
    expect.hasAssertions()
    const files: Record<string, string> = { 'a.txt': 'x'.repeat(1024) }
    const io = overlayIo(memoryIo(files))
    await expect(io.readText('a.txt')).resolves.toHaveLength(1024)
    await io.writeText('a.txt', 'hello')
    await io.writeText('b.txt', 'x'.repeat(2048))
    await expect(io.readText('a.txt')).resolves.toBe('hello')
    await expect(io.sizeKo('b.txt')).resolves.toBe(2)
    await expect(io.sizeKo('c.txt')).resolves.toBeUndefined()
    expect(files['a.txt']).toHaveLength(1024)
  })

  it('searches the base files with the changes on top', async () => {
    expect.hasAssertions()
    const io = overlayIo(memoryIo({ 'src/a.js': 'needle', 'src/b.js': 'needle', 'tests/c.js': 'needle' }))
    await io.writeText('src/b.js', 'hay')
    await io.writeText('src/d.js', 'needle')
    await expect(io.search(/needle/u)).resolves.toStrictEqual(['src/a.js', 'src/d.js', 'tests/c.js'])
    await expect(io.search(/needle/u, 'tests')).resolves.toStrictEqual(['tests/c.js'])
  })
})
