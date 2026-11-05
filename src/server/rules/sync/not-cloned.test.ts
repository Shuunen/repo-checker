import { testProjectRule } from '../../engine/rule-tester.ts'
import { notCloned } from './not-cloned.rule.ts'

const old = '2020-01-01T00:00:00Z'
const recent = new Date().toISOString()

testProjectRule(notCloned, {
  invalid: [
    { actions: [['clone']], errors: ['missing'], github: {}, name: 'on GitHub, not cloned' },
    { actions: [['clone']], errors: ['missing'], github: { lastOwnCommitAt: old, pullRequests: { other: 0, renovate: 2 } }, name: 'an old repo kept alive by Renovate, a zombie, is cloned or archived by hand' },
    { actions: [['clone']], errors: ['missing'], github: { lastOwnCommitAt: recent }, name: 'a recent repo' },
  ],
  valid: [
    { github: {}, local: {}, name: 'cloned' },
    { github: { isArchived: true }, name: 'archived, not cloned' },
    { github: { isFork: true }, name: 'a fork, not cloned' },
    { github: { lastOwnCommitAt: old }, name: 'an old repo, left to stale-uncloned-repo that offers to archive it' },
    { local: { problem: 'no-git' }, name: 'a local folder only' },
  ],
})
