import test from 'ava'
import { home, repoCheckerPath } from '../src/constants'

test('home (process.env.HOME) is defined', t => t.truthy(home))
// console.log(`home is "${home}"`)

test('repoCheckerPath (process.env.pwd) is defined', t => t.truthy(repoCheckerPath))
// console.log(`repoCheckerPath is "${repoCheckerPath}"`)
