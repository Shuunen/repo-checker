import { testRule } from '../../test/rule-tester.ts'
import { uniqueMarkNoBinary, uniqueMarkPlugin } from './unique-mark.rule.ts'

const pkg = { dependencies: { shuutils: '^12.0.0' }, scripts: { build: 'vite build' } }
const importLine = "import { uniqueMark } from 'shuutils/plugins'"

testRule(uniqueMarkPlugin, {
  invalid: [
    {
      errors: ['missing'],
      files: { 'vite.config.ts': "import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({\n  plugins: [react()],\n})\n" },
      name: 'a vite config with plugins',
      output: `import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\n${importLine}\n\nexport default defineConfig({\n  plugins: [react(), uniqueMark()],\n})\n`,
      pkg,
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': "import { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [] })\n" },
      name: 'a vite config with empty plugins',
      output: `import { defineConfig } from 'vite'\n${importLine}\nexport default defineConfig({ plugins: [uniqueMark()] })\n`,
      pkg,
    },
    {
      errors: ['missing'],
      files: { 'tsdown.config.ts': "import { defineConfig } from 'tsdown'\n\nexport default defineConfig({\n  clean: true,\n})\n" },
      name: 'a tsdown config without plugins',
      output: `import { defineConfig } from 'tsdown'\n${importLine}\n\nexport default defineConfig({\n  plugins: [uniqueMark()],\n  clean: true,\n})\n`,
      pkg,
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': "import preact from '@preact/preset-vite'\n\nexport default defineConfig({\n  plugins: [\n    preact(),\n    tailwindcss(),\n  ],\n})\n" },
      name: 'plugins one per line with a trailing comma',
      output: `import preact from '@preact/preset-vite'\n${importLine}\n\nexport default defineConfig({\n  plugins: [\n    preact(),\n    tailwindcss(),\n    uniqueMark(),\n  ],\n})\n`,
      pkg,
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': "import preact from '@preact/preset-vite'\n\nexport default defineConfig({\n  plugins: [\n    preact(),\n    tailwindcss()\n  ],\n})\n" },
      name: 'plugins one per line without a trailing comma',
      output: `import preact from '@preact/preset-vite'\n${importLine}\n\nexport default defineConfig({\n  plugins: [\n    preact(),\n    tailwindcss(),\n    uniqueMark()\n  ],\n})\n`,
      pkg,
    },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({ plugins: [react(), a([1])], })\n' }, name: 'nested brackets', output: `${importLine}\nexport default defineConfig({ plugins: [react(), a([1]), uniqueMark()], })\n`, pkg },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({ plugins: [react()\n' }, name: 'an unclosed plugins array, a new one is added', output: `${importLine}\nexport default defineConfig({\n  plugins: [uniqueMark()], plugins: [react()\n`, pkg },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({ plugins: [] })\n' }, name: 'a config without import', output: `${importLine}\nexport default defineConfig({ plugins: [uniqueMark()] })\n`, pkg },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default {}\n' }, name: 'a config it cannot edit, left as is', pkg },
    { errors: ['missing'], name: 'no config at all, no fix', pkg },
  ],
  valid: [
    { files: { 'vite.config.ts': "import { uniqueMark } from 'shuutils/plugins'\nexport default defineConfig({ plugins: [uniqueMark()] })" }, name: 'a vite config using uniqueMark', pkg },
    { files: { 'tsdown.config.ts': 'plugins: [uniqueMark()]' }, name: 'a tsdown config using uniqueMark', pkg },
    { name: 'shuutils without build', pkg: { dependencies: { shuutils: '^12.0.0' }, scripts: {} } },
    { name: 'a build without shuutils', pkg: { scripts: { build: 'vite build' } } },
  ],
})

const marked = { 'vite.config.ts': 'plugins: [uniqueMark()]' }

testRule(uniqueMarkNoBinary, {
  invalid: [
    { errors: ['found'], files: marked, name: 'a mark task with the plugin', pkg: { scripts: { build: 'vite build', mark: 'unique-mark dist/index.js && echo mark success' } } },
    { errors: ['found', 'found'], files: marked, name: 'two scripts', pkg: { scripts: { build: 'vite build && unique-mark dist', postbuild: 'unique-mark dist' } } },
  ],
  valid: [
    { files: marked, name: 'the plugin and no binary', pkg: { scripts: { build: 'vite build' } } },
    { name: 'the binary without the plugin', pkg: { scripts: { mark: 'unique-mark dist/index.js' } } },
  ],
})
