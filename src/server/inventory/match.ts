import type { GithubRepo, LocalClone, Project } from '../../shared/project.ts'

/**
 * Turn one local clone into a project, with its GitHub repo when its origin points to one of the owner's repos. An origin that is not on GitHub counts as another owner
 * @param clone the local clone
 * @param repos the owner's repos, by slug
 * @param owner the owner login, lowercase
 * @returns the project
 */
function cloneToProject(clone: Readonly<LocalClone>, repos: ReadonlyMap<string, GithubRepo>, owner: string): Project {
  const github = clone.slug === undefined ? undefined : repos.get(clone.slug)
  const isOtherOwner = clone.problem === undefined && (clone.slug === undefined || !clone.slug.startsWith(`${owner}/`))
  return { github, isOtherOwner, local: clone, name: github?.name ?? clone.folderName }
}

/**
 * Match the local clones with the owner's GitHub repos by origin. A clone whose origin points to the owner but to no repo keeps `github` undefined, it is a broken clone
 * @param clones the local clones
 * @param repos the owner's GitHub repos
 * @param owner the owner login
 * @returns one project per clone, then one per repo that has no clone, sorted by name
 * @example const projects = matchProjects(await readClones(target, { shouldFetch: true }), await listRepos(ghCli, owner, login), owner)
 */
export function matchProjects(clones: readonly LocalClone[], repos: readonly GithubRepo[], owner: string) {
  const bySlug = new Map(repos.map(repo => [repo.slug, repo]))
  const local = clones.map(clone => cloneToProject(clone, bySlug, owner.toLowerCase()))
  const cloned = new Set(local.map(project => project.github?.slug))
  const remoteOnly = repos.filter(repo => !cloned.has(repo.slug)).map(repo => ({ github: repo, isOtherOwner: false, local: undefined, name: repo.name }))
  return [...local, ...remoteOnly].toSorted((first, second) => first.name.localeCompare(second.name))
}
