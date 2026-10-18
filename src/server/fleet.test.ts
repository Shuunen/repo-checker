import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { LocalClone, Project } from '../shared/project.ts'
import { driftOf, knownFleet, readFleet, rememberFleet } from './fleet.ts'

/**
 * Create a project whose clone holds a package.json, removed when the test ends
 * @param workspace the folder of the clones
 * @param name the project name
 * @param options what the project holds
 * @param options.dependencies the dependencies of its package.json, no package.json when left out
 * @param options.fields what to change on the project
 * @returns the project
 */
async function makeProject(workspace: string, name: string, { dependencies, fields = {} }: Readonly<{ dependencies?: Record<string, string>; fields?: Partial<Project> }> = {}): Promise<Project> {
  const folder = path.join(workspace, name)
  await mkdir(folder)
  if (dependencies !== undefined) await writeFile(path.join(folder, 'package.json'), JSON.stringify({ devDependencies: dependencies }))
  const local = { path: folder, problem: undefined } as LocalClone
  return { github: undefined, isOtherOwner: false, local, name, ...fields }
}

/**
 * Create a workspace, removed when the test ends
 * @returns its path
 */
async function makeWorkspace() {
  const workspace = await mkdtemp(path.join(tmpdir(), 'repo-check-fleet-'))
  onTestFinished(() => rm(workspace, { force: true, recursive: true }))
  return workspace
}

describe(readFleet, () => {
  it('counts the versions each package is declared at, once per project', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const projects = [await makeProject(workspace, 'a', { dependencies: { knip: '~6.0.0', vite: '~8.0.0' } }), await makeProject(workspace, 'b', { dependencies: { knip: '~6.0.0' } }), await makeProject(workspace, 'c', { dependencies: { knip: '~5.0.0' } })]
    const fleet = await readFleet(projects)
    expect(fleet.get('knip')).toStrictEqual(
      new Map([
        ['6.0.0', 2],
        ['5.0.0', 1],
      ]),
    )
    expect(fleet.get('vite')).toStrictEqual(new Map([['8.0.0', 1]]))
  })

  it('leaves out what is not a clone of the owner that is alive', async () => {
    expect.hasAssertions()
    const workspace = await makeWorkspace()
    const dependencies = { knip: '~6.0.0' }
    const projects = [
      await makeProject(workspace, 'none', { fields: { local: undefined } }),
      await makeProject(workspace, 'broken', { dependencies, fields: { local: { path: path.join(workspace, 'broken'), problem: 'no-git' } as LocalClone } }),
      await makeProject(workspace, 'other', { dependencies, fields: { isOtherOwner: true } }),
      await makeProject(workspace, 'archived', { dependencies, fields: { github: { isArchived: true } as Project['github'] } }),
      await makeProject(workspace, 'plain'),
    ]
    await expect(readFleet(projects)).resolves.toStrictEqual(new Map())
  })
})

describe(driftOf, () => {
  const fleet = new Map([
    [
      'knip',
      new Map([
        ['6.0.0', 3],
        ['5.0.0', 1],
      ]),
    ],
    [
      'vite',
      new Map([
        ['8.0.0', 1],
        ['7.0.0', 1],
        ['6.0.0', 1],
      ]),
    ],
    [
      'rare',
      new Map([
        ['2.0.0', 1],
        ['1.0.0', 1],
      ]),
    ],
    [
      'tie',
      new Map([
        ['2.0.0', 2],
        ['3.0.0', 2],
      ]),
    ],
    ['patchy', new Map([['6.0.1', 3]])],
  ])

  it('gives the most common version of the dependencies that are behind it', () => {
    expect.hasAssertions()
    const pkg = { devDependencies: { knip: '~5.0.0', patchy: '~6.0.0', rare: '1.0.0', tie: '1.0.0', vite: '~7.0.0' } }
    expect(driftOf(fleet, pkg)).toStrictEqual({ knip: { common: '6.0.0', projects: 3 }, tie: { common: '3.0.0', projects: 2 }, vite: { common: '8.0.0', projects: 1 } })
  })

  it('does not report a project that follows the others, is ahead of them or only a patch behind, or that is the only user', () => {
    expect.hasAssertions()
    expect(driftOf(fleet, { devDependencies: { knip: '~6.0.0', patchy: '~6.0.0', vite: '~9.0.0' } })).toStrictEqual({})
    expect(driftOf(fleet, { devDependencies: { alone: '1.0.0' } })).toStrictEqual({})
    expect(driftOf(fleet, undefined)).toStrictEqual({})
  })
})

describe('the remembered fleet', () => {
  it('is the one of the latest full scan', () => {
    expect.hasAssertions()
    const fleet = new Map([['knip', new Map([['6.0.0', 1]])]])
    rememberFleet(fleet)
    expect(knownFleet()).toBe(fleet)
  })
})
