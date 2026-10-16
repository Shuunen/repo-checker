import { isPublishable } from '../../engine/package-json.ts'
import { requireProperty } from '../../engine/require-property.ts'

export const propertyRules = [
  requireProperty({ id: 'package-files', key: 'files', severity: 'warning', when: ({ pkg }) => isPublishable(pkg) }),
  requireProperty({ id: 'package-name', key: 'name', severity: 'error' }),
  requireProperty({ id: 'package-private', key: 'private', severity: 'warning' }),
  requireProperty({ expected: 'https://json.schemastore.org/package', id: 'package-schema', isFirst: true, key: '$schema', severity: 'warning' }),
  requireProperty({ id: 'package-version', key: 'version', severity: 'error' }),
]
