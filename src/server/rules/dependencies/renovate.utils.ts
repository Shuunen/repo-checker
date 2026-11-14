import { invariant } from 'es-toolkit'

/** The presets that `config:semverAllMonthly` replaces */
const replacedPresets = new Set(['config:base', 'config:recommended'])

/**
 * Make an `extends` list use `config:semverAllMonthly`: it replaces `config:recommended` or `config:base`, else it goes first. A list that has it already is kept
 * @param items the presets
 * @returns the new presets
 * @example withSemverAllMonthly(['config:recommended', ':automergeAll']) // ['config:semverAllMonthly', ':automergeAll']
 */
export function withSemverAllMonthly(items: string[]) {
  if (items.includes('config:semverAllMonthly')) return items
  if (items.some(item => replacedPresets.has(item))) return items.map(item => (replacedPresets.has(item) ? 'config:semverAllMonthly' : item))
  return ['config:semverAllMonthly', ...items]
}

/**
 * Tell if the `extends` list of a renovate.json text holds the same preset twice
 * @param text the renovate.json text
 * @returns true when a preset is listed twice, false without an `extends` list
 * @example hasDuplicatePreset('{ "extends": ["a", "b", "a"] }') // true
 */
export function hasDuplicatePreset(text: string) {
  const body = /"extends"\s*:\s*\[(?<body>[^\]]*)\]/u.exec(text)?.groups?.body ?? ''
  const items = [...body.matchAll(/"(?<item>[^"]*)"/gu)].map(item => item.groups?.item)
  return new Set(items).size !== items.length
}

/**
 * Change the presets of the `extends` list of a renovate.json text, keeping the style of the list: one preset per line, or all on one line
 * @param text the renovate.json text, it must have an `extends` list
 * @param change turn the current presets into the new ones
 * @returns the new text
 * @example editExtends('{ "extends": ["a"] }', items => [...items, 'b']) // '{ "extends": ["a", "b"] }'
 */
export function editExtends(text: string, change: (items: string[]) => string[]) {
  const match = /"extends"\s*:\s*\[(?<body>[^\]]*)\]/u.exec(text)
  invariant(match?.groups?.body !== undefined, 'the text has an extends list')
  const { body } = match.groups
  const items = change([...body.matchAll(/"(?<item>[^"]*)"/gu)].map(item => String(item.groups?.item)))
  const indent = /\n(?<spaces>[ \t]*)"/u.exec(body)?.groups?.spaces ?? ''
  const closing = /\n(?<spaces>[ \t]*)$/u.exec(body)?.groups?.spaces ?? ''
  const lead = body.slice(0, body.length - body.trimStart().length)
  const trail = body.slice(body.trimEnd().length)
  const quoted = items.map(item => `"${item}"`)
  const rebuilt = body.includes('\n') ? `\n${indent}${quoted.join(`,\n${indent}`)}\n${closing}` : `${lead}${quoted.join(', ')}${trail}`
  const start = match.index + match[0].indexOf('[') + 1
  return `${text.slice(0, start)}${rebuilt}${text.slice(start + body.length)}`
}
