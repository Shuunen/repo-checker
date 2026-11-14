import { parse } from 'jsonc-parser'
import type { Context } from '../../engine/context.ts'
import { defineRule } from '../../engine/define-rule.ts'
import { dependencyVersion } from '../../engine/package-json.ts'
import { parseSpec } from '../../engine/versions.ts'

const files = ['knip.json', 'knip.jsonc', '.knip.json', '.knip.jsonc']

/**
 * Find the knip schema that matches the installed major
 * @param spec the knip version range of the package.json
 * @returns the schema url, undefined when the version is not a plain one
 */
function schemaFor(spec: string | undefined) {
  const version = spec === undefined ? undefined : parseSpec(spec)?.version
  return version === undefined ? undefined : `https://unpkg.com/knip@${version.split('.')[0]}/schema.json`
}

/**
 * Find the knip config of the project
 * @param context the project context
 * @param context.files the project files reader
 * @returns the file and its text, undefined when there is none
 */
async function readKnipConfig({ files: reader }: Readonly<Context>) {
  const texts = await Promise.all(files.map(file => reader.readText(file)))
  const index = texts.findIndex(text => text !== undefined)
  return index === -1 ? undefined : { file: String(files[index]), text: String(texts[index]) }
}

export const knipSchema = defineRule({
  appliesTo: context => schemaFor(dependencyVersion(context.pkg, 'knip')) !== undefined,
  async check(context) {
    const found = await readKnipConfig(context)
    const schema = schemaFor(dependencyVersion(context.pkg, 'knip'))
    if (found === undefined || schema === undefined) return
    if ((parse(found.text) as { $schema?: unknown } | undefined)?.$schema === schema) return
    context.report({ data: { file: found.file, schema }, fix: fixer => fixer.json(found.file).set(['$schema'], schema, { isFirst: true }), messageId: 'wrong' })
  },
  meta: { fixable: true, id: 'knip-schema', messages: { wrong: '{{file}} should declare the "$schema": "{{schema}}", the major of the installed knip' }, severity: 'warning' },
})
