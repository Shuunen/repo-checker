import { forbidDependency } from './dependencies.utils.ts'

// biome-ignore format: one rule per line
export const forbiddenDependencyRules = [
  forbidDependency({ id: 'esbuild-plugin-run-alternative', names: ['esbuild-plugin-run'], reason: 'use typescript-run instead, like "dev": "ts-run src --watch"', severity: 'warning' }),
  forbidDependency({ id: 'no-cross-var-dependency', names: ['cross-var'], reason: 'it is old and deprecated', severity: 'error' }),
  forbidDependency({ id: 'no-fat-color-dependency', names: ['chalk', 'colorette', 'colors'], reason: 'it is fat, use shuutils or nanocolors', severity: 'warning' }),
  forbidDependency({ id: 'no-fs-extra-dependency', names: ['fs-extra'], reason: 'it is fat, use native fs', severity: 'warning' }),
  forbidDependency({ id: 'no-jsdom-dependency', names: ['jsdom'], reason: 'it is fat and slow, use happy-dom instead', severity: 'warning' }),
  forbidDependency({ id: 'no-npm-run-all-dependency', names: ['npm-run-all'], reason: 'it is fat, chain tasks with && or use npm-parallel', severity: 'warning' }),
  forbidDependency({ id: 'no-sass-dependency', names: ['node-sass', 'sass'], reason: 'it is fat and useless', severity: 'error', when: ({ flags }) => flags.shouldAvoidSass !== false }),
  forbidDependency({ id: 'no-shuunen-stack-dependency', names: ['shuunen-stack'], reason: 'it is utopian', severity: 'warning' }),
  forbidDependency({ id: 'no-tslint-dependency', names: ['tslint'], reason: 'it is deprecated', severity: 'error' }),
]
