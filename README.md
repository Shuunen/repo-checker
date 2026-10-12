# Repo Checker

[![Project license](https://img.shields.io/github/license/Shuunen/repo-checker.svg?color=informational)](https://github.com/Shuunen/repo-checker/blob/master/LICENSE)
[![Code Climate maintainability](https://img.shields.io/codeclimate/maintainability/Shuunen/repo-checker?style=flat)](https://codeclimate.com/github/Shuunen/repo-checker)
[![npm version](https://img.shields.io/npm/v/repo-check.svg?color=informational)](https://www.npmjs.com/package/repo-check)
[![npm monthly downloads](https://img.shields.io/npm/dm/repo-check.svg?color=informational)](https://www.npmjs.com/package/repo-check)

[![Package Quality](https://npm.packagequality.com/shield/repo-check.svg)](https://packagequality.com/#?package=repo-check)
[![Publish size](https://img.shields.io/bundlephobia/min/repo-check?label=publish%20size)](https://bundlephobia.com/package/repo-check)
[![Install size](https://badgen.net/packagephobia/install/repo-check)](https://packagephobia.com/result?p=repo-check)

![logo](docs/banner.svg)

- [Repo Checker](#repo-checker)
  - [Demo](#demo)
  - [Usage](#usage)
  - [Parameters](#parameters)
    - [target](#target)
    - [fix](#fix)
    - [init](#init)
    - [quiet](#quiet)
  - [Todo](#todo)
  - [Thanks](#thanks)
  - [Page views](#page-views)

## Demo

![demo](docs/demo-1.42.jpg)

## Usage

Choose your favorite method :

1. Via npx : `npx repo-check`
2. Via npm locally : `pnpm install repo-check` then run `npx repo-check` or use it in your `package.json` scripts
3. Via local installation : clone this repository, cd into the folder and use `pnpm start`, `pnpm start --target=../my-other-project` for single run or `pnpm dev`, `pnpm dev --target=../my-other-project`

Pro tip : [init](#init) repo-checker before [fixing](#fix) files.

## Parameters

### target

`--target=path/to/folder` tells repo-checker which directory it should scan.
If no target is specified, repo-checker will scan current directory.
Target can be a relative or absolute path, can contain one project or more.

### fix

`--fix` kindly ask repo-checker to try to create missing files or update problematic ones.
For example, repo-checker will check for a `README.md`, if it does not exists, the file will be created and filled with data accordingly to the README.md template (`templates/README.md`).
Repo-checker will try to grab as much info as possible from the project folder to create this file.
If it's not enough, you'll be prompt to [init](#init).
If you want to fix already existing files, use `--force` to overwrite it.

### init

`--init` ask repo-checker to initialize a data config file in the current directory.
If file already exists, use `--force` to overwrite it.

### quiet

`--quiet` repo-checker will works silently without output-ing to console, will only output to log file.

## Todo

- [ ] if website : check static folder : should have "_headers" & "favicon.ico" and "manifest.json" files inside
- [ ] compute build/dist/folder/public size for maxSize compliance
- [ ] check `rel="noopener"` or `rel="noreferrer"` to any `<a` external links to improve performance and prevent security vulnerabilities
- [ ] check `width` and `height` attributes to any `<img` or `<video` to ensures that the browser can allocate the correct amount of space in the document
- [ ] add nbFixes to the report
- [ ] check last tag, suggest to tag if last one is old
- [ ] extends unit tests to src/files (remove `c8 ignore start` temporary exclusions)
- [ ] prepare a json schema for .repo-checker.json
- [ ] try to avoid using class in this project and remove `eslint-disable-next-line no-restricted-syntax`
- [ ] check if lint/performance/useTopLevelRegex worth fixing everywhere
- [ ] use [cosmic config](https://github.com/davidtheclark/cosmiconfig) which is pretty huge, or [lil config](https://github.com/antonk52/lilconfig/) instead or nothing at all ^^
- [ ] suggest lighthouse budget like [3f052df](https://github.com/Shuunen/stuff-finder/commit/3f052df076b23503d3692883319c618c2d045a99) & [1c4c2f3](https://github.com/Shuunen/stuff-finder/commit/1c4c2f365bc53ba158d7e4eeda596094cad8accb) add appropriate thanks to [lighthouse-ci-action](https://github.com/treosh/lighthouse-ci-action) & lighthouse
- [ ] enhance readme headers via snippets/banner or [socialify.git.ci](https://socialify.git.ci/Shuunen/repo-checker?font=Inter&language=1&owner=1&pattern=Circuit%20Board&stargazers=1&theme=Light) or [satori](https://github.com/vercel/satori)

## Thanks

- [Arg](https://github.com/vercel/arg) : un-opinionated, no-frills CLI argument parser
- [Boxy Svg](https://boxy-svg.com) : simple & effective svg editor
- [Bun](https://bun.sh) : super fast runtime for JavaScript and TypeScript
- [Dependency-cruiser](https://github.com/sverweij/dependency-cruiser) : handy tool to validate and visualize dependencies
- [Github](https://github.com) : for all their great work year after year, pushing OSS forward
- [Knip](https://github.com/webpro/knip) : super tool to find & fix problems
- [Oxc](https://oxc.rs) : a lovely super-fast collection of JavaScript tools written in Rust
- [Repo-checker](https://github.com/Shuunen/repo-checker) : eslint cover /src code and this tool the rest ^^
- [Shields.io](https://shields.io) : for the nice badges on top of this readme
- [Shuutils](https://github.com/Shuunen/shuutils) : collection of pure JS utils
- [Svg Omg](https://jakearchibald.github.io/svgomg) : the great king of svg file size reduction
- [Tsup](https://github.com/egoist/tsup) : super fast js/ts bundler with no config, powered by esbuild <3
- [V8](https://github.com/demurgos/v8-coverage) : simple & effective cli for code coverage
- [Vitest](https://github.com/vitest-dev/vitest) : super fast vite-native testing framework
- [Watchlist](https://github.com/lukeed/watchlist) : recursively watch a list of directories & run a command on any file system

## Page views

![Views Counter](https://views-counter.vercel.app/badge?pageId=Shuunen%2Frepo-checker&leftColor=5c5c5c&rightColor=07a62f&type=total&label=Visitors&style=none)
