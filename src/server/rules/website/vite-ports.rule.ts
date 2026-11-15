import { projectNumber } from '../../../shared/vite-ports.ts'
import { defineProjectRule } from '../../engine/define-project-rule.ts'

/** A dev port of the scheme, 51NN */
const devPort = /^51\d\d$/u

/** A preview port of the scheme, 41NN */
const previewPort = /^41\d\d$/u

/**
 * Get the project number of the ports of a clone, the NN of 51NN and 41NN
 * @param ports the dev and preview ports
 * @param ports.preview the preview port
 * @param ports.server the dev port
 * @returns the numbers, none for a port out of the scheme
 */
function numbersOf({ preview, server }: Readonly<{ preview?: number | undefined; server?: number | undefined }>) {
  return [...(server !== undefined && devPort.test(String(server)) ? [projectNumber(server)] : []), ...(preview !== undefined && previewPort.test(String(preview)) ? [projectNumber(preview)] : [])]
}

export const viteUniquePorts = defineProjectRule({
  check({ project, report, siblings }) {
    const mine = new Set(numbersOf(project.local?.vitePorts ?? {}))
    const clashes = siblings.filter(other => other.name !== project.name && numbersOf(other.local?.vitePorts ?? {}).some(number => mine.has(number)))
    if (clashes.length > 0)
      report({
        data: {
          projects: clashes
            .map(other => other.name)
            .toSorted()
            .join(', '),
        },
        messageId: 'clash',
      })
  },
  meta: { id: 'vite-unique-ports', messages: { clash: 'the vite ports share their project number (the NN of 51NN and 41NN) with {{projects}}, apps run together would collide' }, severity: 'info' },
})
