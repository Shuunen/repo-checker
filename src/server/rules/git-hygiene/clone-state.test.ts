import { testProjectRule } from '../../engine/rule-tester.ts'
import { behindRemote, branchWithoutUpstream, forgottenStash, notOnDefaultBranch, uncommittedFiles, unpushedCommits } from './clone-state.rule.ts'

const archived = { isArchived: true }
const behind = { branches: [{ ahead: 0, behind: 2, isGone: false, name: 'master', upstream: 'origin/master' }] }
const unpushed = { unpushed: [{ branch: 'master', subjects: ['wip', 'more wip'] }] }

testProjectRule(behindRemote, {
  invalid: [{ errors: ['behind'], github: {}, local: behind, name: 'a branch 2 behind its upstream' }],
  valid: [
    { github: {}, local: {}, name: 'a clone that is up to date' },
    { github: {}, local: { branches: [{ ahead: 0, behind: 3, isGone: true, name: 'old', upstream: 'origin/old' }] }, name: 'a branch whose upstream was deleted, left to branch-without-upstream' },
    { github: {}, local: { ...behind, fetchFailed: true }, name: 'a failed fetch, the remote refs are stale' },
    { github: archived, local: behind, name: 'an archived repo, left to the archive checks' },
    { github: {}, isOtherOwner: true, local: behind, name: 'a clone of another owner' },
    { local: behind, name: 'a clone without GitHub repo' },
    { github: {}, local: { ...behind, problem: 'no-git' }, name: 'not a usable clone' },
    { github: {}, name: 'not cloned' },
  ],
})

testProjectRule(uncommittedFiles, {
  invalid: [{ errors: ['found'], github: {}, local: { changedFiles: ['?? notes.txt', ' M a.ts'] }, name: 'a changed and an untracked file' }],
  valid: [
    { github: {}, local: {}, name: 'a clean clone' },
    { github: archived, local: { changedFiles: ['?? notes.txt'] }, name: 'an archived repo, left to the archive checks' },
    { github: {}, isOtherOwner: true, local: { changedFiles: ['?? notes.txt'] }, name: 'a clone of another owner' },
    { name: 'not cloned' },
  ],
})

testProjectRule(unpushedCommits, {
  invalid: [{ errors: ['found'], github: {}, local: unpushed, name: 'two unpushed commits on master' }],
  valid: [
    { github: {}, local: {}, name: 'nothing unpushed' },
    { github: {}, local: { ...unpushed, fetchFailed: true }, name: 'a failed fetch, the remote refs are stale' },
    { github: archived, local: unpushed, name: 'an archived repo, left to the archive checks' },
    { local: unpushed, name: 'a clone without GitHub repo' },
  ],
})

testProjectRule(forgottenStash, {
  invalid: [{ errors: ['found'], github: {}, local: { stashes: ['stash@{0}: WIP'] }, name: 'a stash' }],
  valid: [
    { github: {}, local: {}, name: 'no stash' },
    { github: archived, local: { stashes: ['stash@{0}: WIP'] }, name: 'an archived repo, left to the archive checks' },
  ],
})

testProjectRule(branchWithoutUpstream, {
  invalid: [{ errors: ['found'], github: {}, local: { localOnlyBranches: ['idea', 'wip'] }, name: 'two local-only branches' }],
  valid: [
    { github: {}, local: {}, name: 'every branch has an upstream' },
    { github: archived, local: { localOnlyBranches: ['idea'] }, name: 'an archived repo, left to the archive checks' },
  ],
})

testProjectRule(notOnDefaultBranch, {
  invalid: [
    { actions: [['checkout-default']], errors: ['found'], github: { defaultBranch: 'master' }, local: { currentBranch: 'feat/astro' }, name: 'another branch than the default one' },
    { actions: [['checkout-default']], errors: ['found'], github: { defaultBranch: 'master' }, local: { currentBranch: '' }, name: 'a detached HEAD' },
  ],
  valid: [
    { github: { defaultBranch: 'master' }, local: { currentBranch: 'master' }, name: 'the default branch' },
    { github: { defaultBranch: 'master' }, isOtherOwner: true, local: { currentBranch: 'feat' }, name: 'a clone of another owner' },
    { local: { currentBranch: 'feat' }, name: 'a clone without GitHub repo' },
    { github: { defaultBranch: 'master', isArchived: true }, local: { currentBranch: 'feat' }, name: 'an archived repo, left to the archive checks' },
  ],
})
