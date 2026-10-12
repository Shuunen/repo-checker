import { testProjectRule } from '../../engine/rule-tester.ts'
import { brokenClone } from './broken-clone.rule.ts'

testProjectRule(brokenClone, {
  invalid: [
    { errors: ['noGit'], local: { origin: undefined, problem: 'no-git', slug: undefined }, name: 'not a git repo' },
    { errors: ['noOrigin'], local: { origin: undefined, problem: 'no-origin', slug: undefined }, name: 'no origin' },
    { errors: ['originNotFound'], local: {}, name: 'an origin of the owner that matches no repo' },
  ],
  valid: [
    { github: {}, local: {}, name: 'a clone of a repo' },
    { isOtherOwner: true, local: { origin: 'git@github.com:someone/lib.git', slug: 'someone/lib' }, name: 'a clone of another owner' },
    { github: {}, name: 'not cloned' },
  ],
})
