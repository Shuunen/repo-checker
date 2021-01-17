import { strictEqual as equal } from 'assert'
import { home, repoCheckerPath } from '../src/constants'

describe('constants', () => {
  it('home (process.env.HOME) is defined', () => {
    equal(home.length > 0, true)
  })
  // console.log(`home is "${home}"`)

  it('repoCheckerPath (process.env.pwd) is defined', () => {
    equal(repoCheckerPath.length > 0, true)
  })
  // console.log(`repoCheckerPath is "${repoCheckerPath}"`)
})
