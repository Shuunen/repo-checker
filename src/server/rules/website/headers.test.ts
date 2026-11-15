import { invariant } from 'es-toolkit'
import { testRule } from '../../test/rule-tester.ts'
import { headerRules } from './headers.rule.ts'

/**
 * Get a rule of the table
 * @param id the check id
 * @returns the rule
 */
function byId(id: string) {
  const rule = headerRules.find(item => item.meta.id === id)
  invariant(rule !== undefined, `no rule ${id} in the table`)
  return rule
}

const web = { isWebPublished: true }
const headers = (text: string) => ({ 'public/_headers': text })
const full = '/*\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n'

testRule(byId('headers-nosniff'), {
  invalid: [
    { errors: ['missing'], files: headers('/*\n  X-Frame-Options: DENY\n'), flags: web, name: 'added at the end of the section', output: '/*\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n' },
    { errors: ['missing'], files: headers('/*\n  X-Frame-Options: DENY\n/sw.js\n  Cache-Control: no-cache\n'), flags: web, name: 'added before the next section', output: '/*\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n/sw.js\n  Cache-Control: no-cache\n' },
    { errors: ['missing'], files: headers('/sw.js\n  Cache-Control: no-cache\n'), flags: web, name: 'no section for every path, one is added', output: '/sw.js\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n' },
    { errors: ['missing'], files: headers('/*\n'), flags: web, name: 'an empty section', output: '/*\n  X-Content-Type-Options: nosniff\n' },
    { errors: ['missing'], files: headers('/*\n  X-Frame-Options: DENY'), flags: web, name: 'no final new line', output: '/*\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff' },
    { errors: ['missing'], files: headers('/*'), flags: web, name: 'a section alone on the last line', output: '/*\n  X-Content-Type-Options: nosniff' },
    { errors: ['missing'], files: headers(''), flags: web, name: 'an empty file', output: '/*\n  X-Content-Type-Options: nosniff\n' },
    { errors: ['missing'], files: { _headers: '/*\n\tX-Frame-Options: DENY\n' }, flags: web, name: 'at the root, a tab indent kept', output: '/*\n\tX-Frame-Options: DENY\n\tX-Content-Type-Options: nosniff\n' },
  ],
  valid: [
    { files: headers(full), flags: web, name: 'set' },
    { files: headers('/*\n'), name: 'not a website' },
    { flags: web, name: 'no _headers, website-static-files reports it' },
  ],
})

testRule(byId('headers-frame-options'), {
  invalid: [{ errors: ['missing'], files: headers('/*\n  X-Content-Type-Options: nosniff\n'), flags: web, name: 'missing', output: '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n' }],
  valid: [
    { files: headers(full), flags: web, name: 'DENY' },
    { files: headers('/*\n  X-Frame-Options: SAMEORIGIN\n'), flags: web, name: 'SAMEORIGIN' },
  ],
})

testRule(byId('headers-referrer-policy'), {
  invalid: [{ errors: ['missing'], files: headers('/*\n  X-Frame-Options: DENY\n'), flags: web, name: 'missing', output: '/*\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n' }],
  valid: [
    { files: headers(full), flags: web, name: 'set' },
    { files: headers('/*\n  Referrer-Policy: no-referrer\n'), flags: web, name: 'another policy' },
  ],
})

testRule(byId('headers-csp'), {
  invalid: [{ errors: ['missing'], files: headers(full), flags: web, name: 'no CSP, not fixable' }],
  valid: [{ files: headers("/*\n  Content-Security-Policy: object-src 'none';\n"), flags: web, name: 'a CSP' }],
})

testRule(byId('headers-sw-no-cache'), {
  invalid: [{ errors: ['missing'], files: headers(full), flags: web, name: 'a PWA without the sw.js rule', output: `${full}/sw.js\n  Cache-Control: no-cache\n`, pkg: { devDependencies: { 'vite-plugin-pwa': '^1.0.0' } } }],
  valid: [
    { files: headers(`${full}/sw.js\n  Cache-Control: no-cache\n`), flags: web, name: 'no cache', pkg: { devDependencies: { 'vite-plugin-pwa': '^1.0.0' } } },
    { files: headers(`${full}/sw.js\n  X-Other: a\n  Cache-Control: max-age=0, no-cache\n`), flags: web, name: 'no-cache among other headers', pkg: { devDependencies: { 'vite-plugin-pwa': '^1.0.0' } } },
    { files: headers(full), flags: web, name: 'no service worker', pkg: { name: 'app' } },
  ],
})
