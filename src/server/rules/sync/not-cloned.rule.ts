import { defineProjectRule } from '../../engine/define-project-rule.ts'

export const notCloned = defineProjectRule({
  appliesTo: ({ project }) => project.github !== undefined && project.local === undefined,
  check({ project, report }) {
    if (project.github?.isArchived === false && !project.github.isFork) report({ actions: ['clone'], messageId: 'missing' })
  },
  meta: { id: 'not-cloned', messages: { missing: 'on GitHub but not cloned in this folder' }, severity: 'info' },
})
