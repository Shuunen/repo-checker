import { invariant, isNil } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'

/** Where a website puts its build, the first one that exists is measured */
const buildFolders = ['dist', 'build', 'out', '.output/public']

export const buildSize = defineRule({
  appliesTo: ({ flags }) => flags.isWebPublished === true && !isNil(flags.maxBuildSizeKo),
  async check({ files, flags, report }) {
    const { maxBuildSizeKo } = flags
    invariant(!isNil(maxBuildSizeKo), 'appliesTo guarantees maxBuildSizeKo')
    const sizes = await Promise.all(buildFolders.map(folder => files.sizeKo(folder)))
    const index = sizes.findIndex(size => size !== undefined)
    const sizeKo = sizes[index]
    // no build folder means the site was not built, nothing to measure
    if (!isNil(sizeKo) && sizeKo > maxBuildSizeKo) report({ data: { folder: String(buildFolders[index]), maxBuildSizeKo, sizeKo }, messageId: 'tooBig' })
  },
  meta: { id: 'build-size', messages: { tooBig: 'the build output {{folder}} is {{sizeKo}}Ko, the maximum is {{maxBuildSizeKo}}Ko' }, severity: 'warning' },
})
