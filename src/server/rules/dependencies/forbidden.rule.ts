import { forbidDependency } from './dependencies.utils.ts'

// biome-ignore format: one rule per line
export const forbiddenDependencyRules = [
  forbidDependency({ id: 'no-cross-var-dependency', name: 'cross-var', reason: 'it is old and deprecated', severity: 'error' }),
  forbidDependency({ id: 'no-tslint-dependency', name: 'tslint', reason: 'it is deprecated', severity: 'error' }),
]
