import { strictEqual as equal } from 'assert'
import { home, repoCheckerPath } from '../src/constants'

describe('constants', function () {
  it('home (process.env.HOME) is defined', function () {
    equal(home.length > 0, true)
  })
  // console.log(`home is "${home}"`)

  it('repoCheckerPath (process.env.pwd) is defined', function () {
    equal(repoCheckerPath.length > 0, true)
  })
  // console.log(`repoCheckerPath is "${repoCheckerPath}"`)
})
