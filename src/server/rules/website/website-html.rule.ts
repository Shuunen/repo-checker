import { defineRule } from '../../engine/define-rule.ts'

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

/** A width written in the tag, or spread in by an expression */
const width = /(?<![\w-])width=|\{\.\.\./iu

/** A height written in the tag, or spread in by an expression */
const height = /(?<![\w-])height=|\{\.\.\./iu

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
      const count = countUnsizedMedia(String(texts[index]))
      if (count > 0) report({ data: { count, file }, messageId: 'missing' })
    }
  },
  meta: { id: 'media-dimensions', messages: { missing: '{{file}} has {{count}} <img> or <video> without width and height, the page jumps while they load' }, severity: 'warning' },
})
