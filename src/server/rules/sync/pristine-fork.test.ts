import type { ForkStatus } from '../../../shared/project.ts'
import { testProjectRule } from '../../test/rule-tester.ts'
import { pristineFork } from './pristine-fork.rule.ts'

const pristine: ForkStatus = { branches: [{ aheadBy: 0, name: 'master' }], failures: [], openPullRequests: 0, parent: 'them/lib' }
const fork = (forkStatus: ForkStatus = pristine) => ({ forkStatus, isFork: true })

testProjectRule(pristineFork, {
  invalid: [
    { actions: [['delete-fork']], errors: ['pristine'], github: fork(), name: 'pristine, not cloned' },
    { actions: [['delete-fork']], errors: ['pristineWithClone'], github: fork(), local: {}, name: 'pristine, with a clean clone' },
    { actions: [['delete-fork']], errors: ['pristine'], github: { ...fork(), isArchived: true }, name: 'pristine and archived, one delete only' },
    {
      errors: ['kept'],
      github: fork({
        ...pristine,
        branches: [
          { aheadBy: 0, name: 'master' },
          { aheadBy: 1, name: 'patch-1' },
        ],
      }),
      name: 'a branch ahead of the parent',
    },
    { errors: ['kept'], github: fork({ ...pristine, openPullRequests: 1 }), name: 'an open pull request' },
    { errors: ['kept'], github: fork({ ...pristine, openPullRequests: 2 }), name: 'two open pull requests' },
    { errors: ['kept'], github: fork(), local: { unpushed: [{ branch: 'master', subjects: ['wip'] }] }, name: 'a clone with unsaved work' },
    { errors: ['kept'], github: fork(), local: { fetchFailed: true }, name: 'a clone whose fetch failed' },
    // Value: protects=delete-fork, which also removes the clone, is never offered while the clone holds any kind of unsaved work; fails_when=forkBlockers reads only unpushed; why_new=only unpushed was a row; seam=none; no_claim=GitHub compare
    { errors: ['kept'], github: fork(), local: { changedFiles: [' M a.txt'] }, name: 'a clone with only a changed file' },
    { errors: ['kept'], github: fork(), local: { stashes: ['stash@{0}: WIP'] }, name: 'a clone with only a stash' },
    { errors: ['kept'], github: fork(), local: { localOnlyBranches: ['idea'] }, name: 'a clone with only a local-only branch' },
    { errors: ['cannotVerify'], github: fork({ ...pristine, failures: ['repos/them/lib/compare/main...me:master: no common ancestor'] }), name: 'a failed comparison' },
    { errors: ['notChecked'], github: { forkStatus: undefined, isFork: true }, name: 'not compared yet' },
  ],
  valid: [
    { github: {}, local: {}, name: 'not a fork' },
    { local: {}, name: 'not on GitHub' },
  ],
})
