/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// @ts-expect-error missing types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const shuunen = require('eslint-plugin-shuunen')

module.exports = [
  ...shuunen.configs.base,
  ...shuunen.configs.node,
  // ...shuunen.configs.browser,
  ...shuunen.configs.typescript,
  {
    rules: {
      'line-comment-position': 'off',
      'multiline-comment-style': 'off',
    },
  },
]
