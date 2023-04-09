# Repo Checker

[![npm version](https://img.shields.io/npm/v/repo-check.svg?color=informational)](https://www.npmjs.com/package/repo-check)
[![npm monthly downloads](https://img.shields.io/npm/dm/repo-check.svg?color=informational)](https://www.npmjs.com/package/repo-check)
[![Project license](https://img.shields.io/github/license/Shuunen/repo-checker.svg?color=informational)](https://github.com/Shuunen/repo-checker/blob/master/LICENSE)

[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/Shuunen/repo-checker.svg)](https://lgtm.com/projects/g/Shuunen/repo-checker/)
[![Package Quality](https://npm.packagequality.com/shield/repo-check.svg)](https://packagequality.com/#?package=repo-check)
[![Publish size](https://img.shields.io/bundlephobia/min/repo-check?label=publish%20size)](https://bundlephobia.com/package/repo-check)
[![Install size](https://badgen.net/packagephobia/install/repo-check)](https://packagephobia.com/result?p=repo-check)

> Maintain order in repositories chaos

- [Repo Checker](#repo-checker)
  - [Usage](#usage)
  - [Parameters](#parameters)
    - [target](#target)
    - [fix](#fix)
    - [init](#init)
    - [quiet](#quiet)
  - [Todo](#todo)
  - [Benchmarks](#benchmarks)
    - [Old method](#old-method)
  - [Thanks](#thanks)

## Usage

Choose your favorite method :

1. Via npx : `npx repo-check`
2. Via npm locally : `npm install repo-check` then run `npx repo-check` or use it in your `package.json` scripts
3. Via local installation : clone this repository, cd into the folder and use `pnpm start`, `pnpm start -- --target=../my-other-project` for single run or `pnpm dev`, `pnpm dev -- --target=../my-other-project`

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
- [ ] check vitest config file

## Benchmarks

Each bench result is from `hyperfine --runs 20 --warmup 3 'COMMAND_TO_BENCH'`.

| command alias      | date       | main lib targeted   | delay   | comment                                                               |
| ------------------ | ---------- | ------------------- | ------- | --------------------------------------------------------------------- |
| npx-tsc-no-emit    | 2023-04-09 | npx + typescript    | 2,4 s   | wow thanks NPX for **doubling** the amount of time for... nothing     |
| tsc-no-emit        | 2023-04-09 | typescript          | 1,2 s   | typescript v5                                                         |
| vitest-c8          | 2023-04-09 | npx & vitest & c8   | 3,6 s   | ok now coverage is only 300ms                                         |
| vitest             | 2023-04-09 | npx & vitest        | 3,3 s   | slower but there is npx + a lot of new test cases & snapshots         |
| ts-run             | 2023-04-09 | typescript-run      | 250 ms  | 40% faster ? nice ^^ no idea why                                      |
| esbuild            | 2023-04-09 | esbuild             | 81 ms   | 20% faster ? nice ^^ no idea why                                      |
| repo-check         | 2023-04-09 | node & repo-checker | 115 ms  |                                                                       |
| eslint             | 2023-04-09 | eslint              | 10 sec  | slower... :'( hardcore 35 maybe ?                                     |
| eslint             | 2023-01-29 | eslint              | 7,6 sec | + no overrides                                                        |
| eslint             | 2023-01-29 | eslint              | 7,5 sec | + test/**/* glob converted into *.test.ts                             |
| eslint             | 2023-01-29 | eslint              | 8,0 sec | + all import rules disabled                                           |
| eslint             | 2023-01-29 | eslint              | 8,8 sec | + overrides                                                           |
| eslint             | 2023-01-29 | eslint              | 9,0 sec | new cpu + hardcore 26 :'( no overrides                                |
| eslint             | 2023-01-25 | eslint              | 3,8 sec | 1 sec faster, maybe because of my new cpu                             |
| repo-check         | 2022-11-13 | node & repo-checker | 101 ms  | +2% slower when using fs/promises over fs (keeping createWriteStream) |
| repo-check         | 2022-11-13 | node & repo-checker | 135 ms  | +30% slower when using async writeFile instead of createWriteStream   |
| tsc-no-emit        | 2022-11-07 | typescript          | 950 ms  | with restricted node types & ES2020 lib                               |
| tsc-no-emit        | 2022-11-07 | typescript          | 1,1 sec | with restricted node types & all lib                                  |
| eslint             | 2022-11-07 | eslint              | 4,8 sec | with restricted node types & ES2020 lib                               |
| uvu                | 2022-11-05 | uvu                 | 1 sec   | I mean, I'm adding tests over time so...                              |
| c8-uvu             | 2022-11-05 | c8 & uvu            | 1,6 sec | 600 ms too for coverage, pretty good                                  |
| eslint             | 2022-11-05 | eslint              | 5,6 sec |                                                                       |
| esbuild            | 2022-11-05 | esbuild             | 100 ms  |                                                                       |
| tsc-no-emit        | 2022-11-05 | typescript          | 1,3 sec | way better :) no idea why                                             |
| repo-check         | 2022-11-05 | node & repo-checker | 90 ms   | way better :) no idea why                                             |
| repo-check         | 2022-03-12 | node & repo-checker | 160 ms  | pretty cool before any optimisations                                  |
| repo-check-no-out  | 2022-03-12 | node & repo-checker | 140 ms  | 20 ms dedicated to console/file output                                |
| esbuild            | 2022-03-12 | esbuild             | 170 ms  |                                                                       |
| ts-run             | 2022-03-12 | typescript-run      | 420 ms  | it's faster to build & run ^^'                                        |
| tsc-no-emit        | 2022-03-12 | typescript          | 3,5 sec |                                                                       |
| eslint             | 2022-03-12 | eslint              | 6,5 sec | damn slow, seems slower than old benches                              |
| eslint-ts-src-only | 2022-03-12 | eslint              | 5,5 sec | 1 sec diff, still slow IMHO                                           |
| uvu                | 2022-03-12 | uvu                 | 820 ms  | pretty good                                                           |
| c8-uvu             | 2022-03-12 | c8 & uvu            | 1,6 sec | 800 ms too for coverage, still good                                   |

Command aliases :

- repo-check : `node dist/repo-check.min.cjs`
- repo-check-no-out : `node dist/repo-check.min.cjs --quiet --no-report`
- esbuild : `node node_modules/esbuild/bin/esbuild src/index.ts --bundle --platform=node --minify --outfile=dist/repo-check.min.cjs`
- ts-run : `node node_modules/typescript-run/src/index.js src`
- tsc-no-emit : `node node_modules/typescript/bin/tsc --noEmit`
- npx-tsc-no-emit : `npx tsc --noEmit`
- eslint : `node node_modules/eslint/bin/eslint --fix --ignore-path .gitignore --ext .js,.ts .`
- eslint-ts-src-only : `node node_modules/eslint/bin/eslint src/ --ext .ts`
- uvu : `node node_modules/uvu/bin -r tsm tests`
- c8-uvu : `node node_modules/c8/bin/c8 node_modules/uvu/bin -r tsm tests`
- vitest : `npx vitest --run`
- vitest-c8 : `npx vitest --run --coverage`

### Old method

Each task is run 3 times via `time npm run <task>` to get the average execution time in seconds.

| task       | lib          | seconds    | comment                                            |
| ---------- | ------------ | ---------- | -------------------------------------------------- |
| build      | tsup         | 1          | 0 config, 1 dep only, super fast                   |
| build      | rollup       | 2,7        | lots of deps (plugins) & config to do the same job |
| build      | esbuild      | 0,2        | amazing 👍                                          |
| check      | repo-checker | 3,2 (2019) | can surely be reduced ^^                           |
| check      | repo-checker | 0,8 (2021) |                                                    |
| lint       | xo           | 2,7        |                                                    |
| lint       | eslint       | 3,5        |                                                    |
| test       | ava          | 9          |                                                    |
| test       | mocha        | 7,4        | a bit faster, same amount of setup                 |
| test       | uvu          | 1,2        | amazing 👍                                          |
| test + cov | ava + c8     | 16         | 7 seconds for c8 coverage ? wtf                    |
| test + cov | mocha + c8   | 12         | 7 seconds for c8 coverage ? wtf                    |
| test + cov | mocha + nyc  | 9,6        | 2 seconds for coverage seems more reasonable       |
| test + cov | uvu + c8     | 1,6        | amazing 👍                                          |

## Thanks

- [Arg](https://github.com/vercel/arg) : un-opinionated, no-frills CLI argument parser
- [C8](https://github.com/bcoe/c8) : simple & effective cli for code coverage
- [Dependency-cruiser](https://github.com/sverweij/dependency-cruiser) : handy tool to validate and visualize dependencies
- [Esbuild](https://github.com/evanw/esbuild) : an extremely fast JavaScript bundler and minifier
- [Eslint](https://eslint.org) : super tool to find & fix problems
- [Github](https://github.com) : for all their great work year after year, pushing OSS forward
- [Repo-checker](https://github.com/Shuunen/repo-checker) : eslint cover /src code and this tool the rest ^^
- [Shields.io](https://shields.io) : for the nice badges on top of this readme
- [Shuutils](https://github.com/Shuunen/shuutils) : collection of pure JS utils
- [Vitest](https://github.com/vitest-dev/vitest) : super fast vite-native testing framework
