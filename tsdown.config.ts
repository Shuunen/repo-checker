import { defineConfig } from 'tsdown'

// one output file per rule: the CLI finds the rules by their *.rule.js file names, a bundle would hide them
export default defineConfig({
  clean: true,
  entry: ['src/server/bin.ts', 'src/server/rules/**/*.rule.ts'],
  format: 'esm',
  fixedExtension: false,
  outDir: 'dist',
  platform: 'node',
  root: 'src',
  target: 'node24',
  unbundle: true,
})
