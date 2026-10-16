import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { applyEdits, modify, parse } from 'jsonc-parser'
import type { ActionResult, MetadataPreview, MetadataValues } from '../../shared/action.ts'
import type { GithubRepo } from '../../shared/project.ts'
import type { PackageJson } from '../engine/package-json.ts'
import { sortJson } from '../engine/sort-json.ts'
import { type GhRunner, getRepo } from '../inventory/github.ts'
import type { ActionOptions } from './action-options.ts'
import { checkFolderOfProjects, isRepoName } from './guards.ts'

/** The project config file, where the url of the deployed website is kept */
const configFile = '.repo-checker.json'

/**
 * Tell if a text is an http or https address
 * @param text the text
 * @returns true for a web address
 */
function isWebAddress(text: string) {
  return URL.canParse(text) && /^https?:$/u.test(new URL(text).protocol)
}

/**
 * Keep a package.json text value that is worth showing on GitHub
 * @param value the value
 * @returns the trimmed text, undefined when there is none
 */
function usable(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Read what the clone says locally: the description from its package.json, and the homepage of the deployed website from the `webUrl` of its `.repo-checker.json`. The `homepage` of the package.json is not that, it is the homepage of the source code, the repo
 * @param pkg the package.json of the clone
 * @param config the `.repo-checker.json` of the clone
 * @returns the local description and homepage, empty text for none
 */
function localValues(pkg: Readonly<PackageJson>, config: Readonly<{ webUrl?: unknown }>): MetadataValues {
  return { description: usable(pkg.description) ?? '', homepage: usable(config.webUrl) ?? '' }
}

/**
 * Pick what to propose: what GitHub has, else what the clone says locally
 * @param repo the repo as GitHub has it
 * @param local what the clone says
 * @returns the proposed description and homepage, empty text for none
 */
function proposal(repo: Readonly<GithubRepo>, local: Readonly<MetadataValues>): MetadataValues {
  return { description: repo.description ?? local.description, homepage: repo.homepage ?? local.homepage }
}

/**
 * Find the only clone of a repo and read its package.json
 * @param options the action options
 * @param options.git how the clones are read
 * @param options.target the folder of projects
 * @param repo the repo as GitHub has it
 * @returns the package.json, or the reason there is none
 */
async function readClonePackage({ git, target }: Readonly<ActionOptions>, repo: Readonly<GithubRepo>): Promise<{ config: { webUrl?: unknown }; folder: string; pkg: PackageJson } | { reason: string }> {
  const clones = await git.readClones(target, { shouldFetch: false })
  const matches = clones.filter(clone => clone.slug === repo.slug)
  const [clone] = matches
  if (clone === undefined || matches.length > 1) return { reason: `expected one clone of ${repo.slug} in ${target}, found ${matches.length}` }
  const text = await readFile(path.join(clone.path, 'package.json'), 'utf8').catch(() => undefined)
  return text === undefined ? { reason: `the clone of ${repo.slug} has no package.json to copy from` } : { config: parse((await readFile(path.join(clone.path, configFile), 'utf8').catch(() => undefined)) ?? '{}') as { webUrl?: unknown }, folder: clone.path, pkg: parse(text) as PackageJson }
}

/**
 * Set the fields on the repo on GitHub, and read the repo back to be sure a call that said ok did something
 * @param gh runs gh
 * @param slug the `owner/name` of the repo
 * @param fields the fields that differ from what GitHub has
 * @param fields.description the description to set, left out when it does not change
 * @param fields.homepage the homepage to set, left out when it does not change
 * @returns ok when GitHub has the values now, the reason otherwise
 */
async function patchRepo(gh: GhRunner, slug: string, fields: Readonly<Partial<MetadataValues>>): Promise<{ ok: true } | { ok: false; reason: string }> {
  const patched = await gh(['api', '--method', 'PATCH', `repos/${slug}`, ...Object.entries(fields).flatMap(([key, value]) => ['-f', `${key}=${value}`])])
  if (!patched.ok) return { ok: false, reason: `GitHub refused to change ${slug}: ${patched.stderr.trim()}` }
  const after = await getRepo(gh, slug)
  const isDone = (fields.description === undefined || (after?.description ?? '') === fields.description) && (fields.homepage === undefined || (after?.homepage ?? '') === fields.homepage)
  return isDone ? { ok: true } : { ok: false, reason: `GitHub said ok but ${slug} did not change, set it by hand on github.com` }
}

/**
 * Prove again that the repo is still there, alive and the same repo, and that the clone is the only one with a package.json
 * @param options the action options
 * @returns the repo as GitHub has it and the package.json, or the reason it is refused
 */
async function prove(options: Readonly<ActionOptions>): Promise<{ config: { webUrl?: unknown }; folder: string; pkg: PackageJson; repo: GithubRepo } | { reason: string }> {
  const { gh, name, owner, target } = options
  if (!isRepoName(name)) return { reason: `${name} is not a repo name` }
  const single = await checkFolderOfProjects(target)
  if (single !== undefined) return { reason: single }
  const slug = `${owner}/${name}`
  const repo = await getRepo(gh, slug)
  if (repo === undefined) return { reason: `${slug} does not exist on GitHub any more` }
  if (repo.isArchived) return { reason: `${slug} is archived now, it cannot be changed` }
  const found = await readClonePackage(options, repo)
  return 'reason' in found ? found : { ...found, repo }
}

/**
 * Write values in a JSON file with comments, keeping the rest of it as it is: an empty value removes its key, a file that does not exist is created
 * @param file the path of the file
 * @param edits the key and the value each one must have, empty text for none
 * @returns the keys that were changed, the file is only written when there is one
 */
async function updateJson(file: string, edits: readonly (readonly [key: string, value: string])[]) {
  const text = (await readFile(file, 'utf8').catch(() => undefined)) ?? '{}\n'
  const current = parse(text) as Record<string, unknown>
  const changed = edits.filter(([key, value]) => (usable(current[key]) ?? '') !== value)
  let updated = text
  for (const [key, value] of changed) updated = applyEdits(updated, modify(updated, [key], value === '' ? undefined : value, { formattingOptions: { insertSpaces: true, tabSize: 2 } }))
  if (changed.length > 0) await writeFile(file, sortJson(file, text, updated))
  return changed.map(([key]) => key)
}

/**
 * Save what the user confirmed in the clone: the description in the package.json, and the homepage as the `webUrl` of the `.repo-checker.json`. The `homepage` of the package.json is never touched, it is the homepage of the source code, not of the deployed website
 * @param folder the clone folder
 * @param description the description the user confirmed
 * @param homepage the homepage the user confirmed
 * @returns what was written, as sentences
 */
async function saveLocal(folder: string, description: string, homepage: string) {
  const inPackage = await updateJson(path.join(folder, 'package.json'), [['description', description]])
  const inConfig = await updateJson(path.join(folder, configFile), [['webUrl', homepage]])
  return [...(inPackage.length > 0 ? ['updated the description in package.json'] : []), ...(inConfig.length > 0 ? [`updated the webUrl in ${configFile}`] : [])]
}

/**
 * Say what copying the description and the homepage of the package.json of the clone to GitHub would set: what the package.json and GitHub have now, and the values proposed, which the user can edit before confirming
 * @param options what to read
 * @returns what the package.json and GitHub have now and the proposed values, refused with the reason when the proof fails
 * @example const preview = await previewSyncGithubMetadata({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', target })
 */
export async function previewSyncGithubMetadata(options: Readonly<ActionOptions>): Promise<MetadataPreview> {
  try {
    const proof = await prove(options)
    if ('reason' in proof) return { ok: false, reason: proof.reason }
    const github = { description: proof.repo.description ?? '', homepage: proof.repo.homepage ?? '' }
    const local = localValues(proof.pkg, proof.config)
    return { github, local, ok: true, proposed: proposal(proof.repo, local) }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Set the description and the homepage the user confirmed on the repo on GitHub and in the clone, only the ones that differ, after proving again that the repo is still there, alive and the same repo, and that the clone is the only one. The repo is read back from GitHub to be sure a call that said ok did something
 * @param options what to set
 * @param options.gh runs gh
 * @param options.git how the clones are read
 * @param options.name the repo name
 * @param options.owner the GitHub owner
 * @param options.target the folder of projects
 * @param values the description and the homepage to set, empty text clears one
 * @returns the result, refused with the reason when the proof fails. The clone is updated too: the description in its package.json and the homepage as `webUrl` in its `.repo-checker.json`, never the `homepage` of the package.json
 * @example const result = await syncGithubMetadata({ gh: ghCli, git: realGit, name: 'finga', owner: 'Shuunen', target }, { description: 'A game', homepage: '' })
 */
export async function syncGithubMetadata(options: Readonly<ActionOptions>, values: Readonly<MetadataValues>): Promise<ActionResult> {
  const { gh, name, owner } = options
  try {
    const proof = await prove(options)
    if ('reason' in proof) return { ok: false, reason: proof.reason }
    const [description, homepage] = [values.description.trim(), values.homepage.trim()]
    if (homepage !== '' && !isWebAddress(homepage)) return { ok: false, reason: `the homepage ${homepage} is not an http or https address` }
    const slug = `${owner}/${name}`
    const fields = {
      ...(description !== (proof.repo.description ?? '') && { description }),
      ...(homepage !== (proof.repo.homepage ?? '') && { homepage }),
    }
    const patch = Object.keys(fields).length === 0 ? undefined : await patchRepo(gh, slug, fields)
    if (patch?.ok === false) return patch
    const saved = await saveLocal(proof.folder, description, homepage)
    const done = [...(patch === undefined ? [] : [`set the ${Object.keys(fields).join(' and ')} of ${slug} on GitHub`]), ...saved]
    return done.length === 0 ? { ok: false, reason: `nothing to set: ${slug} and the project already have this description and homepage` } : { message: done.join(', '), ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}
