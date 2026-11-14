/** The `<head>` of a page, with its opening tag, its content and the indented closing tag */
const headPattern = /(?<open><head\b[^>]*>)(?<inner>[\s\S]*?)(?<closing>[^\S\n]*<\/head>)/iu

/** A child of the head, with the comments written above it, followed by the blanks after it */
const headChild = /(?<comments>(?:<!--[\s\S]*?-->\s*)*)(?<element><(?<name>script|style|title|noscript|template)\b[\s\S]*?<\/\k<name>\s*>|<(?:meta|link|base)\b[^>]*>)\s*/giu

/** The head tags in the order they are written, each with what it matches on the lowercased tag, the others come last */
const headOrder = [
  /^<meta\b[^>]*\bcharset\b/u,
  /^<meta\b(?=[^>]*\bname=["']viewport["'])/u,
  /^<title\b/u,
  /^<meta\b/u,
  /^<base\b/u,
  /^<link\b(?=[^>]*\brel=["'][^"']*\b(?:icon|manifest|mask-icon)\b)/u,
  /^<link\b(?=[^>]*\brel=["'](?:dns-prefetch|modulepreload|preconnect|prefetch|preload)["'])/u,
  /^<(?:link\b(?=[^>]*\brel=["']stylesheet["'])|style\b)/u,
  /^<script\b/u,
]

/**
 * Give the place of a head tag: charset, viewport, title, other meta, base, icons and manifest, preconnect and preload, styles, scripts, then the rest
 * @param element the tag
 * @returns the rank, lower comes first
 */
function rankHeadTag(element: string) {
  const index = headOrder.findIndex(pattern => pattern.test(element))
  return index === -1 ? headOrder.length : index
}

/**
 * Sort the children of the `<head>` of an html page and remove the blank lines between them. the tags go charset, viewport, title, other meta, base, icons and manifest, preconnect and preload, styles, scripts, then the rest, and a comment stays above its tag. The page is left as is when it is already tidy or when its head holds something that cannot be parsed
 * @param html the text of the page
 * @returns the new text
 * @example sortHead('<head>\n  <title>A</title>\n\n  <meta charset="utf-8" />\n</head>') // '<head>\n  <meta charset="utf-8" />\n  <title>A</title>\n</head>'
 */
export function sortHead(html: string) {
  const groups = headPattern.exec(html)?.groups
  const inner = String(groups?.inner)
  const body = inner.trim()
  if (groups === undefined || body === '') return html
  const matches = [...body.matchAll(headChild)]
  if (matches.reduce((total, match) => total + match[0].length, 0) !== body.length) return html
  const children = matches.map(match => {
    const element = String(match.groups?.element)
    return { key: element.toLowerCase(), rank: rankHeadTag(element.toLowerCase()), text: match[0].trim() }
  })
  const sorted = children.toSorted((first, second) => first.rank - second.rank || (first.key < second.key ? -1 : Number(first.key > second.key)))
  const tidy = sorted.every((child, index) => child === children[index]) && !/\n[^\S\n]*\n/u.test(inner)
  if (tidy) return html
  const indent = /\n(?<indent>[^\S\n]*)\S/u.exec(inner)?.groups?.indent ?? '  '
  const closingIndent = String(groups.closing).slice(0, -'</head>'.length)
  return html.replace(headPattern, () => `${groups.open}\n${sorted.map(child => `${indent}${child.text}`).join('\n')}\n${closingIndent}</head>`)
}

/**
 * Add a line at the end of the `<head>` of an html page, indented like the other tags of the head. The page is left as is when it has no `</head>`
 * @param html the text of the page
 * @param line the tag to add, like `<meta name="viewport" content="width=device-width" />`
 * @returns the new text
 * @example addToHead('<head>\n</head>', '<meta charset="utf-8" />') // '<head>\n  <meta charset="utf-8" />\n</head>'
 */
export function addToHead(html: string, line: string) {
  if (/^[^\S\n]*<\/head>/mu.test(html)) return html.replace(/^(?<indent>[^\S\n]*)<\/head>/mu, (_closing, indent: string) => `${indent}  ${line}\n${indent}</head>`)
  return html.replace('</head>', `  ${line}\n</head>`)
}

/**
 * Read an attribute of an html tag
 * @param tag the tag, like `<meta name="a" content="b" />`
 * @param name the attribute name, like `content`
 * @returns the value as written, undefined when the tag has no such attribute
 * @example readAttribute('<meta name="a" content="b" />', 'content') // 'b'
 */
export function readAttribute(tag: string, name: string) {
  return new RegExp(String.raw`\s${name}=["'](?<value>[^"']*)["']`, 'iu').exec(tag)?.groups?.value
}

/**
 * Set an attribute of an html tag : replace its value, or add it at the end of the tag
 * @param tag the tag, like `<link rel="mask-icon" href="a.svg" />`
 * @param name the attribute name, like `color`
 * @param value the new value
 * @returns the new tag
 * @example setAttribute('<link rel="mask-icon" href="a.svg" />', 'color', '#fff') // '<link rel="mask-icon" href="a.svg" color="#fff" />'
 */
export function setAttribute(tag: string, name: string, value: string) {
  if (readAttribute(tag, name) !== undefined) return tag.replace(new RegExp(String.raw`(?<=\s${name}=)["'][^"']*["']`, 'iu'), `"${value}"`)
  return tag.replace(/\s*\/?>$/u, end => ` ${name}="${value}"${end}`)
}
