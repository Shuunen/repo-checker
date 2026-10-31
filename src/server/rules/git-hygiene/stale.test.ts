import { testProjectRule } from '../../engine/rule-tester.ts'
import { staleLastTag, staleLocalBranch, staleRemoteBranch } from './stale.rule.ts'

const old = '2020-01-01T00:00:00Z'
const recent = new Date().toISOString()
const archived = { isArchived: true }
const branch = (name: string, fields: { isMerged?: boolean; lastCommitAt?: string } = {}) => ({ ahead: 0, behind: 0, isGone: false, name, upstream: undefined, ...fields })
const remote = (name: string, fields: { isMerged?: boolean; lastCommitAt?: string } = {}) => ({ isMerged: false, lastCommitAt: recent, name, ...fields })

testProjectRule(staleLocalBranch, {
  invalid: [
    { errors: ['merged'], github: {}, local: { branches: [branch('master', { isMerged: true }), branch('done', { isMerged: true })], currentBranch: 'master' }, name: 'a merged branch, the default one is left alone' },
    { errors: ['untouched'], github: {}, local: { branches: [branch('old', { lastCommitAt: old }), branch('new', { lastCommitAt: recent })], currentBranch: 'master' }, name: 'a branch untouched for years' },
    { errors: ['merged', 'untouched'], local: { branches: [branch('done', { isMerged: true }), branch('old', { lastCommitAt: old })], currentBranch: 'master' }, name: 'both, without GitHub repo' },
  ],
  valid: [
    { github: {}, local: { branches: [branch('feat', { isMerged: true })], currentBranch: 'feat' }, name: 'the checked out branch is never stale' },
    { github: {}, local: { branches: [branch('master', { lastCommitAt: old })], currentBranch: 'feat' }, name: 'the default branch is never stale' },
    { github: {}, local: { branches: [branch('feat')], currentBranch: 'master' }, name: 'a branch whose dates were not read' },
    { github: archived, local: { branches: [branch('done', { isMerged: true })] }, name: 'an archived repo, left to the archive checks' },
    { name: 'not cloned' },
  ],
})

testProjectRule(staleRemoteBranch, {
  invalid: [
    { errors: ['merged'], github: {}, local: { remoteBranches: [remote('master', { isMerged: true }), remote('done', { isMerged: true })] }, name: 'a merged branch, the default one is left alone' },
    { errors: ['untouched'], github: {}, local: { remoteBranches: [remote('old', { lastCommitAt: old })] }, name: 'a branch untouched for years' },
    { errors: ['merged', 'untouched'], github: {}, local: { remoteBranches: [remote('done', { isMerged: true }), remote('old', { lastCommitAt: old })] }, name: 'both' },
    { errors: ['merged'], github: {}, local: { remoteBranches: [remote('renovate/lodash-4.x', { isMerged: true })] }, name: 'a merged bot branch' },
  ],
  valid: [
    { github: {}, local: { remoteBranches: [remote('renovate/lodash-4.x', { lastCommitAt: old }), remote('dependabot/npm/x', { lastCommitAt: old })] }, name: 'bot branches wait for their pull request' },
    { github: {}, local: { remoteBranches: [remote('new')] }, name: 'a recent branch' },
    { github: {}, local: {}, name: 'remote branches that were not read' },
    { github: {}, local: { fetchFailed: true, remoteBranches: [remote('done', { isMerged: true })] }, name: 'a failed fetch, the remote refs are stale' },
    { local: { remoteBranches: [remote('done', { isMerged: true })] }, name: 'a clone without GitHub repo' },
  ],
})

testProjectRule(staleLastTag, {
  invalid: [{ errors: ['old'], github: {}, local: { lastTag: { at: old, commitsSince: 12, name: 'v1.0.0' } }, name: 'an old tag with commits since' }],
  valid: [
    { github: {}, local: { lastTag: { at: old, commitsSince: 0, name: 'v1.0.0' } }, name: 'an old tag but nothing changed since' },
    { github: {}, local: { lastTag: { at: recent, commitsSince: 12, name: 'v1.0.0' } }, name: 'a recent tag' },
    { github: {}, local: {}, name: 'no tag' },
    { github: archived, local: { lastTag: { at: old, commitsSince: 12, name: 'v1.0.0' } }, name: 'an archived repo' },
  ],
})
