import { escapeRegExp, isEqual } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import { defineRule } from '../../engine/define-rule.ts'
import { findManifests } from '../../engine/manifest.ts'
import { hasDependency } from '../../engine/package-json.ts'
import { addToHead, readAttribute } from './html.utils.ts'
import { pwaIcons } from './pwa-icons.utils.ts'

const assetsGenerator = '@vite-pwa/assets-generator'
const assetsGeneratorRange = '^2.0.0'
const assetsScript = 'build:assets'
const oldAssetsScript = 'pwa:assets'
const viteConfigs = ['vite.config.mts', 'vite.config.ts', 'vite.config.mjs', 'vite.config.js']

/** The links the page needs for the icons made by the assets generator, by rel */
const iconLinks = [
  { href: '/apple-touch-icon-180x180.png', line: '<link href="/apple-touch-icon-180x180.png" rel="apple-touch-icon" sizes="180x180" />', rel: 'apple-touch-icon' },
  { href: '/favicon.ico', line: '<link href="/favicon.ico" rel="icon" sizes="48x48" />', rel: 'icon' },
  { href: '/logo.svg', line: '<link href="/logo.svg" rel="icon" sizes="any" type="image/svg+xml" />', rel: 'icon' },
]

/**
 * Get the folder of a manifest, where the logo lives
 * @param file the path of the manifest
 * @returns the folder, empty at the root of the project
 * @example manifestFolder('public/manifest.json') // 'public'
 */
function manifestFolder(file: string) {
  return file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''
}

/**
 * Get the path of the logo of a manifest, next to it
 * @param file the path of the manifest
 * @returns the path of `logo.svg`
 * @example logoOf('public/manifest.json') // 'public/logo.svg'
 */
function logoOf(file: string) {
  const folder = manifestFolder(file)
  return folder === '' ? 'logo.svg' : `${folder}/logo.svg`
}

/**
 * Make the script that makes the icons from the logo
 * @param logo the path of the logo
 * @returns the script
 * @example assetsCommand('public/logo.svg') // 'pwa-assets-generator --preset minimal-2023 public/logo.svg && echo build:assets completed successfully'
 */
function assetsCommand(logo: string) {
  return `pwa-assets-generator --preset minimal-2023 ${logo} && echo ${assetsScript} completed successfully`
}

export const manifestAssetsGenerator = defineRule({
  async check({ files, pkg, report }) {
    const [manifest] = await findManifests(files)
    if (manifest === undefined || pkg === undefined) return
    if (!hasDependency(pkg, assetsGenerator)) report({ fix: fixer => fixer.json('package.json').set(['devDependencies', assetsGenerator], assetsGeneratorRange), installs: [assetsGenerator], messageId: 'dependency' })
    const expected = assetsCommand(logoOf(manifest.file))
    const hasOld = pkg.scripts?.[oldAssetsScript] !== undefined
    if (hasOld || pkg.scripts?.[assetsScript] !== expected) report({ data: { expected }, fix: fixer => [fixer.json('package.json').set(['scripts', assetsScript], expected), ...(hasOld ? [fixer.json('package.json').remove(['scripts', oldAssetsScript])] : [])], messageId: 'script' })
  },
  meta: {
    fixable: true,
    id: 'manifest-assets-generator',
    messages: {
      dependency: `the project has a web manifest, but ${assetsGenerator} is not a dependency, it makes the icons of the app, like "devDependencies": { "${assetsGenerator}": "${assetsGeneratorRange}" }`,
      script: `the project has a web manifest, the script "${assetsScript}" should be exactly "{{expected}}", and "${oldAssetsScript}" should not exist`,
    },
    severity: 'warning',
  },
})

export const manifestLogo = defineRule({
  async check({ files, report }) {
    const all = await files.search(/\S/u)
    for (const { file } of await findManifests(files)) if (!all.includes(logoOf(file))) report({ data: { file, logo: logoOf(file) }, messageId: 'missing' })
  },
  meta: { id: 'manifest-logo', messages: { missing: '{{file}} has no {{logo}} next to it, the svg logo the icons are made from, the image is yours to make' }, severity: 'error' },
})

const assetsConfig = 'pwa-assets.config.json'
const appleSize = 180
const maskableSize = 512
const faviconSize = 48
const smallSize = 64
const mediumSize = 192
const transparentSizes = [smallSize, mediumSize, maskableSize]
const jsonIndent = 2

/**
 * Make the config of the assets generator: the minimal-2023 preset, with the maskable and apple icons filling the whole image with the color of the app instead of a white frame around the logo. A config file wins over the `--preset` of the script
 * @param background the color of the app, `#rrggbb`
 * @returns the config
 * @example assetsConfigFor('#024eb8') // { preset: { apple: ..., maskable: ..., transparent: ... } }
 */
function assetsConfigFor(background: string) {
  const fullImage = (size: number) => ({ padding: 0, resizeOptions: { background, fit: 'contain' }, sizes: [size] })
  return { preset: { apple: fullImage(appleSize), maskable: fullImage(maskableSize), transparent: { favicons: [[faviconSize, 'favicon.ico']], sizes: transparentSizes } } }
}

export const manifestAssetsConfig = defineRule({
  appliesTo: ({ flags }) => flags.themeColor !== undefined,
  async check({ files, flags, report }) {
    const [manifests, text] = await Promise.all([findManifests(files), files.readText(assetsConfig)])
    if (manifests.length === 0) return
    const expected = assetsConfigFor(String(flags.themeColor))
    if (text !== undefined && isEqual(parse(text), expected)) return
    report({ data: { color: String(flags.themeColor) }, fix: fixer => fixer.text(assetsConfig, () => `${JSON.stringify(expected, undefined, jsonIndent)}\n`), messageId: 'different' })
  },
  meta: {
    fixable: true,
    id: 'manifest-assets-config',
    messages: { different: `${assetsConfig} should make the maskable and apple icons fill the whole image with the color {{color}}, not leave a white frame around the logo` },
    severity: 'warning',
  },
})

/** The `rel` of the links that give the icon of a page, `mask-icon` and the like are another matter */
const iconRels = new Set(['apple-touch-icon', 'apple-touch-icon-precomposed', 'icon', 'shortcut icon'])

export const manifestHtmlIcons = defineRule({
  async check({ files, report }) {
    const [[manifest], html] = await Promise.all([findManifests(files), files.readText('index.html')])
    if (manifest === undefined || html === undefined) return
    const links = html.match(/<link\b[^>]*>/giu) ?? []
    for (const { href, line, rel } of iconLinks) if (!links.some(link => readAttribute(link, 'rel') === rel && readAttribute(link, 'href') === href)) report({ data: { href, rel }, fix: fixer => fixer.text('index.html', current => addToHead(current, line)), messageId: 'missing' })
  },
  meta: { fixable: true, id: 'manifest-html-icons', messages: { missing: 'index.html has no <link rel="{{rel}}"> to {{href}}, the icons made by build:assets from the logo and the logo itself, an svg icon stays sharp at any size' }, severity: 'warning' },
})

export const manifestHtmlOldIcons = defineRule({
  async check({ files, report }) {
    const [[manifest], html] = await Promise.all([findManifests(files), files.readText('index.html')])
    if (manifest === undefined || html === undefined) return
    const wanted = new Set(iconLinks.map(link => link.href))
    for (const link of html.match(/<link\b[^>]*>/giu) ?? []) {
      const href = readAttribute(link, 'href')
      if (!iconRels.has(String(readAttribute(link, 'rel')).toLowerCase()) || wanted.has(String(href))) continue
      const pattern = new RegExp(String.raw`^[^\S\n]*${escapeRegExp(link)}[^\S\n]*\n?`, 'mu')
      report({ data: { href: String(href) }, fix: fixer => fixer.text('index.html', current => current.replace(pattern, '')), messageId: 'old' })
    }
  },
  meta: { fixable: true, id: 'manifest-html-old-icons', messages: { old: 'index.html links the icon {{href}}, the icons are the ones build:assets makes from the logo, delete this link and the old image' }, severity: 'warning' },
})

/**
 * Read the vite config of the project
 * @param files the reader of the project files
 * @param files.readText the reader of a file
 * @returns the text of the first config found, undefined when there is none
 */
async function readViteConfig(files: { readText: (file: string) => Promise<string | undefined> }) {
  const texts = await Promise.all(viteConfigs.map(file => files.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  return index === -1 ? undefined : { file: String(viteConfigs[index]), text: String(texts[index]) }
}

/**
 * Write the icons the way a vite config lists them
 * @param indent the indent of the `icons` key
 * @returns the array, in the style of the vite config
 */
function viteIcons(indent: string) {
  const lines = pwaIcons.map(({ purpose, sizes, src, type }) => `${indent}  { ${purpose === undefined ? '' : `purpose: '${purpose}', `}sizes: '${sizes}', src: '${src}', type: '${type}' },`)
  return `[\n${lines.join('\n')}\n${indent}]`
}

/**
 * Shrink the text of an icons array to what makes it the same list: no spaces, no trailing comma, single quotes
 * @param text the array
 * @returns the shrunk text
 */
function shrink(text: string) {
  return text
    .replaceAll(/\s+/gu, '')
    .replaceAll('"', "'")
    .replaceAll(/,(?=[\]}])/gu, '')
}

/**
 * Find the name the vite config gives to the `VitePWA` plugin from `vite-plugin-pwa`
 * @param text the text of the vite config
 * @returns the name, `VitePWA` or its alias, undefined when the plugin is not imported
 * @example pluginName("import { VitePWA as vitePwa } from 'vite-plugin-pwa'") // 'vitePwa'
 */
function pluginName(text: string) {
  const imported = /import\s*\{(?<names>[^}]*)\}\s*from\s*['"]vite-plugin-pwa['"]/u.exec(text)?.groups?.names
  return imported === undefined ? undefined : (/\bVitePWA(?:\s+as\s+(?<alias>\w+))?/u.exec(imported)?.groups?.alias ?? (/\bVitePWA\b/u.test(imported) ? 'VitePWA' : undefined))
}

const iconsPattern = /^(?<indent>[^\S\n]*)icons:\s*(?<array>\[[^\]]*\])/mu

export const viteManifestPlugin = defineRule({
  async check({ files, report }) {
    const [manifests, config] = await Promise.all([findManifests(files), readViteConfig(files)])
    if (manifests.length === 0 || config === undefined) return
    const name = pluginName(config.text)
    if (name === undefined || !config.text.includes(`${name}(`)) report({ data: { file: config.file }, messageId: 'missing' })
  },
  meta: { id: 'vite-pwa-plugin', messages: { missing: '{{file}} does not use VitePWA from vite-plugin-pwa, the project has a web manifest and needs the service worker and the manifest of the plugin' }, severity: 'warning' },
})

export const viteManifestIcons = defineRule({
  async check({ files, report }) {
    const [manifests, config] = await Promise.all([findManifests(files), readViteConfig(files)])
    const name = config === undefined ? undefined : pluginName(config.text)
    if (manifests.length === 0 || config === undefined || name === undefined || !config.text.includes(`${name}(`)) return
    const start = config.text.indexOf(`${name}(`)
    if (/\bmanifest:\s*false\b/u.test(config.text.slice(start))) return
    const found = iconsPattern.exec(config.text.slice(start))
    const wanted = shrink(viteIcons(''))
    if (found?.groups !== undefined && shrink(String(found.groups.array)) === wanted) return
    if (found?.groups === undefined) report({ data: { file: config.file }, messageId: 'different' })
    else report({ data: { file: config.file }, fix: fixer => fixer.text(config.file, current => current.slice(0, start) + current.slice(start).replace(iconsPattern, (_all, indent: string) => `${indent}icons: ${viteIcons(indent)}`)), messageId: 'different' })
  },
  meta: { fixable: true, id: 'vite-pwa-icons', messages: { different: '{{file}} does not give VitePWA the 4 icons made by build:assets in its manifest: pwa-64x64, pwa-192x192, pwa-512x512 and maskable-icon-512x512' }, severity: 'warning' },
})
