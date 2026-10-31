import { testProjectRule } from '../../engine/rule-tester.ts'
import { openIssues, openPullRequests, openRenovatePullRequests } from './pull-requests.rule.ts'

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
  invalid: [{ errors: ['open'], github: read(2, 0, 2), name: 'two pull requests of someone else' }],
  valid: [{ github: read(0, 4, 4), name: 'only Renovate pull requests, left to open-renovate-pr' }, { github: read(0, 0), name: 'none' }, ...notChecked],
})

testProjectRule(openRenovatePullRequests, {
  invalid: [{ errors: ['open'], github: read(0, 3, 3), name: 'three Renovate pull requests' }],
  valid: [{ github: read(2, 0, 2), name: 'only pull requests of someone else' }, { github: read(0, 0), name: 'none' }, ...notChecked],
})

testProjectRule(openIssues, {
  invalid: [{ errors: ['open'], github: read(1, 2, 6), name: 'six open items of which three are pull requests' }],
  valid: [{ github: read(1, 2, 3), name: 'only pull requests open' }, { github: read(0, 0, 0), name: 'nothing open' }, ...notChecked],
})
