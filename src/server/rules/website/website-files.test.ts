import { testRule } from '../../test/rule-tester.ts'
import { lighthouseBudget, websiteNoRobotTxt, websiteRobotsTxt, websiteStaticFiles } from './website-files.rule.ts'

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
const manifest = (name: string) => `${JSON.stringify({ display: 'standalone', name, short_name: name, start_url: '/' }, undefined, 2)}\n`
const colored = `${JSON.stringify({ background_color: '#012c67', display: 'standalone', name: 'app', short_name: 'app', start_url: '/', theme_color: '#024eb8' }, undefined, 2)}\n`

testRule(websiteStaticFiles, {
  invalid: [
    { errors: ['headers', 'manifest'], files: { 'favicon.ico': '', 'index.html': '<html></html>' }, flags: web, name: 'a plain site gets its files at the root', output: [headers, manifest('my-site')], pkg: { name: 'my-site' } },
    { errors: ['headers', 'manifest'], files: { 'index.html': '<html></html>', 'public/favicon.ico': '' }, flags: web, name: 'a built site with an index.html at its root still gets its files in public', output: [headers, manifest('app')] },
    { errors: ['headers', 'manifest'], files: { 'favicon.ico': '' }, flags: web, name: 'a built site gets its files in public', output: [headers, manifest('app')] },
    { errors: ['headers', 'manifest'], files: { 'favicon.ico': '' }, flags: { ...web, themeColor: '#024eb8' }, name: 'a new manifest has the colors of the theme color', output: [headers, colored] },
    { errors: ['headers'], files: { 'favicon.ico': '', 'manifest.json': '{}', 'static/robots.txt': '' }, flags: web, name: 'static is used when it is the only folder', output: headers },
    { errors: ['favicon'], files: { _headers: '', 'manifest.json': '{}' }, flags: web, name: 'a favicon cannot be created' },
  ],
  valid: [
    { files: { 'favicon.ico': '', 'public/_headers': '', 'public/manifest.json': '{}' }, flags: web, name: 'every file in public' },
    { files: { _headers: '', 'favicon.ico': '', 'static/manifest.json': '{}' }, flags: web, name: 'files in the root and in static' },
    { files: { _headers: '', 'favicon.ico': '', 'public/app.webmanifest': '{}' }, flags: web, name: 'an app.webmanifest is a manifest' },
    { files: { _headers: '', 'favicon.ico': '', 'src/web/public/manifest.webmanifest': '{}' }, flags: web, name: 'a nested manifest' },
    { name: 'not a website' },
  ],
})

testRule(lighthouseBudget, {
  invalid: [{ errors: ['missing'], flags: web, name: 'a website without budget', output: budget }],
  valid: [{ files: { 'budget.json': '[]' }, flags: web, name: 'a budget.json' }, { files: { '.lighthouserc.json': '{}' }, flags: web, name: 'a lighthouserc' }, { name: 'not a website' }],
})

testRule(websiteRobotsTxt, {
  invalid: [
    { errors: ['missing'], flags: web, name: 'no robots.txt', output: 'User-agent: *\nAllow: /\n' },
    { errors: ['missing'], files: { 'public/robot.txt': '' }, flags: web, name: 'a misspelled robot.txt', output: 'User-agent: *\nAllow: /\n' },
  ],
  valid: [{ files: { 'public/robots.txt': '' }, flags: web, name: 'in public' }, { files: { 'robots.txt': '' }, flags: web, name: 'at the root' }, { name: 'not a website' }],
})

testRule(websiteNoRobotTxt, {
  invalid: [{ errors: ['found'], files: { 'public/robot.txt': '' }, flags: web, name: 'a misspelled robot.txt' }],
  valid: [
    { files: { 'public/robots.txt': '' }, flags: web, name: 'robots.txt' },
    { files: { 'public/robot.txt': '' }, name: 'not a website' },
  ],
})
