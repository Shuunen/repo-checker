import { invariant } from 'es-toolkit'
import { defineProjectRule } from '../../engine/define-project-rule.ts'

export const brokenClone = defineProjectRule({
  appliesTo: ({ project }) => project.local !== undefined && !project.isOtherOwner,
  check({ project, report }) {
    const { github, local } = project
    invariant(local !== undefined, 'appliesTo guarantees a local folder')
    if (local.problem === 'no-git') report({ data: { path: local.path }, messageId: 'noGit' })
    else if (local.problem === 'no-origin') report({ data: { path: local.path }, messageId: 'noOrigin' })
    else if (github === undefined) report({ data: { origin: String(local.origin) }, messageId: 'originNotFound' })
  },
  meta: {
    id: 'broken-clone',
    messages: { noGit: '{{path}} is not a git repository', noOrigin: '{{path}} has no origin remote', originNotFound: 'the origin {{origin}} does not exist on GitHub, the repo was renamed or deleted' },
    severity: 'warning',
  },
})
