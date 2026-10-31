import { defineConfig } from 'tsdown'

// one output file per rule: the CLI finds the rules by their *.rule.js file names, a bundle would hide them
export default defineConfig({
  clean: true,
  entry: ['src/server/bin.ts', 'src/server/rules/**/*.rule.ts'],
  fixedExtension: false,
  format: 'esm',
  outDir: 'dist',
  platform: 'node',
  root: 'src',
  target: 'node26',
  unbundle: true,
})
