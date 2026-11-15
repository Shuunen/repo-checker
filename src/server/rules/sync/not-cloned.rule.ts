import { defineProjectRule } from '../../engine/define-project-rule.ts'
import { isStaleUncloned } from '../github-health/repo-activity.utils.ts'

export const notCloned = defineProjectRule({
  appliesTo: ({ project }) => project.github !== undefined && project.local === undefined,
  check({ project, report }) {
    if (project.github?.isArchived === false && !project.github.isFork && !isStaleUncloned(project)) report({ actions: ['clone'], messageId: 'missing' })
  },
  meta: { id: 'not-cloned', messages: { missing: 'on GitHub but not cloned in this folder' }, severity: 'info' },
})
