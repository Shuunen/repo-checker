import { testRule } from '../../engine/rule-tester.ts'
import { lighthouseBudget, websiteStaticFiles } from './website-files.rule.ts'

const web = { isWebPublished: true }
const headers = '/*\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n'
const budget = `${JSON.stringify(
  [
    {
      path: '/*',
      resourceSizes: [
        { budget: 300, resourceType: 'total' },
        { budget: 100, resourceType: 'script' },
      ],
      timings: [{ budget: 2000, metric: 'interactive' }],
    },
  ],
  undefined,
  2,
)}\n`
const manifest = (name: string) => `${JSON.stringify({ background_color: '#ffffff', display: 'standalone', name, short_name: name, start_url: '/', theme_color: '#ffffff' }, undefined, 2)}\n`

testRule(websiteStaticFiles, {
  invalid: [
    { errors: ['headers', 'manifest'], files: { 'favicon.ico': '', 'index.html': '<html></html>' }, flags: web, name: 'a plain site gets its files at the root', output: [headers, manifest('my-site')], pkg: { name: 'my-site' } },
    { errors: ['headers', 'manifest'], files: { 'index.html': '<html></html>', 'public/favicon.ico': '' }, flags: web, name: 'a built site with an index.html at its root still gets its files in public', output: [headers, manifest('app')] },
    { errors: ['headers', 'manifest'], files: { 'favicon.ico': '' }, flags: web, name: 'a built site gets its files in public', output: [headers, manifest('app')] },
    { errors: ['headers'], files: { 'favicon.ico': '', 'manifest.json': '{}', 'static/robots.txt': '' }, flags: web, name: 'static is used when it is the only folder', output: headers },
    { errors: ['favicon'], files: { _headers: '', 'manifest.json': '{}' }, flags: web, name: 'a favicon cannot be created' },
  ],
  valid: [{ files: { 'favicon.ico': '', 'public/_headers': '', 'public/manifest.json': '{}' }, flags: web, name: 'every file in public' }, { files: { _headers: '', 'favicon.ico': '', 'static/manifest.json': '{}' }, flags: web, name: 'files in the root and in static' }, { name: 'not a website' }],
})

testRule(lighthouseBudget, {
  invalid: [{ errors: ['missing'], flags: web, name: 'a website without budget', output: budget }],
  valid: [{ files: { 'budget.json': '[]' }, flags: web, name: 'a budget.json' }, { files: { '.lighthouserc.json': '{}' }, flags: web, name: 'a lighthouserc' }, { name: 'not a website' }],
})
