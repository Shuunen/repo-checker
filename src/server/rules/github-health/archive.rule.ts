import { defineProjectRule } from '../../engine/define-project-rule.ts'
import { idleText, isArchiveCandidate, isLiveOwnRepo, isStaleUncloned, isZombie, renovateCount, repoOf } from './repo-activity.utils.ts'

export const archiveCandidate = defineProjectRule({
  appliesTo: ({ project }) => isLiveOwnRepo(project) && project.local !== undefined,
  check({ project, report }) {
    const repo = repoOf(project)
    if (isArchiveCandidate(repo)) report({ actions: ['archive'], data: { idle: idleText(repo) }, messageId: 'idle' })
  },
  meta: { id: 'archive-candidate', messages: { idle: '{{idle}}, no star and nothing deployed, it could be archived' }, severity: 'info' },
})

export const renovateOnlyZombie = defineProjectRule({
  appliesTo: ({ project }) => isLiveOwnRepo(project),
  check({ project, report }) {
    const repo = repoOf(project)
    if (isZombie(repo)) report({ actions: ['archive'], data: { count: renovateCount(repo), idle: idleText(repo) }, messageId: 'zombie' })
  },
  meta: { id: 'renovate-only-zombie', messages: { zombie: '{{idle}}, only kept alive by {{count}} Renovate pull requests, archiving it stops the bot noise' }, severity: 'info' },
})

export const staleUnclonedRepo = defineProjectRule({
  appliesTo: ({ project }) => isLiveOwnRepo(project) && project.local === undefined,
  check({ project, report }) {
    if (isStaleUncloned(project)) report({ actions: ['archive'], data: { idle: idleText(repoOf(project)) }, messageId: 'idle' })
  },
  meta: { id: 'stale-uncloned-repo', messages: { idle: '{{idle}}, it could be archived instead of cloned' }, severity: 'info' },
})
