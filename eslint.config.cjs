// @ts-expect-error missing types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shuunen = require('eslint-plugin-shuunen')

module.exports = [
  ...shuunen.configs.base,
  ...shuunen.configs.node,
  // ...shuunen.configs.browser,
  ...shuunen.configs.typescript,
]
