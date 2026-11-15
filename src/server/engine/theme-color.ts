/**
 * Detect the theme color of a project: the color of its web manifest, else of its index.html pages, else of its VS Code title bar.
 * @module
 */
import { isPlainObject } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import { normalizeColor } from './color.ts'
import type { FileReader } from './io.ts'
import { findManifests } from './manifest.ts'
import { findPages, metaThemeColor } from './web-pages.ts'

/** The white that old versions of repo-check wrote as a default, so a white found in a file is a placeholder, not a choice. Only `.repo-checker.json` can declare it */
const placeholder = '#ffffff'

/**
 * Normalize a color found in a file and ignore the white placeholder
 * @param color anything, like the content of a meta tag
 * @returns the normalized color, undefined when it is not a color or the placeholder
 */
function chosenColor(color: unknown) {
  const normalized = normalizeColor(color)
  return normalized === placeholder ? undefined : normalized
}

/**
 * Read the title bar color of the VS Code settings
 * @param files the reader of the project files
 * @returns the normalized color, undefined when the settings do not set one
 */
async function readTitleBar(files: Readonly<FileReader>) {
  const text = await files.readText('.vscode/settings.json')
  const settings = parse(text ?? '') as Record<string, unknown> | undefined
  const colors = settings?.['workbench.colorCustomizations']
  return isPlainObject(colors) ? chosenColor(colors['titleBar.activeBackground']) : undefined
}

/**
 * Detect the theme color of a project, nothing is guessed: it must be written somewhere, and not be the white placeholder
 * @param files the reader of the project files
 * @returns the normalized color, undefined when no place gives one
 * @example await detectThemeColor(diskIo(folder)) // '#024eb8'
 */
export async function detectThemeColor(files: Readonly<FileReader>) {
  const manifests = await findManifests(files)
  const fromManifest = manifests.map(({ content }) => chosenColor(content.theme_color)).find(color => color !== undefined)
  if (fromManifest !== undefined) return fromManifest
  const pages = await findPages(files)
  return pages.map(({ text }) => chosenColor(metaThemeColor(text))).find(color => color !== undefined) ?? (await readTitleBar(files))
}
