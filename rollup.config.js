import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import shebang from 'rollup-plugin-add-shebang'
import analyze from 'rollup-plugin-analyzer'
import pkg from './package.json'

export default [
  {
    input: 'src/index.js',
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
      { file: pkg.main, format: 'cjs' },
    ],
    plugins: [
      analyze({ summaryOnly: true, limit: 10 }),
      shebang(),
      json(),
      resolve(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
    ],
  },
]