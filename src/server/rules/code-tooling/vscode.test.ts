import { workbenchColors } from '../../engine/color.ts'
import { testRule } from '../../test/rule-tester.ts'
import { vscodeColors } from './vscode.rule.ts'

const flags = { themeColor: '#024eb8' }
const colors = workbenchColors('#024eb8')
const withColors = `{\n  "workbench.colorCustomizations": ${JSON.stringify(colors)}\n}\n`
const indent = (value: unknown) => JSON.stringify(value, undefined, 2).replaceAll('\n', '\n  ')
const merged = Object.fromEntries(Object.entries({ ...colors, 'editor.background': '#000000' }).toSorted(([first], [second]) => (first < second ? -1 : 1)))
const created = `${JSON.stringify({ 'workbench.colorCustomizations': colors }, undefined, 2)}\n`

testRule(vscodeColors, {
  invalid: [
    {
      errors: ['different'],
      files: { '.vscode/settings.json': '{\n  "editor.formatOnSave": true\n}\n' },
      flags,
      name: 'a settings file without colors, the other settings are kept',
      output: `{\n  "editor.formatOnSave": true,\n  "workbench.colorCustomizations": ${indent(colors)}\n}\n`,
      pkg: {},
    },
    {
      errors: ['different'],
      files: { '.vscode/settings.json': '{\n  "workbench.colorCustomizations": {\n    "activityBar.background": "#232F3A",\n    "editor.background": "#000000",\n    "titleBar.activeBackground": "#024EB8"\n  }\n}\n' },
      flags,
      name: 'other colors, the wrong ones change, the capitals are lowercased and the others are kept',
      output: `{\n  "workbench.colorCustomizations": ${indent(merged)}\n}\n`,
      pkg: {},
    },
    {
      errors: ['different'],
      files: { '.vscode/settings.json': '{\n  "workbench.colorCustomizations": {\n    "activityBar.background": "#012c67",\n    "titleBar.activeBackground": "#024eb8",\n    "titleBar.activeForeground": "#f9fafb"\n  }\n}\n' },
      flags,
      name: 'the old format with 3 keys misses the status bar, the badges, the tab and the unfocused bars',
      output: `{\n  "workbench.colorCustomizations": ${indent(colors)}\n}\n`,
      pkg: {},
    },
    { errors: ['different'], files: { '.vscode/settings.json': withColors.replaceAll('#012c67', '#012C67') }, flags, name: 'colors written in capitals are lowercased', output: withColors, pkg: {} },
    { errors: ['different'], files: { '.vscode/settings.json': '' }, flags, name: 'an empty settings file', output: created, pkg: {} },
    { errors: ['different'], flags, name: 'no settings file, created with a final new line', output: created, pkg: {} },
  ],
  valid: [
    { files: { '.vscode/settings.json': withColors }, flags, name: 'colors that follow the theme color', pkg: {} },
    { flags, name: 'no package.json' },
    { name: 'no theme color, theme-color-missing says it', pkg: {} },
  ],
})
