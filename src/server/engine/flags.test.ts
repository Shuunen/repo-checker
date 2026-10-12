import { detectFlags } from './flags.ts'
import { memoryIo } from './io.ts'

describe('flags detection', () => {
  it('only avoids sass in an empty project', async () => {
    expect.hasAssertions()
    await expect(detectFlags(memoryIo())).resolves.toStrictEqual({ isCli: false, isModule: false, isPublishedPackage: false, isUsingBun: false, isUsingDependencyCruiser: false, isUsingEslint: false, isUsingShuutils: false, isUsingTypescript: false, shouldAvoidSass: true })
  })

  it('detects the tools from package.json', async () => {
    expect.hasAssertions()
    const packageText = '{\n  "type": "module",\n  "scripts": { "start": "node . ", "postversion": "npm publish", "setup": "bun install" },\n  "devDependencies": { "dependency-cruiser": "1", "eslint": "9", "shuutils": "11", "typescript": "6" }\n}'
    await expect(detectFlags(memoryIo({ 'package.json': packageText }))).resolves.toMatchObject({ isCli: true, isModule: true, isPublishedPackage: true, isUsingBun: true, isUsingDependencyCruiser: true, isUsingEslint: true, isUsingShuutils: true, isUsingTypescript: true })
  })

  it('reads the repository name from the origin url', async () => {
    expect.hasAssertions()
    const gitConfig = '[remote "origin"]\n\turl = git@github.com:Shuunen/repo-checker.git\n'
    await expect(detectFlags(memoryIo({ '.git/config': gitConfig }))).resolves.toMatchObject({ repoId: 'repo-checker' })
  })

  it('reads an https origin url without .git', async () => {
    expect.hasAssertions()
    const gitConfig = '[remote "origin"]\n\turl = https://github.com/Shuunen/my.repo\n'
    await expect(detectFlags(memoryIo({ '.git/config': gitConfig }))).resolves.toMatchObject({ repoId: 'my.repo' })
  })

  it('lets .repo-checker.json win over the detection', async () => {
    expect.hasAssertions()
    const files = { '.repo-checker.json': '{ "isModule": false, "maxSizeKo": 80, "shouldAvoidSass": false }', 'package.json': '{ "type": "module" }' }
    await expect(detectFlags(memoryIo(files))).resolves.toMatchObject({ isModule: false, maxSizeKo: 80, shouldAvoidSass: false })
  })
})
