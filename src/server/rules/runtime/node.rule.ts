import type { Context } from '../../engine/context.ts'
import { fallbackNodeVersion } from '../../engine/flags.ts'
import { requireFile, requireInFile } from '../../engine/file-rules.ts'

/** npm lifecycle scripts that run without enable-pre-post-scripts, they do not need the option */
const lifecycleScripts = new Set(['postinstall', 'postpack', 'postuninstall', 'preinstall', 'prepack', 'prepare', 'prepublish', 'prepublishOnly', 'preuninstall'])

/**
 * Tell if the project has custom pre or post scripts, like preversion, that pnpm only runs with enable-pre-post-scripts
 * @param context the project context
 * @param context.pkg the package.json
 * @returns true when it has one
 */
function hasPrePostScripts({ pkg }: Readonly<Context>) {
  return Object.keys(pkg?.scripts ?? {}).some(name => /^(?:pre|post)\w/u.test(name) && !lifecycleScripts.has(name))
}

export const nodeVersionRules = [
  requireFile({ content: ({ flags }) => `${flags.nodeVersion ?? fallbackNodeVersion}\n`, files: ['.nvmrc'], id: 'nvmrc-exists', message: 'no {{file}} file to pin the Node version', severity: 'error' }),
  requireInFile({ files: ['.nvmrc'], id: 'nvmrc-recent-node', message: '{{file}} does not pin a recent LTS Node version, like 24.11.0', pattern: /\b24\.\d+\.\d+/u, severity: 'warning' }),
]

export const npmrcRules = [
  requireFile({ content: 'enable-pre-post-scripts=true\n', files: ['.npmrc'], id: 'npmrc-exists', message: 'no {{file}} file', severity: 'warning' }),
  requireInFile({
    files: ['.npmrc'],
    fix: text => `${text.trimEnd()}\nenable-pre-post-scripts=true\n`,
    id: 'npmrc-pre-post-scripts',
    message: '{{file}} does not enable the pre and post scripts, like enable-pre-post-scripts=true',
    pattern: /enable-pre-post-scripts=true/u,
    severity: 'warning',
    when: hasPrePostScripts,
  }),
]
