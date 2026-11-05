import { testRule } from '../../engine/rule-tester.ts'
import { deployDown } from './deploy.rule.ts'

const url = 'https://app.example.com'

testRule(deployDown, {
  invalid: [
    { errors: ['unreachable'], flags: { webStatus: { status: 'unreachable', url } }, name: 'a site that does not respond' },
    { errors: ['error'], flags: { webStatus: { status: 404, url } }, name: 'a page not found' },
    { errors: ['error'], flags: { webStatus: { status: 503, url } }, name: 'a server error' },
  ],
  valid: [
    { flags: { webStatus: { status: 200, url } }, name: 'a site that answers' },
    { flags: { webStatus: { status: 301, url } }, name: 'a redirect' },
    { flags: { webStatus: { status: 403, url } }, name: 'a site that keeps the request out answers' },
    { flags: { webStatus: { status: 401, url } }, name: 'a login' },
    { flags: { webStatus: { status: 429, url } }, name: 'a rate limit' },
    { name: 'no website, or offline' },
  ],
})
