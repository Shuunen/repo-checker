import { type ConfigOptions, setOption } from '../../engine/fixer.ts'

/**
 * Get the `test` section of the options, created at its sorted place when there is none
 * @param options the options of the config
 * @returns the test section
 */
export function testOf(options: ConfigOptions) {
  if (options.test === undefined) setOption(options, 'test', {})
  return options.test as Record<string, unknown>
}
