import path from 'node:path'
import { defineRule } from '../../engine/define-rule.ts'
import type { FileReader, ImageSize } from '../../engine/io.ts'

/** The files that hold markup, where links and media live */
const markupFile = /\.(?:astro|html|jsx|svelte|tsx|vue)$/u

/** A whole `<a>` tag, an arrow function inside an attribute may cut it short, which is fine */
const anchor = /<a\b[^>]*>/giu

/** A link to another site, an absolute url written in the tag */
const externalHref = /(?<![\w-])href=["']https?:\/\//iu

/** A `rel` that protects the page, or one computed by an expression that cannot be read */
const safeRel = /(?<![\w-])rel=(?:\{|["'][^"']*\b(?:noopener|noreferrer)\b)/iu

/** A `rel` written as text, so it can be completed */
const textRel = /(?<![\w-])rel=(?<quote>["'])/iu

/** The end of a tag, with the space before it */
const tagEnd = /\s*\/?>$/u

/** The rel added to the external links */
const addedRel = 'noopener noreferrer'

/**
 * Count the external links that carry no protective `rel`
 * @param text the markup text
 * @returns the count
 */
function countOpenLinks(text: string) {
  return [...text.matchAll(anchor)].filter(([tag]) => externalHref.test(tag) && !safeRel.test(tag)).length
}

/**
 * Protect the external links: complete their `rel` or give them one
 * @param text the markup text
 * @returns the text with every external link protected
 */
function protectLinks(text: string) {
  return text.replaceAll(anchor, tag => {
    if (!externalHref.test(tag) || safeRel.test(tag)) return tag
    return textRel.test(tag) ? tag.replace(textRel, `rel=$<quote>${addedRel} `) : tag.replace(tagEnd, end => ` rel="${addedRel}"${end}`)
  })
}

export const externalLinkRel = defineRule({
  appliesTo: ({ flags }) => flags.isWebPublished === true,
  async check({ files, report }) {
    const found = await files.search(externalHref)
    const candidates = found.filter(file => markupFile.test(file))
    const texts = await Promise.all(candidates.map(file => files.readText(file)))
    for (const [index, file] of candidates.entries()) {
      const count = countOpenLinks(String(texts[index]))
      if (count > 0) report({ data: { count, file }, fix: fixer => fixer.text(file, protectLinks), messageId: 'missing' })
    }
  },
  meta: { fixable: true, id: 'external-link-rel', messages: { missing: '{{file}} has {{count}} external link without rel="noopener" or rel="noreferrer"' }, severity: 'warning' },
})

/** An image or a video tag */
const media = /<(?:img|video)\b[^>]*>/giu

/** An image tag */
const image = /^<img\b/iu

/** A width written in the tag, or spread in by an expression */
const width = /(?<![\w-])width=|\{\.\.\./iu

/** A height written in the tag, or spread in by an expression */
const height = /(?<![\w-])height=|\{\.\.\./iu

/** The source of an image written as plain text, not computed */
const textSource = /(?<![\w:-])src=["'](?<source>[^"'{}$]+)["']/iu

/** A source that is not a file of the project: a url, a data uri */
const remoteSource = /^(?:[a-z][\w+.-]*:|\/\/)/iu

/** The end of a tag, with the space before it */
const mediaTagEnd = /\s*\/?>$/u

/**
 * List the places a source can point to: next to the markup file, or from the root of the site (`public` or `src` hold it)
 * @param file the markup file
 * @param source the source written in the tag
 * @returns the paths to try, relative to the project folder
 * @example imagePaths('src/App.tsx', '/logo.png') // ['public/logo.png', 'src/logo.png', 'logo.png']
 */
function imagePaths(file: string, source: string) {
  const clean = source.replace(/[?#].*$/u, '')
  if (clean.startsWith('/')) return ['public', 'src', ''].map(folder => path.posix.join(folder, clean))
  return [path.posix.join(path.posix.dirname(file), clean)]
}

/**
 * Find the first of some image files that exists and read its size
 * @param files the project files reader
 * @param candidates the paths to try
 * @returns the size, undefined when none is an image
 */
async function firstImageSize(files: FileReader, candidates: readonly string[]) {
  for (const candidate of candidates) {
    // oxlint-disable-next-line no-await-in-loop
    const size = await files.imageSize(candidate)
    if (size !== undefined) return size
  }
  return undefined
}

/**
 * Find the size of the images of a markup file, read from the image files themselves
 * @param files the project files reader
 * @param file the markup file
 * @param text the markup text
 * @returns the size by tag, the tags whose image is not found or not local are left out
 */
async function readImageSizes(files: FileReader, file: string, text: string) {
  const sizes = new Map<string, ImageSize>()
  for (const [tag] of text.matchAll(media)) {
    const source = image.test(tag) ? textSource.exec(tag)?.groups?.source : undefined
    if (source === undefined || remoteSource.test(source) || (width.test(tag) && height.test(tag))) continue
    // oxlint-disable-next-line no-await-in-loop
    const size = await firstImageSize(files, imagePaths(file, source))
    if (size !== undefined) sizes.set(tag, size)
  }
  return sizes
}

/**
 * Give the images the width and height of their file
 * @param text the markup text
 * @param sizes the size of the images by tag
 * @returns the text with the size written in the tags
 */
function addSizes(text: string, sizes: ReadonlyMap<string, ImageSize>) {
  return text.replaceAll(media, tag => {
    const size = sizes.get(tag)
    if (size === undefined) return tag
    const added = `${width.test(tag) ? '' : ` width="${size.width}"`}${height.test(tag) ? '' : ` height="${size.height}"`}`
    return tag.replace(mediaTagEnd, end => `${added}${end}`)
  })
}

/**
 * Count the images and videos that do not say their size
 * @param text the markup text
 * @returns the count
 */
function countUnsizedMedia(text: string) {
  return [...text.matchAll(media)].filter(([tag]) => !width.test(tag) || !height.test(tag)).length
}

export const mediaDimensions = defineRule({
  appliesTo: ({ flags }) => flags.isWebPublished === true,
  async check({ files, report }) {
    const found = await files.search(/<(?:img|video)\b/iu)
    const candidates = found.filter(file => markupFile.test(file))
    const texts = await Promise.all(candidates.map(file => files.readText(file)))
    for (const [index, file] of candidates.entries()) {
      const text = String(texts[index])
      const count = countUnsizedMedia(text)
      if (count === 0) continue
      // oxlint-disable-next-line no-await-in-loop
      const sizes = await readImageSizes(files, file, text)
      if (sizes.size > 0) report({ data: { count, file }, fix: fixer => fixer.text(file, current => addSizes(current, sizes)), messageId: 'missing' })
      else report({ data: { count, file }, messageId: 'missing' })
    }
  },
  meta: { fixable: true, id: 'media-dimensions', messages: { missing: '{{file}} has {{count}} <img> or <video> without width and height, the page jumps while they load' }, severity: 'warning' },
})
