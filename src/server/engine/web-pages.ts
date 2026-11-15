/**
 * Find the index.html pages of a project and read their theme color.
 * @module
 */
import type { FileReader } from './io.ts'

/** The theme color meta tag, whatever the order of its attributes */
export const themeColorMeta = /<meta\b(?=[^>]*\bname=["']theme-color["'])[^>]*>/iu

/** The content of a theme color meta tag */
const themeColorContent = /\bcontent=["'](?<color>[^"']*)["']/iu

/**
 * Read the color of the theme color meta tag of a page
 * @param html the text of the page
 * @returns the content of the tag as written, undefined when there is no tag or no content
 * @example metaThemeColor('<meta name="theme-color" content="#fff" />') // '#fff'
 */
export function metaThemeColor(html: string) {
  return themeColorContent.exec(themeColorMeta.exec(html)?.[0] ?? '')?.groups?.color
}

/** What makes an html file a page, so a partial or a template is not asked for a mark */
const pagePattern = /<(?:!doctype|head|html)\b/iu

/** An index.html page with its text */
export interface Page {
  /** The path of the page */
  file: string
  /** The text of the page */
  text: string
}

/**
 * Find the index.html pages of a project: the root one and every page under `src`
 * @param files the reader of the project files
 * @returns the pages with their text
 */
export async function findPages(files: Readonly<FileReader>): Promise<Page[]> {
  const [root, nested] = await Promise.all([files.readText('index.html'), files.search(pagePattern, 'src')])
  const pages = [...(root === undefined ? [] : ['index.html']), ...nested.filter(file => file.endsWith('/index.html'))]
  const texts = await Promise.all(pages.map(file => files.readText(file)))
  return pages.map((file, index) => ({ file, text: String(texts[index]) }))
}
