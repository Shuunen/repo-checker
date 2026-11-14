import { testRule } from '../../test/rule-tester.ts'
import { manifestColors, manifestIcons, manifestLinked, manifestRequiredFields } from './manifest.rule.ts'

const full = { background_color: '#012c67', display: 'standalone', name: 'a', short_name: 'a', start_url: '/', theme_color: '#024eb8' }
const json = (value: unknown) => `${JSON.stringify(value, undefined, 2)}\n`

testRule(manifestLinked, {
  invalid: [
    { errors: ['missing'], files: { 'index.html': '<head>\n</head>', 'public/manifest.json': '{}' }, name: 'a manifest in public', output: '<head>\n  <link rel="manifest" href="/manifest.json" />\n</head>' },
    { errors: ['missing'], files: { 'app.webmanifest': '{}', 'index.html': '<head></head>' }, name: 'a manifest at the root', output: '<head>  <link rel="manifest" href="/app.webmanifest" />\n</head>' },
    { errors: ['missing'], files: { 'index.html': '<html></html>', 'public/manifest.json': '{}' }, name: 'no head, no fix' },
    { errors: ['missing'], files: { 'index.html': '<head>\n</head>', 'src/web/public/site.webmanifest': '{}' }, name: 'a nested manifest', output: '<head>\n  <link rel="manifest" href="/site.webmanifest" />\n</head>' },
  ],
  valid: [
    { files: { 'index.html': '<head><link rel="manifest" href="/manifest.json"></head>', 'public/manifest.json': '{}' }, name: 'linked' },
    { files: { 'index.html': '<head></head>' }, name: 'no manifest' },
    { files: { 'public/manifest.json': '{}' }, name: 'no index.html' },
  ],
})

testRule(manifestRequiredFields, {
  invalid: [
    {
      errors: ['missing', 'missing', 'missing', 'missing'],
      files: { 'public/manifest.json': '{}\n' },
      name: 'an empty manifest',
      output: json({ display: 'standalone', name: 'my-app', short_name: 'my-app', start_url: '/' }),
      pkg: { name: 'my-app' },
    },
    { errors: ['missing'], files: { 'manifest.webmanifest': json({ ...full, start_url: undefined }) }, name: 'no start_url', output: json(full) },
  ],
  valid: [{ files: { 'public/manifest.json': json(full) }, name: 'complete' }, { files: { 'public/manifest.json': 'not json' }, name: 'an unreadable manifest' }, { name: 'no manifest' }],
})

const flags = { themeColor: '#024eb8' }

testRule(manifestColors, {
  invalid: [
    { errors: ['different', 'different'], files: { 'public/manifest.json': json({ ...full, background_color: '#012C67', theme_color: '#024EB8' }) }, flags, name: 'colors in capitals are lowercased', output: json(full) },
    { errors: ['different', 'different'], files: { 'public/manifest.json': json({ ...full, background_color: undefined, theme_color: undefined }) }, flags, name: 'no colors', output: json(full) },
    { errors: ['different'], files: { 'public/manifest.json': json({ ...full, background_color: '#024eb8' }) }, flags, name: 'a background that is not the darker shade', output: json(full) },
    { errors: ['different'], files: { 'public/manifest.json': json({ ...full, theme_color: 'blue' }) }, flags, name: 'a theme color that is not a color', output: json(full) },
    { errors: ['different'], files: { 'src/web/public/app.webmanifest': json({ ...full, theme_color: 'blue' }) }, flags, name: 'a nested manifest', output: json(full) },
    {
      errors: ['different', 'different'],
      files: { 'a/manifest.json': json({ ...full, theme_color: 'blue' }), 'b/site.webmanifest': json({ ...full, background_color: 'blue' }) },
      flags,
      name: 'every manifest is checked',
      output: [json(full), json(full)],
    },
  ],
  valid: [
    { files: { 'public/manifest.json': json({ ...full, theme_color: undefined }) }, name: 'no theme color to follow' },
    { files: { 'extension/manifest.json': json({ manifest_version: 3, name: 'ext' }) }, flags, name: 'a browser extension manifest is not a web manifest' },
    { files: { 'manifest.json': '[]' }, flags, name: 'a manifest that is not an object' },
    { flags, name: 'no manifest' },
  ],
})

testRule(manifestIcons, {
  invalid: [
    { errors: ['missing'], files: { 'public/manifest.json': json(full) }, name: 'no icons' },
    { errors: ['missing'], files: { 'public/manifest.json': json({ ...full, icons: [] }) }, name: 'empty icons' },
  ],
  valid: [{ files: { 'public/manifest.json': json({ ...full, icons: [{ src: '/a.png' }] }) }, name: 'icons' }, { name: 'no manifest' }],
})
