/**
 * Find the web manifests of a project.
 * @module
 */
import { isPlainObject } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import type { FileReader } from './io.ts'

/** What a web manifest file is called: `manifest.json`, or anything ending in `.webmanifest` */
const manifestName = /(?:^|\/)manifest\.json$|\.webmanifest$/u

/** A manifest found in the project */
export interface Manifest {
  /** The path of the manifest, relative to the project folder */
  file: string
  /** The parsed manifest */
  content: Record<string, unknown>
}

/**
 * Find the web manifests of a project, wherever git sees them. A browser extension manifest (`manifest_version`) and a file that is not a json object are not web manifests
 * @param files the reader of the project files
 * @returns the manifests, in path order, none when the project has no web manifest
 * @example await findManifests(diskIo(folder)) // [{ file: 'public/manifest.json', content: { name: 'app' } }]
 */
export async function findManifests(files: Readonly<FileReader>): Promise<Manifest[]> {
  const all = await files.search(/\S/u)
  const found = all.filter(file => manifestName.test(file))
  const texts = await Promise.all(found.map(file => files.readText(file)))
  const manifests = found.map((file, index) => ({ content: parse(String(texts[index])) as unknown, file }))
  return manifests.filter((manifest): manifest is Manifest => isPlainObject(manifest.content) && !('manifest_version' in manifest.content))
}
