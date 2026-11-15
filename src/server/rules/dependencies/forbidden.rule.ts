import { forbidDependency } from './dependencies.utils.ts'

export const forbiddenDependencyRules = [
  forbidDependency({ id: 'esbuild-plugin-run-alternative', names: ['esbuild-plugin-run'], reason: 'use typescript-run instead, like "dev": "ts-run src --watch"', severity: 'warning' }),
  forbidDependency({ id: 'no-axios-dependency', names: ['axios'], reason: 'it is fat, use the native fetch', severity: 'warning' }),
  forbidDependency({ id: 'no-classnames-dependency', names: ['classnames'], reason: 'use clsx instead, it is smaller', severity: 'warning' }),
  forbidDependency({ id: 'no-cross-var-dependency', names: ['cross-var'], reason: 'it is old and deprecated', severity: 'error' }),
  forbidDependency({ id: 'no-fat-color-dependency', names: ['chalk', 'colorette', 'colors'], reason: 'it is fat, use shuutils or nanocolors', severity: 'warning' }),
  forbidDependency({ id: 'no-fs-extra-dependency', names: ['fs-extra'], reason: 'it is fat, use native fs', severity: 'warning' }),
  forbidDependency({ id: 'no-jsdom-dependency', names: ['jsdom'], reason: 'it is fat and slow, use happy-dom instead', severity: 'warning' }),
  forbidDependency({ id: 'no-lodash-dependency', names: ['lodash', 'lodash-es'], reason: 'it is fat, use es-toolkit instead', severity: 'warning' }),
  forbidDependency({ id: 'no-moment-dependency', names: ['moment', 'moment-timezone'], reason: 'it is fat and in maintenance mode, use the native Intl and Date or shuutils', severity: 'warning' }),
  forbidDependency({ id: 'no-npm-run-all-dependency', names: ['npm-run-all'], reason: 'it is fat, chain tasks with && or use npm-parallel', severity: 'warning' }),
  forbidDependency({ id: 'no-react-icons-dependency', names: ['react-icons'], reason: 'it is fat, use lucide-react instead', severity: 'warning' }),
  forbidDependency({ id: 'no-sass-dependency', names: ['node-sass', 'sass'], reason: 'it is fat and useless', severity: 'error', when: ({ flags }) => flags.shouldAvoidSass !== false }),
  forbidDependency({ id: 'no-shuunen-stack-dependency', names: ['shuunen-stack'], reason: 'it is utopian', severity: 'warning' }),
  forbidDependency({ id: 'no-tslint-dependency', names: ['tslint'], reason: 'it is deprecated', severity: 'error' }),
]
