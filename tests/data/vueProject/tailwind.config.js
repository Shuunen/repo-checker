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
