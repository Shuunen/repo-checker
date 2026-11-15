import { parse } from 'jsonc-parser'
import { defineRule } from '../../engine/define-rule.ts'
import { requireJsonSchema } from '../../engine/file-rules.ts'

/** The file */
const file = '.repo-checker.json'

/** The keys of schema.json, a test keeps this list in sync */
export const knownKeys = [
  '$schema',
  'canAutoMergeDeps',
  'isCli',
  'isModule',
  'isPublishedPackage',
  'isUsingBun',
  'isUsingDependencyCruiser',
  'isUsingEslint',
  'isUsingShuutils',
  'isUsingTypescript',
  'isWebPublished',
  'license',
  'maxBuildSizeKo',
  'maxSizeKo',
  'shouldAvoidSass',
  'themeColor',
  'webUrl',
]

/** Old names of the keys, now the key of the value, or nothing for the ones the git config replaced */
const legacyKeys: Readonly<Record<string, string | undefined>> = { userMail: undefined, userName: undefined, user_mail: undefined, user_name: undefined, web_url: 'webUrl' }

export const repoCheckerConfigSchema = requireJsonSchema({ files: [file], id: 'repo-checker-config-schema', schema: './node_modules/repo-check/schema.json', severity: 'info', when: ({ pkg }) => pkg?.name !== 'repo-check' })

export const repoCheckerConfigKnownKeys = defineRule({
  async appliesTo({ files }) {
    return (await files.readText(file)) !== undefined
  },
  async check({ files, report }) {
    const config = (parse(String(await files.readText(file))) ?? {}) as Record<string, unknown>
    for (const key of Object.keys(config).filter(name => !knownKeys.includes(name))) {
      const renamed = legacyKeys[key]
      const isLegacy = key in legacyKeys
      if (!isLegacy) report({ data: { key }, messageId: 'unknown' })
      else if (renamed === undefined) report({ data: { key }, fix: fixer => fixer.json(file).remove([key]), messageId: 'legacy' })
      else report({ data: { key, renamed }, fix: fixer => [fixer.json(file).update([renamed], current => current ?? config[key]), fixer.json(file).remove([key])], messageId: 'renamed' })
    }
  },
  meta: {
    fixable: true,
    id: 'repo-checker-config-known-keys',
    messages: {
      legacy: '.repo-checker.json has a "{{key}}" key that is not read any more, the git config gives the user',
      renamed: '.repo-checker.json has a "{{key}}" key, it is now "{{renamed}}"',
      unknown: '.repo-checker.json has a "{{key}}" key that repo-check does not know, see schema.json',
    },
    severity: 'warning',
  },
})
