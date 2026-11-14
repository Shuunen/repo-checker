import { invariant } from 'es-toolkit'
import { defineRule } from '../../engine/define-rule.ts'
import { requireFile } from '../../engine/file-rules.ts'
import type { FileReader } from '../../engine/io.ts'

/** The names of the changelog, the first one that exists is read */
const changelogFiles = ['CHANGELOG.md', 'changelog.md'] as const

/** A version heading of a changelog, like `## [1.2.0] - 2026-01-01` or `## 1.2.0`, `## [Unreleased]` does not match */
const versionHeading = /^##\s+\[?v?(?<version>\d+\.\d+\.\d+[^\]\s]*)\]?/mu

/**
 * Read the first changelog that exists
 * @param files the reader of the project files
 * @returns the text, undefined when the project has no changelog
 */
async function readChangelog(files: Readonly<FileReader>) {
  const [upper, lower] = await Promise.all(changelogFiles.map(file => files.readText(file)))
  return upper ?? lower
}

export const changelogExists = requireFile({ files: changelogFiles, id: 'changelog-exists', message: 'no {{file}} file, keep a list of the changes by version', severity: 'warning', when: ({ pkg }) => pkg !== undefined })

export const changelogLatestVersion = defineRule({
  async appliesTo({ files, pkg }) {
    const text = await readChangelog(files)
    return pkg?.version !== undefined && text !== undefined && versionHeading.test(text)
  },
  async check({ files, pkg, report }) {
    const text = await readChangelog(files)
    invariant(text !== undefined && pkg?.version !== undefined, 'appliesTo guarantees a changelog and a version')
    const top = versionHeading.exec(text)?.groups?.version
    if (top !== pkg.version) report({ data: { top: String(top), version: pkg.version }, messageId: 'wrong' })
  },
  meta: { id: 'changelog-latest-version', messages: { wrong: 'the top entry of the changelog is {{top}} but package.json version is {{version}}, add the entry of the version you release' }, severity: 'warning' },
})
