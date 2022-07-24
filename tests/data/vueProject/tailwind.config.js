module.exports = {
  content: ['public/*.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  safelist: [
    {
      pattern: /(bg|from|to|text)-\w+-(700|900)/,
    },
  ],
  theme: {
    extend: {},
  },
}
