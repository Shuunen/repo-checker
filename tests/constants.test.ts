import { Nb } from 'shuutils'
import { expect, it } from 'vitest'
import { home, ProjectData, repoCheckerPath } from '../src/constants'

it('home (process.env.HOME) is defined', () => { expect(home.length > Nb.Zero).toBe(true) })

it('repoCheckerPath (process.env.pwd) is defined', () => { expect(repoCheckerPath.length > Nb.Zero).toBe(true) })

it('ProjectData ban sass by default', () => { expect(new ProjectData().shouldAvoidSass).toBe(true) })

it('ProjectData assign', () => { expect(new ProjectData({ shouldAvoidSass: false }).shouldAvoidSass).toBe(false) })

