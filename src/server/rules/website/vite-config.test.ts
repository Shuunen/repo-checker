import { testRule } from '../../test/rule-tester.ts'
import { viteDefaultExportComment, vitePortScheme, viteReportCompressedSize, viteStrictPort } from './vite-config.rule.ts'

testRule(viteStrictPort, {
  invalid: [
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({\n  server: { port: 5109 },\n})\n' }, name: 'a server port', output: 'export default defineConfig({\n  server: { port: 5109, strictPort: true },\n})\n' },
    {
      errors: ['missing', 'missing'],
      files: { 'vite.config.ts': 'export default defineConfig({\n  preview: { port: 4109 },\n  server: { port: 5109 },\n})\n' },
      name: 'both ports',
      output: 'export default defineConfig({\n  preview: { port: 4109, strictPort: true },\n  server: { port: 5109, strictPort: true },\n})\n',
    },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({\n  server: { port: 5109, strictPort: false },\n})\n' }, name: 'strictPort false', output: 'export default defineConfig({\n  server: { port: 5109, strictPort: true },\n})\n' },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': 'export default defineConfig({\n  server: {\n    open: true,\n    port: 5109,\n  },\n})\n' },
      name: 'a multiline section',
      output: 'export default defineConfig({\n  server: {\n    open: true,\n    port: 5109,\n    strictPort: true,\n  },\n})\n',
    },
  ],
  valid: [
    { files: { 'vite.config.ts': 'export default defineConfig({\n  server: { port: 5109, strictPort: true },\n})\n' }, name: 'strict' },
    { files: { 'vite.config.ts': 'export default defineConfig({\n  server: { open: true },\n})\n' }, name: 'no port' },
    { files: { 'vite.config.ts': 'export default defineConfig({})\n' }, name: 'no server' },
    { name: 'no vite config' },
  ],
})

const config = (...rows: string[]) => `${rows.join('\n')}\n`

testRule(viteReportCompressedSize, {
  invalid: [
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  plugins: [],', '  server: {},', '})') },
      name: 'no build section, added in alphabetical place',
      output: config('export default defineConfig({', '  build: { reportCompressedSize: false },', '  plugins: [],', '  server: {},', '})'),
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  base: "/",', '})') },
      name: 'no build section, added at the end',
      output: config('export default defineConfig({', '  base: "/",', '  build: { reportCompressedSize: false },', '})'),
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  build: { minify: true },', '})') },
      name: 'an inline build section',
      output: config('export default defineConfig({', '  build: { minify: true, reportCompressedSize: false },', '})'),
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  build: {', '    minify: true,', '    rolldownOptions: { output: {} },', '  },', '})') },
      name: 'a multiline build section with a nested block',
      output: config('export default defineConfig({', '  build: {', '    minify: true,', '    reportCompressedSize: false,', '    rolldownOptions: { output: {} },', '  },', '})'),
    },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  build: {', '    minify: true', '  },', '})') },
      name: 'a multiline build section without trailing comma',
      output: config('export default defineConfig({', '  build: {', '    minify: true,', '    reportCompressedSize: false,', '  },', '})'),
    },
    { errors: ['missing'], files: { 'vite.config.ts': 'export default defineConfig({ build: {} })\n' }, name: 'an empty build section', output: 'export default defineConfig({ build: { reportCompressedSize: false } })\n' },
    { errors: ['missing'], files: { 'vite.config.ts': 'defineConfig({ build: { minify: true' }, name: 'an unclosed build section', output: 'defineConfig({ build: { minify: true, reportCompressedSize: false ' },
    { errors: ['missing'], files: { 'vite.config.ts': 'defineConfig({ build: {\n} })' }, name: 'a build section holding only a new line', output: 'defineConfig({ build: {\nreportCompressedSize: false,\n} })' },
    {
      errors: ['missing'],
      files: { 'vite.config.ts': config('export default defineConfig({', '  build: { reportCompressedSize: true },', '})') },
      name: 'reportCompressedSize true',
      output: config('export default defineConfig({', '  build: { reportCompressedSize: false },', '})'),
    },
  ],
  valid: [{ files: { 'vite.config.ts': config('export default defineConfig({', '  build: { reportCompressedSize: false },', '})') }, name: 'disabled' }, { files: { 'vite.config.ts': 'export default someFunction()\n' }, name: 'a config the fix cannot place' }, { name: 'no vite config' }],
})

testRule(viteDefaultExportComment, {
  invalid: [
    {
      errors: ['missing'],
      files: { 'vite.config.ts': 'import x from "x"\n\nexport default defineConfig({})\n' },
      name: 'no comment',
      output: 'import x from "x"\n\n// oxlint-disable-next-line import/no-default-export\nexport default defineConfig({})\n',
    },
  ],
  valid: [
    { files: { 'vite.config.ts': '// oxlint-disable-next-line import/no-default-export\nexport default defineConfig({})\n' }, name: 'the comment' },
    { files: { 'vite.config.ts': '// oxlint-disable-next-line no-default-export\nexport default defineConfig({})\n' }, name: 'another form of the comment' },
    { files: { 'vite.config.ts': 'const config = defineConfig({})\n' }, name: 'no default export' },
    { files: { '.oxlintrc.json': '{"overrides":[{"rules":{"no-default-export":"off"}}]}', 'vite.config.ts': 'export default defineConfig({})\n' }, name: 'the lint config allows default exports in configs' },
    { files: { '.oxlintrc.jsonc': '{"rules":{"no-default-export":"off"}}', 'vite.config.ts': 'export default defineConfig({})\n' }, name: 'the jsonc lint config allows them' },
    { name: 'no vite config' },
  ],
})

const ports = (server: number | string, preview: number | string) => ({ 'vite.config.ts': `export default defineConfig({ preview: { port: ${preview} }, server: { port: ${server} } })\n` })

testRule(vitePortScheme, {
  invalid: [
    { errors: ['scheme'], files: ports(8085, 4102), name: 'a dev port out of the scheme' },
    { errors: ['scheme'], files: ports(5102, 4999), name: 'a preview port out of the scheme' },
    { errors: ['scheme'], files: ports(5177, 4107), name: 'different project numbers' },
    { errors: ['scheme'], files: { 'vite.config.ts': 'export default defineConfig({ server: { port: 3000 } })\n' }, name: 'a dev port alone' },
  ],
  valid: [
    { files: ports(5105, 4105), name: 'the scheme' },
    { files: { 'vite.config.ts': 'export default defineConfig({ server: { port: 5105 } })\n' }, name: 'a dev port alone in the scheme' },
    { files: { 'vite.config.ts': 'export default defineConfig({})\n' }, name: 'no ports' },
    { name: 'no vite config' },
  ],
})
