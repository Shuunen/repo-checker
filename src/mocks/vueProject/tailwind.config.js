import { readFileSync } from 'node:fs'

// eslint-disable-next-line no-undef, no-console
if (process.env.NODE_ENV === 'hey') process.env.hey = readFileSync('hey.log', 'utf8')

// eslint-disable-next-line no-commonjs, no-undef
module.exports = {
  content: ['public/*.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  safelist: [
    {
      pattern: /(?:bg|from|text|to)-\w+-(?:700|900)/u,
    },
  ],
  theme: {
    extend: {},
  },
}
