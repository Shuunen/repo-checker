import { defineRule } from '../../engine/define-rule.ts'
import { findPages, metaThemeColor, themeColorMeta } from '../../engine/web-pages.ts'
import { addToHead, readAttribute, setAttribute, sortHead } from './html.utils.ts'

/** The unique-mark meta tag, whatever the order of its attributes */
const uniqueMarkMeta = /<meta\b(?=[^>]*\bname=["']unique-mark["'])[^>]*>/iu

/** The viewport meta tag, whatever the order of its attributes */
const viewportMeta = /<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/iu

/** The icon link, `rel="icon"` or `rel="shortcut icon"` */
const iconLink = /<link\b(?=[^>]*\brel=["'](?:shortcut )?icon["'])[^>]*>/iu

/** The favicon files a page can link, with the type of the link */
const favicons = [
  { file: 'public/favicon.svg', type: 'image/svg+xml' },
  { file: 'public/favicon.ico', type: 'image/x-icon' },
  { file: 'public/favicon.png', type: 'image/png' },
]

/** The description meta tag, whatever the order of its attributes */
const descriptionMeta = /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/iu

/** The opening `<html>` tag */
const htmlTag = /<html\b(?<attributes>[^>]*)>/iu

export const indexHtmlUniqueMark = defineRule({
  async check({ files, report }) {
    for (const { file, text } of await findPages(files)) if (!uniqueMarkMeta.test(text)) report({ data: { file }, fix: fixer => fixer.text(file, current => addToHead(current, '<meta name="unique-mark" content="" />')), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'index-html-unique-mark', messages: { missing: '{{file}} has no <meta name="unique-mark" content="" /> tag' }, severity: 'warning' },
})

export const indexHtmlLang = defineRule({
  async check({ files, report }) {
    for (const { file, text } of await findPages(files)) {
      const attributes = htmlTag.exec(text)?.groups?.attributes
      if (attributes === undefined || /\blang=["'][^"']+["']/iu.test(attributes)) continue
      report({ data: { file }, fix: fixer => fixer.text(file, current => current.replace(htmlTag, (_tag, rest: string) => `<html lang="en"${rest}>`)), messageId: 'missing' })
    }
  },
  meta: { fixable: true, id: 'index-html-lang', messages: { missing: '{{file}} has no <html lang="..."> attribute, screen readers and translators need the language' }, severity: 'warning' },
})

export const indexHtmlViewport = defineRule({
  async check({ files, report }) {
    for (const { file, text } of await findPages(files)) if (!viewportMeta.test(text)) report({ data: { file }, fix: fixer => fixer.text(file, current => addToHead(current, '<meta name="viewport" content="width=device-width, initial-scale=1.0" />')), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'index-html-viewport', messages: { missing: '{{file}} has no <meta name="viewport"> tag, a phone would show the desktop layout' }, severity: 'warning' },
})

export const indexHtmlIcon = defineRule({
  async check({ files, report }) {
    const pages = await findPages(files)
    const texts = await Promise.all(favicons.map(item => files.readText(item.file)))
    const favicon = favicons[texts.findIndex(text => text !== undefined)]
    for (const { file } of pages.filter(page => !iconLink.test(page.text))) {
      const link = favicon === undefined ? undefined : `<link rel="icon" type="${favicon.type}" href="/${favicon.file.replace('public/', '')}" />`
      report({ data: { file }, fix: fixer => (link === undefined ? [] : fixer.text(file, current => addToHead(current, link))), messageId: 'missing' })
    }
  },
  meta: { fixable: true, id: 'index-html-icon', messages: { missing: '{{file}} has no <link rel="icon"> tag, the browser tab would show a blank icon' }, severity: 'info' },
})

export const indexHtmlDescription = defineRule({
  async check({ files, pkg, report }) {
    const description = pkg?.description?.replaceAll('"', '&quot;')
    for (const { file, text } of await findPages(files))
      if (!descriptionMeta.test(text)) report({ data: { file }, fix: fixer => (description === undefined || description === '' ? [] : fixer.text(file, current => addToHead(current, `<meta name="description" content="${description}" />`))), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'index-html-description', messages: { missing: '{{file}} has no <meta name="description"> tag, search engines show it under the title' }, severity: 'info' },
})

export const indexHtmlThemeColor = defineRule({
  appliesTo: ({ flags }) => flags.themeColor !== undefined,
  async check({ files, flags, report }) {
    const color = String(flags.themeColor)
    const tag = `<meta name="theme-color" content="${color}" />`
    for (const { file, text } of await findPages(files)) {
      const isMissing = !themeColorMeta.test(text)
      if (isMissing || metaThemeColor(text) !== color) report({ data: { color, file }, fix: fixer => fixer.text(file, current => (isMissing ? addToHead(current, tag) : current.replace(themeColorMeta, () => tag))), messageId: isMissing ? 'missing' : 'different' })
    }
  },
  meta: {
    fixable: true,
    id: 'index-html-theme-color',
    messages: { different: '{{file}} has a <meta name="theme-color"> that is not the themeColor {{color}}', missing: '{{file}} has no <meta name="theme-color"> tag, a phone would not color its browser bar' },
    severity: 'info',
  },
})

/**
 * Build a rule that checks a tag already written in the pages carries the theme color, and never adds the tag
 * @param options the rule
 * @param options.attribute the attribute that holds the color, like `content`
 * @param options.id the rule id
 * @param options.label what the tag is, for the message
 * @param options.pattern the tag
 * @returns the rule
 */
function followThemeColor({ attribute, id, label, pattern }: Readonly<{ attribute: string; id: string; label: string; pattern: RegExp }>) {
  return defineRule({
    appliesTo: ({ flags }) => flags.themeColor !== undefined,
    async check({ files, flags, report }) {
      const color = String(flags.themeColor)
      for (const { file, text } of await findPages(files)) {
        const tag = pattern.exec(text)?.[0]
        if (tag !== undefined && readAttribute(tag, attribute) !== color) report({ data: { color, file }, fix: fixer => fixer.text(file, current => current.replace(pattern, found => setAttribute(found, attribute, color))), messageId: 'different' })
      }
    },
    meta: { fixable: true, id, messages: { different: `{{file}} has a ${label} that is not the themeColor {{color}}` }, severity: 'info' },
  })
}

export const indexHtmlTileColor = followThemeColor({ attribute: 'content', id: 'index-html-tile-color', label: '<meta name="msapplication-TileColor">', pattern: /<meta\b(?=[^>]*\bname=["']msapplication-TileColor["'])[^>]*>/iu })

export const indexHtmlMaskIconColor = followThemeColor({ attribute: 'color', id: 'index-html-mask-icon-color', label: '<link rel="mask-icon"> color', pattern: /<link\b(?=[^>]*\brel=["']mask-icon["'])[^>]*>/iu })

export const indexHtmlHeadSorted = defineRule({
  async check({ files, report }) {
    for (const { file, text } of await findPages(files)) if (sortHead(text) !== text) report({ data: { file }, fix: fixer => fixer.text(file, sortHead), messageId: 'unsorted' })
  },
  meta: { fixable: true, id: 'index-html-head-sorted', messages: { unsorted: 'the <head> of {{file}} is not sorted or has blank lines between its tags' }, severity: 'info' },
})
