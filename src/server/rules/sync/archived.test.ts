import { testProjectRule } from '../../test/rule-tester.ts'
import { archivedClone, archivedWithUnsavedWork } from './archived.rule.ts'

const archived = { isArchived: true }
const unpushed = { unpushed: [{ branch: 'master', subjects: ['wip'] }] }

testProjectRule(archivedWithUnsavedWork, {
  invalid: [
    { actions: [['unarchive-push', 'discard']], errors: ['unsaved'], github: archived, local: unpushed, name: 'an unpushed commit' },
    { actions: [['unarchive-push', 'discard']], errors: ['unsaved'], github: archived, local: { changedFiles: ['?? notes.txt'], localOnlyBranches: ['idea'], stashes: ['stash@{0}: WIP'] }, name: 'a changed file, a stash and a local-only branch' },
    { errors: ['unsavedNoFetch'], github: archived, local: { ...unpushed, fetchFailed: true }, name: 'unsaved work and a failed fetch, nothing offered' },
  ],
  valid: [
    { github: archived, local: {}, name: 'a clean clone' },
    { github: { isArchived: true, isFork: true }, local: unpushed, name: 'an archived fork, left to pristine-fork' },
    { github: {}, local: unpushed, name: 'not archived' },
    { github: archived, local: { problem: 'no-origin' }, name: 'not a usable clone' },
    { github: archived, name: 'not cloned' },
  ],
})

testProjectRule(archivedClone, {
  invalid: [
    { actions: [['delete-clone']], errors: ['safe'], github: archived, local: {}, name: 'a clean clone' },
    { errors: ['cannotVerify'], github: archived, local: { fetchFailed: true }, name: 'a clean clone whose fetch failed, nothing offered' },
  ],
  valid: [
    { github: archived, local: unpushed, name: 'unsaved work, left to archived-with-unsaved-work' },
    // Value: protects=delete-clone is never offered while any one kind of unsaved work is in the clone; fails_when=archivedClone checks only unpushed commits; why_new=only the unpushed kind was a row; seam=none; no_claim=git reading
    { github: archived, local: { changedFiles: ['?? notes.txt'] }, name: 'only a changed file, never offered for delete' },
    { github: archived, local: { stashes: ['stash@{0}: WIP'] }, name: 'only a stash, never offered for delete' },
    { github: archived, local: { localOnlyBranches: ['idea'] }, name: 'only a local-only branch, never offered for delete' },
    { github: {}, local: {}, name: 'not archived' },
  ],
})
