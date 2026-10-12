import { requireProperty } from './package.utils.ts'

// biome-ignore format: one rule per line
export const propertyRules = [
  requireProperty({ id: 'package-name', key: 'name', severity: 'error' }),
  requireProperty({ expected: 'https://json.schemastore.org/package', id: 'package-schema', isFirst: true, key: '$schema', severity: 'warning' }),
]
