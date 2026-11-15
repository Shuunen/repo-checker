import { parse } from 'jsonc-parser'
import type { FixPlan, RemoteFix } from '../../../shared/action.ts'
import type { GithubRepo } from '../../../shared/project.ts'
import type { Io } from '../../engine/io.ts'
import type { PackageJson } from '../../engine/package-json.ts'
import type { ActionOptions } from '../action-options.ts'
import { patchRepo } from '../sync-github-metadata/github-metadata.ts'
import type { FixOptions } from './fix-plan.ts'

/** The rule whose finding the description set on GitHub settles */
const descriptionRule = 'missing-description'

/**
 * Plan what is set on GitHub besides the files: the description of the package.json, as it will be once the files are written, when the repo has none. Only when the page asks for it, for an own repo that is alive, and when the fix is not limited to another rule
 * @param options what to fix
 * @param found what the plan holds so far
 * @param found.io the files of the clone
 * @param found.plans the files the fixes change
 * @param found.repo the repo as GitHub has it, undefined when GitHub could not say
 * @returns the description to set, undefined when there is nothing to set
 */
export async function remoteOf(options: Readonly<FixOptions>, { io, plans, repo }: Readonly<{ io: Io; plans: readonly FixPlan[]; repo: Readonly<GithubRepo> | undefined }>): Promise<RemoteFix | undefined> {
  if (options.withRemote !== true || (options.rule !== undefined && options.rule !== descriptionRule)) return undefined
  if (repo === undefined || repo.isArchived || repo.isFork || repo.description !== undefined) return undefined
  const text = plans.find(plan => plan.file === 'package.json')?.after ?? (await io.readText('package.json'))
  const description = text === undefined ? undefined : (parse(text) as PackageJson).description
  return typeof description === 'string' && description.trim() !== '' ? { description: description.trim() } : undefined
}

/**
 * Set on GitHub what the plan holds besides the files, after they are written
 * @param options what to fix
 * @param options.gh runs gh
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param remote what to set, nothing is done when it is undefined
 * @returns the reason it failed, undefined when it worked or there was nothing to set
 */
export async function setRemote({ gh, name, owner }: Readonly<Pick<ActionOptions, 'gh' | 'name' | 'owner'>>, remote: Readonly<RemoteFix> | undefined) {
  if (remote === undefined) return undefined
  const set = await patchRepo(gh, `${owner}/${name}`, remote)
  return set.ok ? undefined : set.reason
}
