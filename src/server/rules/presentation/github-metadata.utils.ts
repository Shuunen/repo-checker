import { invariant } from 'es-toolkit'
import type { ActionKind } from '../../../shared/action.ts'
import type { GithubRepo } from '../../../shared/project.ts'
import type { Severity } from '../../../shared/scan-event.ts'
import { defineProjectRule } from '../../engine/define-project-rule.ts'

/** What a check of the GitHub presentation of a repo needs */
interface RepoFieldOptions {
  /** The actions offered with the finding, none when left out */
  actions?: ActionKind[]
  /** The check id */
  id: string
  /** Tell if the repo lacks the field */
  isMissing: (repo: Readonly<GithubRepo>) => boolean
  /** The message, shown when the field is missing */
  message: string
  /** Skip the check when the repo is private */
  publicOnly?: boolean
  /** The severity of the check */
  severity: Severity
}

/**
 * Make a check on how an own repo presents itself on GitHub (license, description, topics, homepage). It only applies to repos of the owner that are not archived and not forks: an old or borrowed repo is not worth decorating
 * @param options the check
 * @param options.actions the actions offered with the finding
 * @param options.id the check id
 * @param options.isMissing tells if the repo lacks the field
 * @param options.message the message
 * @param options.publicOnly skip the check when the repo is private
 * @param options.severity the severity
 * @returns the project rule
 * @example const missingTopics = requireRepoField({ id: 'missing-topics', isMissing: repo => repo.topics.length === 0, message: 'the repo has no topics', severity: 'info' })
 */
export function requireRepoField({ actions = [], id, isMissing, message, publicOnly = false, severity }: Readonly<RepoFieldOptions>) {
  return defineProjectRule({
    appliesTo: ({ project }) => project.github !== undefined && !project.github.isArchived && !project.github.isFork && !project.isOtherOwner && !(publicOnly && project.github.isPrivate),
    check({ project, report }) {
      invariant(project.github !== undefined, 'appliesTo guarantees a GitHub repo')
      if (isMissing(project.github)) report({ actions, messageId: 'missing' })
    },
    meta: { id, messages: { missing: message }, severity },
  })
}
