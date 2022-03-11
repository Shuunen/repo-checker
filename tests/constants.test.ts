import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { home, ProjectData, repoCheckerPath } from '../src/constants'

test('home (process.env.HOME) is defined', function () {
  equal(home.length > 0, true)
  // console.log(`home is "${home}"`)
})

test('repoCheckerPath (process.env.pwd) is defined', function () {
  equal(repoCheckerPath.length > 0, true)
  // console.log(`repoCheckerPath is "${repoCheckerPath}"`)
})

test('ProjectData ban sass by default', function (){
  const data = new ProjectData()
  equal(data.ban_sass, true)
})

test('ProjectData assign', function (){
  const data = new ProjectData({ ban_sass: false })
  equal(data.ban_sass, false)
})

test.run()
