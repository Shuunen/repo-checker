import { defineProjectRule } from '../../engine/define-project-rule.ts'
import { isLiveOwnRepo } from './repo-activity.utils.ts'

export const ciFailing = defineProjectRule({
  appliesTo: ({ project }) => isLiveOwnRepo(project) && project.github?.ci !== undefined,
  check({ project, report }) {
    if (project.github?.ci === 'failing') report({ data: { branch: project.github.defaultBranch }, messageId: 'failing' })
  },
  meta: { id: 'ci-failing', messages: { failing: 'the CI of the {{branch}} branch is red' }, severity: 'error' },
})
