/* eslint-disable @typescript-eslint/naming-convention */
import { defineConfig } from 'tsup'

const banner = '// shuutils __unique-mark__\n'

export default defineConfig([
  {
    banner: { js: banner },
    clean: true,
    dts: true,
    entry: ['src/repo-check.ts'],
    format: ['cjs', 'esm'],
    minify: false,
    outDir: 'dist',
    platform: 'neutral',
    replaceNodeEnv: true,
    skipNodeModulesBundle: true,
    sourcemap: false,
    splitting: true,
    target: 'esnext',
    treeshake: true,
    watch: false,
  },
])
