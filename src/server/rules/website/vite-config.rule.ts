import { projectNumber, readVitePorts } from '../../../shared/vite-ports.ts'
import { defineRule } from '../../engine/define-rule.ts'
import type { FileReader } from '../../engine/io.ts'

/** The vite configs */
const configFiles = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/** The sections that serve the app on a port */
const sections = ['server', 'preview'] as const

/**
 * Tell if a section of a vite config sets a port without `strictPort: true`, so vite silently moves to the next port when it is taken and the app collides with another one
 * @param text the text of the config
 * @param section the section, `server` or `preview`
 * @returns true when the section has a port and no strict port
 */
function lacksStrictPort(text: string, section: string) {
  const body = new RegExp(String.raw`\b${section}:\s*\{(?<body>[^{}]*)\}`, 'u').exec(text)?.groups?.body ?? ''
  return /\bport:\s*\d+/u.test(body) && !/\bstrictPort:\s*true\b/u.test(body)
}

/**
 * Set `strictPort: true` in a section of a vite config, as text so the layout of the file is kept
 * @param text the text of the config
 * @param section the section, `server` or `preview`
 * @returns the new text
 * @example addStrictPort('server: { port: 5109 }', 'server') // 'server: { port: 5109, strictPort: true }'
 */
function addStrictPort(text: string, section: string) {
  return text.replace(new RegExp(String.raw`\b${section}:\s*\{(?<body>[^{}]*)\}`, 'u'), (block, body: string) => {
    if (/\bstrictPort:/u.test(body)) return block.replace(/\bstrictPort:\s*\w+/u, 'strictPort: true')
    if (body.includes('\n')) return block.replace(/^(?<indent>[^\S\n]*)port:\s*\d+,?/mu, (line, indent: string) => `${line.replace(/,$/u, '')},\n${indent}strictPort: true,`)
    return block.replace(/\bport:\s*\d+/u, port => `${port}, strictPort: true`)
  })
}

/**
 * Read the vite config of the project
 * @param files the reader of the project files
 * @returns the file and its text, undefined when there is no config
 */
async function readViteConfig(files: Readonly<FileReader>) {
  const texts = await Promise.all(configFiles.map(file => files.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  return index === -1 ? undefined : { file: String(configFiles[index]), text: String(texts[index]) }
}

/**
 * Find the closing brace of a block
 * @param text the text
 * @param open the index of the opening brace
 * @returns the index of the matching closing brace, the end of the text when there is none
 */
function closingIndex(text: string, open: number) {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1
    if (text[index] === '}') depth -= 1
    if (depth === 0) return index
  }
  return text.length
}

/**
 * Add a property to an object literal, as text. A multiline object gets the property in alphabetical place among its simple keys, an inline one at its end
 * @param text the text of the config
 * @param open the index of the opening brace of the object
 * @param property the property to add
 * @param property.name the key
 * @param property.value the value
 * @returns the new text
 * @example addProperty('build: { minify: true }', 7, { name: 'reportCompressedSize', value: 'false' }) // 'build: { minify: true, reportCompressedSize: false }'
 */
function addProperty(text: string, open: number, { name, value }: Readonly<{ name: string; value: string }>) {
  const close = closingIndex(text, open)
  const body = text.slice(open + 1, close)
  if (!body.includes('\n')) {
    const content = body.trim().replace(/,$/u, '')
    return `${text.slice(0, open + 1)} ${content === '' ? '' : `${content}, `}${name}: ${value} ${text.slice(close)}`
  }
  const indent = /\n(?<indent>[^\S\n]*)\S/u.exec(body)?.groups?.indent ?? ''
  const keys = [...body.matchAll(new RegExp(String.raw`^${indent}(?<key>\w+)\s*:`, 'gmu'))]
  const next = keys.find(match => String(match.groups?.key) > name)
  if (next !== undefined) return `${text.slice(0, open + 1 + next.index)}${indent}${name}: ${value},\n${text.slice(open + 1 + next.index)}`
  const content = body.trimEnd()
  return `${text.slice(0, open + 1)}${content}${content === '' || content.endsWith(',') ? '' : ','}\n${indent}${name}: ${value},${body.slice(content.length)}${text.slice(close)}`
}

/**
 * Set `build.reportCompressedSize: false` in a vite config
 * @param text the text of the config
 * @returns the new text
 */
function disableCompressedSize(text: string) {
  const build = /\bbuild:\s*\{/u.exec(text)
  if (build !== null) {
    const open = build.index + build[0].length - 1
    return /\breportCompressedSize:/u.test(text) ? text.replace(/\breportCompressedSize:\s*\w+/u, 'reportCompressedSize: false') : addProperty(text, open, { name: 'reportCompressedSize', value: 'false' })
  }
  const define = /\bdefineConfig\(\{/u.exec(text)
  return define === null ? text : addProperty(text, define.index + define[0].length - 1, { name: 'build', value: '{ reportCompressedSize: false }' })
}

export const viteStrictPort = defineRule({
  async check({ files, report }) {
    const config = await readViteConfig(files)
    if (config === undefined) return
    const { file, text } = config
    for (const section of sections.filter(name => lacksStrictPort(text, name))) report({ data: { file, section }, fix: fixer => fixer.text(file, current => addStrictPort(current, section)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'vite-strict-port', messages: { missing: '{{file}} sets a port in "{{section}}" without strictPort: true, vite would move to another port when it is taken' }, severity: 'info' },
})

export const viteReportCompressedSize = defineRule({
  async check({ files, report }) {
    const config = await readViteConfig(files)
    if (config === undefined || /\breportCompressedSize:\s*false\b/u.test(config.text) || disableCompressedSize(config.text) === config.text) return
    const { file } = config
    report({ data: { file }, fix: fixer => fixer.text(file, current => disableCompressedSize(current)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'vite-report-compressed-size', messages: { missing: '{{file}} does not set build.reportCompressedSize: false, vite gzips every file only to print its size, which slows the build' }, severity: 'info' },
})

/** The comment that allows the default export of a vite config */
const defaultExportComment = '// oxlint-disable-next-line import/no-default-export'

export const viteDefaultExportComment = defineRule({
  async check({ files, report }) {
    const config = await readViteConfig(files)
    if (config === undefined) return
    const { file, text } = config
    const [json, jsonc] = await Promise.all([files.readText('.oxlintrc.json'), files.readText('.oxlintrc.jsonc')])
    if (/["']no-default-export["']\s*:\s*["']off["']/u.test(`${json}${jsonc}`)) return
    const lines = text.split('\n')
    const index = lines.findIndex(line => line.startsWith('export default'))
    if (index === -1 || lines[index - 1]?.includes('no-default-export') === true) return
    report({ data: { file }, fix: fixer => fixer.text(file, current => current.replace(/^export default/mu, `${defaultExportComment}\nexport default`)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'vite-default-export-comment', messages: { missing: '{{file}} has a default export without the oxlint-disable-next-line comment for import/no-default-export, a vite config needs one' }, severity: 'info' },
})

/** The dev ports are 51NN and the preview ports 41NN, with the project number NN */
const devPort = /^51\d\d$/u
const previewPort = /^41\d\d$/u

export const vitePortScheme = defineRule({
  async check({ files, report }) {
    const config = await readViteConfig(files)
    if (config === undefined) return
    const { preview, server } = readVitePorts(config.text)
    const problems = [
      ...(server !== undefined && !devPort.test(String(server)) ? [`the dev port ${server} is not 51NN`] : []),
      ...(preview !== undefined && !previewPort.test(String(preview)) ? [`the preview port ${preview} is not 41NN`] : []),
      ...(server !== undefined && preview !== undefined && devPort.test(String(server)) && previewPort.test(String(preview)) && projectNumber(server) !== projectNumber(preview) ? [`the dev port ${server} and the preview port ${preview} have different project numbers`] : []),
    ]
    if (problems.length > 0) report({ data: { file: config.file, problems: problems.join(', ') }, messageId: 'scheme' })
  },
  meta: { id: 'vite-port-scheme', messages: { scheme: '{{file}} breaks the port scheme, dev 51NN and preview 41NN with the same project number: {{problems}}' }, severity: 'info' },
})
