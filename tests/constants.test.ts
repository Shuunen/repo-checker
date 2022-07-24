import { check } from 'shuutils'
import { home, ProjectData, repoCheckerPath } from '../src/constants'

check('home (process.env.HOME) is defined', home.length > 0, true)

check('repoCheckerPath (process.env.pwd) is defined', repoCheckerPath.length > 0, true)

check('ProjectData ban sass by default', new ProjectData().ban_sass, true)

check('ProjectData assign', new ProjectData({ ban_sass: false }).ban_sass, false)

check.run()
