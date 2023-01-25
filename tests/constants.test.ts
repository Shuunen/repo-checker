import { check, checksRun, Nb } from 'shuutils'
import { home, ProjectData, repoCheckerPath } from '../src/constants'

check('home (process.env.HOME) is defined', home.length > Nb.Zero, true)

check('repoCheckerPath (process.env.pwd) is defined', repoCheckerPath.length > Nb.Zero, true)

check('ProjectData ban sass by default', new ProjectData().banSass, true)

check('ProjectData assign', new ProjectData({ banSass: false }).banSass, false)

checksRun()
