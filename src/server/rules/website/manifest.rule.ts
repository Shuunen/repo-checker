import { darken } from '../../engine/color.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { findManifests } from '../../engine/manifest.ts'
import { addToHead } from './html.utils.ts'

/** What a manifest needs, with the value the fix writes when it is missing */
const requiredFields = ['name', 'short_name', 'start_url', 'display'] as const

export const manifestLinked = defineRule({
  async check({ files, report }) {
    const [[manifest], html] = await Promise.all([findManifests(files), files.readText('index.html')])
    if (manifest === undefined || html === undefined || /<link\b[^>]*\brel=["']manifest["']/iu.test(html)) return
    const href = `/${manifest.file.replace(/^(?:.*\/)?(?:public|static)\//u, '')}`
    report({ data: { file: manifest.file }, fix: fixer => fixer.text('index.html', current => addToHead(current, `<link rel="manifest" href="${href}" />`)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'manifest-linked', messages: { missing: 'index.html has no <link rel="manifest"> to {{file}}, the browser would not find it' }, severity: 'warning' },
})

export const manifestRequiredFields = defineRule({
  async check({ files, pkg, report }) {
    const defaults: Record<(typeof requiredFields)[number], string> = { display: 'standalone', name: pkg?.name ?? 'app', short_name: pkg?.name ?? 'app', start_url: '/' }
    for (const manifest of await findManifests(files)) for (const field of requiredFields.filter(name => manifest.content[name] === undefined)) report({ data: { field, file: manifest.file }, fix: fixer => fixer.json(manifest.file).set([field], defaults[field]), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'manifest-required-fields', messages: { missing: '{{file}} has no "{{field}}"' }, severity: 'warning' },
})

export const manifestColors = defineRule({
  appliesTo: ({ flags }) => flags.themeColor !== undefined,
  async check({ files, flags, report }) {
    const themeColor = String(flags.themeColor)
    const expected = { background_color: darken(themeColor), theme_color: themeColor }
    for (const manifest of await findManifests(files))
      for (const [field, color] of Object.entries(expected).filter(([name, wanted]) => manifest.content[name] !== wanted)) report({ data: { color, field, file: manifest.file }, fix: fixer => fixer.json(manifest.file).set([field], color), messageId: 'different' })
  },
  meta: { fixable: true, id: 'manifest-colors', messages: { different: '{{file}} "{{field}}" is not {{color}}, the themeColor and its darker shade give the colors of the app' }, severity: 'warning' },
})

export const manifestIcons = defineRule({
  async check({ files, report }) {
    for (const { content, file } of await findManifests(files)) if (!Array.isArray(content.icons) || content.icons.length === 0) report({ data: { file }, messageId: 'missing' })
  },
  meta: { id: 'manifest-icons', messages: { missing: '{{file}} has no "icons", a web app without icons cannot be installed, the images are yours to make' }, severity: 'info' },
})
