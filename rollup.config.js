import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import shebang from 'rollup-plugin-add-shebang'
import analyze from 'rollup-plugin-analyzer'
import typescript from 'rollup-plugin-typescript2'
import packageJson from './package.json'

export default [
  {
    input: 'src/index.ts',
    external: [
      'buffer',
      'child_process',
      'fs',
      'module',
      'os',
      'path',
      'tty',
      'util',
    ],
    output: [
      { file: packageJson.main, format: 'cjs' },
    ],
    plugins: [
      analyze({ summaryOnly: true, limit: 10 }),
      shebang(),
      json(),
      resolve({ preferBuiltins: true }), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
      typescript(),
    ],
  },
]
