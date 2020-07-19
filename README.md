# Repo Checker

[![GitHub license](https://img.shields.io/github/license/shuunen/repo-checker.svg?color=informational)](https://github.com/Shuunen/repo-checker/blob/master/LICENSE)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FShuunen%2Frepo-checker.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2FShuunen%2Frepo-checker?ref=badge_shield)

[![Build Status](https://travis-ci.org/Shuunen/repo-checker.svg?branch=master)](https://travis-ci.org/Shuunen/repo-checker)
[![David](https://img.shields.io/david/shuunen/repo-checker.svg)](https://david-dm.org/shuunen/repo-checker)
[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/Shuunen/repo-checker.svg)](https://lgtm.com/projects/g/Shuunen/repo-checker/)

> Maintain order in repositories chaos

- [Repo Checker](#repo-checker)
  - [Usage](#usage)
  - [Parameters](#parameters)
    - [target](#target)
    - [fix](#fix)
    - [init](#init)
    - [data](#data)
  - [Todo](#todo)
  - [Thanks](#thanks)
  - [License](#license)

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

## Todo

- [ ] identify websites
  - [ ] check related badges
  - [ ] check static folder : should have "_headers" & "favicon.ico" and "manifest.json" files inside
- [ ] suggest docs/demo.gif
- [ ] suggest thanks related to deps
- [ ] compute build/dist/folder/public size for maxSize compliance
- [ ] warn todos in readme files

## Thanks

- [Shields.io](https://shields.io) : for the nice badges on top of this readme
- [Travis-ci.org](https://travis-ci.org) : for providing free continuous deployments

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FShuunen%2Frepo-checker.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FShuunen%2Frepo-checker?ref=badge_large)
