import { isPlainObject } from 'es-toolkit'
import { parse } from 'jsonc-parser'
import { workbenchColors } from '../../engine/color.ts'
import { defineRule } from '../../engine/define-rule.ts'

/** The settings file of the editor */
const settingsFile = '.vscode/settings.json'

/** The setting that colors the editor, so each project window is easy to tell from the others */
const colorKey = 'workbench.colorCustomizations'

/** The json indent of a new settings file */
const jsonIndent = 2

export const vscodeColors = defineRule({
  appliesTo: ({ flags, pkg }) => pkg !== undefined && flags.themeColor !== undefined,
  async check({ files, flags, report }) {
    const text = await files.readText(settingsFile)
    const current = (parse(text ?? '') as Record<string, unknown> | undefined)?.[colorKey]
    const colors = workbenchColors(String(flags.themeColor))
    const wrong = Object.entries(colors).filter(([key, color]) => (isPlainObject(current) ? current[key] : undefined) !== color)
    if (wrong.length === 0) return
    const isNewFile = (text ?? '').trim() === ''
    report({
      data: { color: String(flags.themeColor), file: settingsFile },
      fix: fixer => (isNewFile ? fixer.text(settingsFile, () => `${JSON.stringify({ [colorKey]: colors }, undefined, jsonIndent)}\n`) : wrong.map(([key, color]) => fixer.json(settingsFile).set([colorKey, key], color))),
      messageId: 'different',
    })
  },
  meta: { fixable: true, id: 'vscode-colors', messages: { different: '{{file}} "workbench.colorCustomizations" does not follow the themeColor {{color}}: title bar, a darker activity bar and a readable title text' }, severity: 'info' },
})
