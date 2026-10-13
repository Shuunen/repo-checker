import type { GithubRepo, LocalClone } from '../../shared/project.ts'
import { matchProjects } from './match.ts'

/**
 * Build a clean local clone
 * @param folderName the folder name
 * @param slug the GitHub slug of its origin
 * @returns the clone
 */
function clone(folderName: string, slug: string | undefined): LocalClone {
  return {
    branches: [],
    changedFiles: [],
    currentBranch: 'master',
    fetchFailed: false,
    folderName,
    localOnlyBranches: [],
    origin: slug === undefined ? undefined : `git@github.com:${slug}.git`,
    path: `/projects/${folderName}`,
    problem: slug === undefined ? 'no-git' : undefined,
    slug,
    stashes: [],
    unpushed: [],
  }
}

/**
 * Build a GitHub repo of Shuunen
 * @param name the repo name
 * @returns the repo
 */
function repo(name: string): GithubRepo {
  return { defaultBranch: 'master', description: 'a repo', forkStatus: undefined, hasLicense: true, homepage: 'https://example.com', isArchived: false, isFork: false, isPrivate: false, name, owner: 'Shuunen', pushedAt: '2026-01-01T00:00:00Z', slug: `shuunen/${name.toLowerCase()}`, topics: ['tool'] }
}

describe('project matching', () => {
  it('matches clones and repos by origin, and lists the repos without clone', () => {
    expect.hasAssertions()
    const projects = matchProjects([clone('jozzo-local', 'shuunen/jozzo')], [repo('Jozzo'), repo('finga')], 'Shuunen')
    expect(projects.map(project => [project.name, project.local?.folderName, project.github?.name])).toStrictEqual([
      ['finga', undefined, 'finga'],
      ['Jozzo', 'jozzo-local', 'Jozzo'],
    ])
  })

  it('keeps a clone whose origin points to a missing repo of the owner, without github', () => {
    expect.hasAssertions()
    expect(matchProjects([clone('gone', 'shuunen/gone')], [], 'shuunen')).toStrictEqual([{ github: undefined, isOtherOwner: false, local: clone('gone', 'shuunen/gone'), name: 'gone' }])
  })

  it('marks the clones of another owner', () => {
    expect.hasAssertions()
    expect(matchProjects([clone('lib', 'someone/lib')], [], 'Shuunen')).toMatchObject([{ github: undefined, isOtherOwner: true, name: 'lib' }])
  })

  it('treats an origin that is not on GitHub as another owner', () => {
    expect.hasAssertions()
    const gitlab = { ...clone('lab', 'x/lab'), origin: 'https://gitlab.com/x/lab.git', slug: undefined }
    expect(matchProjects([gitlab], [], 'Shuunen')).toMatchObject([{ github: undefined, isOtherOwner: true, name: 'lab' }])
  })

  it('keeps a folder that is not a usable clone, under its folder name', () => {
    expect.hasAssertions()
    expect(matchProjects([clone('migrate-to-base', undefined)], [], 'Shuunen')).toMatchObject([{ github: undefined, isOtherOwner: false, name: 'migrate-to-base' }])
  })
})
