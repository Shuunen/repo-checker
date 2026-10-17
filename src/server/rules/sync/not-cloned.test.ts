import { testProjectRule } from '../../engine/rule-tester.ts'
import { notCloned } from './not-cloned.rule.ts'

testProjectRule(notCloned, {
  invalid: [{ actions: [['clone']], errors: ['missing'], github: {}, name: 'on GitHub, not cloned' }],
  valid: [
    { github: {}, local: {}, name: 'cloned' },
    { github: { isArchived: true }, name: 'archived, not cloned' },
    { github: { isFork: true }, name: 'a fork, not cloned' },
    { local: { problem: 'no-git' }, name: 'a local folder only' },
  ],
})
