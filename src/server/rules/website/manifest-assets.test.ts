import { testRule } from '../../test/rule-tester.ts'
import { manifestAssetsConfig, manifestAssetsGenerator, manifestHtmlIcons, manifestHtmlOldIcons, manifestLogo, viteManifestIcons, viteManifestPlugin } from './manifest-assets.rule.ts'

const manifest = { 'public/manifest.json': '{}' }
const generator = { '@vite-pwa/assets-generator': '^2.0.0' }
const command = 'pwa-assets-generator --preset minimal-2023 public/logo.svg && echo build:assets completed successfully'
const withScript = (script: string, extra: Record<string, string> = {}) => ({ devDependencies: generator, scripts: { 'build:assets': script, ...extra } })
const output = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`

testRule(manifestAssetsGenerator, {
  invalid: [
    { errors: ['dependency', 'script'], files: manifest, installs: ['@vite-pwa/assets-generator'], name: 'neither the dependency nor the script', output: output({ devDependencies: generator, scripts: { 'build:assets': command } }), pkg: {}, remaining: 0 },
    { errors: ['script'], files: manifest, name: 'a script that is not exact', output: output(withScript(command)), pkg: withScript('pwa-assets-generator public/logo.svg') },
    { errors: ['script'], files: manifest, name: 'the old script name', output: output(withScript(command)), pkg: withScript(command, { 'pwa:assets': 'pwa-assets-generator' }) },
    { errors: ['script'], files: { 'manifest.json': '{}' }, name: 'a manifest at the root', output: output(withScript('pwa-assets-generator --preset minimal-2023 logo.svg && echo build:assets completed successfully')), pkg: withScript(command) },
    { errors: ['dependency'], files: manifest, installs: ['@vite-pwa/assets-generator'], name: 'no dependency', output: output({ devDependencies: generator, scripts: { 'build:assets': command } }), pkg: { scripts: { 'build:assets': command } }, remaining: 0 },
  ],
  valid: [
    { files: manifest, name: 'all there', pkg: withScript(command) },
    { name: 'no manifest', pkg: {} },
    { files: manifest, name: 'no package.json' },
  ],
})

testRule(manifestLogo, {
  invalid: [
    { errors: ['missing'], files: manifest, name: 'no logo' },
    { errors: ['missing'], files: { ...manifest, 'src/logo.svg': '<svg />' }, name: 'a logo far from the manifest' },
  ],
  valid: [{ files: { ...manifest, 'public/logo.svg': '<svg />' }, name: 'a logo next to the manifest' }, { name: 'no manifest' }],
})

const apple = '<link href="/apple-touch-icon-180x180.png" rel="apple-touch-icon" sizes="180x180" />'
const icon = '<link href="/favicon.ico" rel="icon" sizes="48x48" />'
const svg = '<link href="/logo.svg" rel="icon" sizes="any" type="image/svg+xml" />'

testRule(manifestHtmlIcons, {
  invalid: [
    { errors: ['missing', 'missing', 'missing'], files: { ...manifest, 'index.html': '<head>\n</head>' }, name: 'no icon links', output: `<head>\n  ${apple}\n  ${icon}\n  ${svg}\n</head>` },
    { errors: ['missing', 'missing'], files: { ...manifest, 'index.html': `<head>\n  ${apple}\n  <link rel="icon" href="/favicon.svg" />\n</head>` }, name: 'another icon', output: `<head>\n  ${apple}\n  <link rel="icon" href="/favicon.svg" />\n  ${icon}\n  ${svg}\n</head>` },
  ],
  valid: [
    { files: { ...manifest, 'index.html': `<head>\n  ${icon}\n  <link rel="icon" type="image/svg+xml" href="/logo.svg">\n  <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">\n</head>` }, name: 'the 3 links' },
    { files: { 'index.html': '<head></head>' }, name: 'no manifest' },
    { files: manifest, name: 'no index.html' },
  ],
})

testRule(manifestHtmlOldIcons, {
  invalid: [
    { errors: ['old'], files: { ...manifest, 'index.html': `<head>\n  ${apple}\n  ${icon}\n  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />\n</head>` }, name: 'an old favicon', output: `<head>\n  ${apple}\n  ${icon}\n</head>` },
    { errors: ['old', 'old'], files: { ...manifest, 'index.html': '<head>\n  <link href="/apple-touch-icon.png" rel="Apple-Touch-Icon" />\n  <link rel="shortcut icon" href="/a.ico">\n</head>' }, name: 'old apple and shortcut icons', output: '<head>\n</head>' },
  ],
  valid: [
    { files: { ...manifest, 'index.html': `<head>\n  ${apple}\n  ${icon}\n  <link rel="icon" href="/logo.svg" sizes="any" type="image/svg+xml" />\n  <link rel="mask-icon" href="/a.svg" />\n  <link rel="stylesheet" href="/a.css" />\n</head>` }, name: 'the new icons, the svg logo and other links' },
    { files: { 'index.html': '<head><link rel="icon" href="/a.ico"></head>' }, name: 'no manifest' },
    { files: manifest, name: 'no index.html' },
  ],
})

const icons = `    icons: [
      { sizes: '64x64', src: '/pwa-64x64.png', type: 'image/png' },
      { sizes: '192x192', src: '/pwa-192x192.png', type: 'image/png' },
      { sizes: '512x512', src: '/pwa-512x512.png', type: 'image/png' },
      { purpose: 'maskable', sizes: '512x512', src: '/maskable-icon-512x512.png', type: 'image/png' },
    ],`
const config = (body: string) => `import { VitePWA } from 'vite-plugin-pwa'\nexport default defineConfig({\n  plugins: [\n    VitePWA({\n      manifest: {\n${body}\n      },\n    }),\n  ],\n})\n`
const goodIcons = icons.replaceAll(/^ {4}/gmu, '        ')

testRule(viteManifestPlugin, {
  invalid: [
    { errors: ['missing'], files: { ...manifest, 'vite.config.ts': 'export default defineConfig({})\n' }, name: 'no plugin' },
    { errors: ['missing'], files: { ...manifest, 'vite.config.ts': 'VitePWA({})' }, name: 'not imported from the plugin' },
    { errors: ['missing'], files: { ...manifest, 'vite.config.ts': "import { other } from 'vite-plugin-pwa'\nother()" }, name: 'another export of the plugin' },
  ],
  valid: [
    { files: { ...manifest, 'vite.config.ts': config(goodIcons) }, name: 'the plugin' },
    { files: { ...manifest, 'vite.config.ts': config(goodIcons).replace('{ VitePWA }', '{ VitePWA as vitePwa }').replace('VitePWA({', 'vitePwa({') }, name: 'the plugin under another name' },
    { files: { ...manifest, 'package.json': '{}' }, name: 'no vite config' },
    { files: { 'vite.config.ts': 'export default {}' }, name: 'no manifest' },
  ],
})

testRule(viteManifestIcons, {
  invalid: [
    { errors: ['different'], files: { ...manifest, 'vite.config.ts': config("        icons: [{ sizes: '64x64', src: '/a.png', type: 'image/png' }],") }, name: 'other icons', output: config(goodIcons) },
    { errors: ['different'], files: { ...manifest, 'vite.config.ts': config("        name: 'a',") }, name: 'no icons' },
  ],
  valid: [
    { files: { ...manifest, 'vite.config.ts': config(goodIcons) }, name: 'the icons' },
    { files: { ...manifest, 'vite.config.ts': config(goodIcons.replaceAll("'", '"').replace(/\n {8}\],/u, '\n        ]')) }, name: 'double quotes and no trailing comma' },
    { files: { ...manifest, 'vite.config.ts': 'export default {}' }, name: 'no plugin' },
    { files: { ...manifest, 'vite.config.ts': "import { VitePWA } from 'vite-plugin-pwa'\nVitePWA({ manifest: false })" }, name: 'a hand-written manifest' },
    { files: { ...manifest, 'vite.config.ts': config(goodIcons).replace('{ VitePWA }', '{ VitePWA as vitePwa }').replace('VitePWA({', 'vitePwa({') }, name: 'icons right under another name' },
    { files: { ...manifest }, name: 'no vite config' },
    { files: { 'vite.config.ts': config('') }, name: 'no manifest' },
  ],
})

const assetsConfig = (color: string) =>
  `${JSON.stringify({ preset: { apple: { padding: 0, resizeOptions: { background: color, fit: 'contain' }, sizes: [180] }, maskable: { padding: 0, resizeOptions: { background: color, fit: 'contain' }, sizes: [512] }, transparent: { favicons: [[48, 'favicon.ico']], sizes: [64, 192, 512] } } }, undefined, 2)}\n`

testRule(manifestAssetsConfig, {
  invalid: [
    { errors: ['different'], files: manifest, flags: { themeColor: '#024eb8' }, name: 'no config', output: assetsConfig('#024eb8') },
    { errors: ['different'], files: { ...manifest, 'pwa-assets.config.json': assetsConfig('#ffffff') }, flags: { themeColor: '#024eb8' }, name: 'another color', output: assetsConfig('#024eb8') },
  ],
  valid: [
    { files: { ...manifest, 'pwa-assets.config.json': assetsConfig('#024eb8') }, flags: { themeColor: '#024eb8' }, name: 'the config' },
    { files: manifest, name: 'no theme color' },
    { files: {}, flags: { themeColor: '#024eb8' }, name: 'no manifest' },
  ],
})
