import { testProjectRule } from '../../test/rule-tester.ts'
import { openIssues, openPullRequests } from './pull-requests.rule.ts'

const read = (other: number, renovate: number, openItems = 0) => ({ openItems, pullRequests: { other, renovate } })

/** The cases where nothing is checked, however many items are open */
const notChecked = [
  { github: { ...read(3, 3, 9), isArchived: true }, name: 'an archived repo' },
  { github: { ...read(3, 3, 9), isFork: true }, name: 'a fork' },
  { github: read(3, 3, 9), isOtherOwner: true, name: 'a clone of another owner' },
  { github: { openItems: 9, pullRequests: undefined }, name: 'pull requests that were not read, an issue count would include them' },
  { name: 'a folder without GitHub repo' },
]

testProjectRule(openPullRequests, {
  invalid: [
    { errors: ['open'], github: { openItems: 1, pullRequests: { onlyUrl: 'https://github.com/owner/app/pull/3', other: 1, renovate: 0 } }, name: 'one pull request, linked directly' },
    { errors: ['open'], github: read(2, 0, 2), name: 'two pull requests of someone else' },
    { errors: ['open'], github: read(0, 3, 3), name: 'Renovate pull requests count too' },
    { errors: ['open'], github: { openItems: 3, pullRequests: { onActiveBranch: 1, other: 1, renovate: 1 } }, name: 'all but the one of the active branch' },
  ],
  valid: [
    { github: read(2, 0, 2), local: { hasPackageJson: false }, name: 'a clone without package.json' },
    { github: { openItems: 1, pullRequests: { onActiveBranch: 1, other: 1, renovate: 0 } }, name: 'only the pull request of the active branch' },
    { github: { ...read(2, 0, 2), defaultBranch: 'master' }, local: { currentBranch: 'feat/x' }, name: 'another branch than the default one checked out' },
    { github: read(0, 0), name: 'none' },
    ...notChecked,
  ],
})

testProjectRule(openIssues, {
  invalid: [{ errors: ['open'], github: read(1, 2, 6), name: 'six open items of which three are pull requests' }],
  valid: [{ github: read(1, 2, 3), name: 'only pull requests open' }, { github: read(0, 0, 0), name: 'nothing open' }, ...notChecked],
})
