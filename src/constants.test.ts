import { expect, it } from 'vitest'
import { ProjectData, home, repoCheckerPath } from './constants'

it('home (process.env.HOME) is defined', () => {
  expect(home.length > 0).toBe(true)
})

it('repoCheckerPath (process.env.pwd) is defined', () => {
  expect(repoCheckerPath.length > 0).toBe(true)
})

it('ProjectData ban sass by default', () => {
  expect(new ProjectData().shouldAvoidSass).toBe(true)
})

it('ProjectData assign', () => {
  expect(new ProjectData({ shouldAvoidSass: false }).shouldAvoidSass).toBe(false)
})
