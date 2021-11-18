import { build } from 'esbuild'
import run from 'esbuild-plugin-run'

(async () => {
  const watch = process.argv.includes('--watch')
  const res = await build({
    bundle: true,
    entryPoints: ['./src/index.ts'],
    logLevel: 'info',
    minify: !watch,
    outfile: watch ? './dist/repo-check.cjs' : './dist/repo-check.min.cjs',
    platform: 'node',
    plugins: watch ? [run.default()] : [],
    watch,
  })
})()
