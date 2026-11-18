import { isEqual } from 'es-toolkit'
import { darken } from '../../engine/color.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { findManifests } from '../../engine/manifest.ts'
import { addToHead } from './html.utils.ts'
import { pwaIcons } from './pwa-icons.utils.ts'

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

/**
 * Every image path a manifest mentions: icons, screenshots and the icons of its shortcuts
 * @param content the parsed manifest
 * @returns the local image paths
 */
function imageSources(content: Readonly<Record<string, unknown>>) {
  const lists = [content.icons, content.screenshots, ...(Array.isArray(content.shortcuts) ? content.shortcuts.map((shortcut: Readonly<{ icons?: unknown }>) => shortcut.icons) : [])]
  return lists
    .filter(list => Array.isArray(list))
    .flatMap(list => list.map((image: Readonly<{ src?: unknown }>) => image.src))
    .filter((src): src is string => typeof src === 'string' && !/^(?:[a-z]+:|data:)/iu.test(src))
}

/**
 * The places an image of a manifest can be served from: next to the manifest, or the public folder of the project
 * @param manifestFile the path of the manifest
 * @param src the image path written in the manifest
 * @returns the project paths where the image can be
 */
function imageCandidates(manifestFile: string, src: string) {
  const path = src.replace(/^\.?\//u, '').replace(/[?#].*$/u, '')
  const folder = manifestFile.includes('/') ? manifestFile.slice(0, manifestFile.lastIndexOf('/') + 1) : ''
  return [...new Set([`${folder}${path}`, `public/${path}`, `static/${path}`, path])]
}

export const manifestImagesExist = defineRule({
  async check({ files, report }) {
    const manifests = await findManifests(files)
    const images = manifests.flatMap(({ content, file }) => imageSources(content).map(src => ({ candidates: imageCandidates(file, src), file, src })))
    const sizes = await Promise.all(images.map(({ candidates }) => Promise.all(candidates.map(candidate => files.sizeKo(candidate)))))
    for (const [index, { file, src }] of images.entries()) if (sizes[index]?.every(size => size === undefined) === true) report({ data: { file, src }, messageId: 'missing' })
  },
  meta: { fixable: false, id: 'manifest-images-exist', messages: { missing: '{{file}} mentions "{{src}}", but no such image exists in the project' }, severity: 'error' },
})

export const manifestIcons = defineRule({
  async check({ files, report }) {
    for (const { content, file } of await findManifests(files)) if (!isEqual(content.icons, pwaIcons)) report({ data: { file }, fix: fixer => fixer.json(file).set(['icons'], pwaIcons), messageId: 'different' })
  },
  meta: { fixable: true, id: 'manifest-icons', messages: { different: '{{file}} "icons" are not the 4 icons made by build:assets: pwa-64x64, pwa-192x192, pwa-512x512 and maskable-icon-512x512' }, severity: 'warning' },
})
