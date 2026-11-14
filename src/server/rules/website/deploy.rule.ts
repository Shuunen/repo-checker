import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'

/** The statuses the check tells apart */
const httpStatus = { forbidden: 403, tooManyRequests: 429, unauthorized: 401 }

/** The statuses that mean the site answers even if it keeps this request out: a login, a bot filter, a rate limit */
const answeringStatuses = new Set([httpStatus.unauthorized, httpStatus.forbidden, httpStatus.tooManyRequests])

/** The first status that means the site is broken */
const firstErrorStatus = 400

export const deployDown = defineRule({
  appliesTo: ({ flags }) => flags.webStatus !== undefined,
  check({ flags, report }) {
    const web = flags.webStatus
    invariant(web !== undefined, 'appliesTo guarantees the status of the website')
    if (web.status === 'unreachable') report({ data: { url: web.url }, messageId: 'unreachable' })
    else if (web.status >= firstErrorStatus && !answeringStatuses.has(web.status)) report({ data: { status: web.status, url: web.url }, messageId: 'error' })
  },
  meta: { id: 'deploy-down', messages: { error: '{{url}} answers HTTP {{status}}', unreachable: '{{url}} does not respond' }, severity: 'error' },
})
