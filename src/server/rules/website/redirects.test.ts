import { testRule } from '../../test/rule-tester.ts'
import { redirectsSpaFallback } from './redirects.rule.ts'

const pkg = { dependencies: { 'react-router': '7.0.0' } }
const flags = { webUrl: 'https://app.netlify.app' }

testRule(redirectsSpaFallback, {
  invalid: [
    { errors: ['missing'], flags, name: 'no redirects file, one is created', output: '/* /index.html 200\n', pkg },
    { errors: ['missing'], files: { 'public/_redirects': '/old /new 301\n' }, flags, name: 'a redirects file without the fallback', output: '/old /new 301\n/* /index.html 200\n', pkg },
    { errors: ['missing'], files: { _redirects: '' }, flags, name: 'an empty root redirects file', output: '/* /index.html 200\n', pkg },
  ],
  valid: [
    { files: { 'public/_redirects': '/* /index.html 200\n' }, flags, name: 'the fallback', pkg },
    { files: { 'static/_redirects': '/old /new 301\n/*   /index.html   200\n' }, flags, name: 'the fallback with more spaces', pkg },
    { flags, name: 'no router' },
    { flags: { webUrl: 'https://example.com' }, name: 'not a Netlify site', pkg },
    { name: 'no web url', pkg },
  ],
})
