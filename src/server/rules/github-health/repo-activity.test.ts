import { testProjectRule } from '../../engine/rule-tester.ts'
import { staleUnclonedRepo, archiveCandidate, renovateOnlyZombie } from './archive.rule.ts'
import { ciFailing } from './ci.rule.ts'

const old = '2020-01-01T00:00:00Z'
const recent = new Date().toISOString()
const unused = { hasPages: false, homepage: undefined, lastOwnCommitAt: old, pullRequests: { other: 0, renovate: 0 }, stars: 0 }
const zombie = { ...unused, pullRequests: { other: 0, renovate: 3 } }
const clone = {}

/** The cases where a project is not a live own repo, whatever its activity */
const notAlive = [
  { github: { ...unused, isArchived: true }, local: clone, name: 'an archived repo' },
  { github: { ...unused, isFork: true }, local: clone, name: 'a fork' },
  { github: unused, isOtherOwner: true, local: clone, name: 'a clone of another owner' },
]

testProjectRule(ciFailing, {
  invalid: [{ errors: ['failing'], github: { ci: 'failing' }, name: 'a red CI' }],
  valid: [
    { github: { ci: 'passing' }, name: 'a green CI' },
    { github: { ci: 'none' }, name: 'no workflow' },
    { github: {}, name: 'a CI that was not read' },
    { github: { ci: 'failing', isArchived: true }, name: 'an archived repo' },
    { github: { ci: 'failing', isFork: true }, name: 'a fork' },
    { name: 'not on GitHub' },
  ],
})

testProjectRule(archiveCandidate, {
  invalid: [
    { actions: [['archive']], errors: ['idle'], github: unused, local: clone, name: 'a cloned repo nobody touched for years, nobody starred, nothing deployed' },
    { actions: [['archive']], errors: ['idle'], github: { ...unused, lastOwnCommitAt: 'never' }, local: clone, name: 'a repo the account never committed to' },
  ],
  valid: [
    { github: { ...unused, lastOwnCommitAt: recent }, local: clone, name: 'a recent commit' },
    { github: { ...unused, lastOwnCommitAt: undefined }, local: clone, name: 'a last commit that was not read' },
    { github: { ...unused, stars: 2 }, local: clone, name: 'a starred repo' },
    { github: { ...unused, homepage: 'https://example.com' }, local: clone, name: 'a repo with a website' },
    { github: { ...unused, hasPages: true }, local: clone, name: 'a repo with GitHub Pages' },
    { github: zombie, local: clone, name: 'a zombie, left to renovate-only-zombie' },
    { github: unused, name: 'a repo that is not cloned, left to stale-uncloned-repo' },
    ...notAlive,
  ],
})

testProjectRule(renovateOnlyZombie, {
  invalid: [{ actions: [['archive']], errors: ['zombie'], github: zombie, local: clone, name: 'three Renovate pull requests and no commit of yours for years' }],
  valid: [
    { github: { ...zombie, lastOwnCommitAt: recent }, local: clone, name: 'a recent commit of yours' },
    { github: { ...zombie, lastOwnCommitAt: undefined }, local: clone, name: 'a last commit that was not read' },
    { github: unused, local: clone, name: 'no Renovate pull request' },
    { github: { ...unused, pullRequests: undefined }, local: clone, name: 'pull requests that were not read' },
    ...notAlive,
  ],
})

testProjectRule(staleUnclonedRepo, {
  invalid: [{ actions: [['archive']], errors: ['idle'], github: unused, name: 'an old repo that is not cloned' }],
  valid: [
    { github: { ...unused, lastOwnCommitAt: recent }, name: 'a recent repo' },
    { github: zombie, name: 'a zombie, left to renovate-only-zombie' },
    { github: { ...unused, isArchived: true }, name: 'an archived repo' },
    { github: unused, local: clone, name: 'a cloned repo' },
    { name: 'not on GitHub' },
  ],
})
