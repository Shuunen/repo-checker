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
    - [data](#data)
    - [quiet](#quiet)
  - [Todo](#todo)
  - [Benchmarks](#benchmarks)
  - [Thanks](#thanks)

## Usage

Choose your favorite method :

1. Via npx : `npx repo-check`
2. Via npm locally : `npm install repo-check` then run `npx repo-check` or use it in your `package.json` scripts
3. Via local installation : clone this repository, cd into the folder and use `node .`

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
If it's not enough, you'll be prompt to [init](#init) or provide [data](#data).
If you want to fix already existing files, use `--force` to overwrite it.

### init

`--init` ask repo-checker to initialize a data config file in the current user directory (`~/repo-checker.config.js`).
If file already exists, use `--force` to overwrite it.

### data

`--data=path/to/my/data` gives repo-checker data to fill templates files in this repo (`templates/**`)
If you don't give this parameter, repo-checker will try to load data from `~/repo-checker.config.js`.

### quiet

`--quiet` repo-checker will works silently without output-ing to console, will keep output to logfile.

## Todo

- [ ] if website : check static folder : should have "_headers" & "favicon.ico" and "manifest.json" files inside
- [ ] compute build/dist/folder/public size for maxSize compliance
- [ ] add nbFixes to the report
- [ ] check last tag, suggest to tag if last one is old
- [ ] get rid of eslint-disable : camelcase, no-await-in-loop
- [ ] try to defer console.log to improve repo-checker execution
- [ ] extends unit tests to src/files (remove nyc.config.js current exclusion)

## Benchmarks

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

- [Arg](https://github.com/vercel/arg) : unopinionated, no-frills CLI argument parser
- [C8](https://github.com/bcoe/c8) : simple & effective cli for code coverage
- [Esbuild](https://github.com/evanw/esbuild) : an extremely fast JavaScript bundler and minifier
- [Eslint](https://eslint.org) : super tool to find & fix problems
- [Github](https://github.com) : for all their great work year after year, pushing OSS forward
- [Npm-run-all](https://github.com/mysticatea/npm-run-all) : to keep my npm scripts clean & readable
- [Repo-checker](https://github.com/Shuunen/repo-checker) : eslint cover /src code and this tool the rest ^^
- [Shields.io](https://shields.io) : for the nice badges on top of this readme
- [Shuutils](https://github.com/Shuunen/shuutils) : collection of pure JS utils
- [UvU](https://github.com/lukeed/uvu) : extremely fast and lightweight test runner for Node.js and the browser
- [Watchlist](https://github.com/lukeed/watchlist) : recursively watch a list of directories & run a command on any file system
