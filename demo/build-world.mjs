import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Build the demo world: a folder `projects` of real git clones (bare origins in `origins`) that look like a developer's folder, with every kind of project the dashboard knows. Their origin is set to a fake GitHub address, so the scan must run with `--no-fetch` and the fake `gh` of this folder.
 * @param {string} root the folder to build in, emptied first
 * @returns {string} the folder of projects
 */
export function buildWorld(root) {
  rmSync(root, { force: true, recursive: true })
  mkdirSync(path.join(root, 'projects'), { recursive: true })
  mkdirSync(path.join(root, 'origins'), { recursive: true })

  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Demo', '-c', 'user.email=demo@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd, stdio: 'pipe' })
  const write = (folder, file, text) => writeFileSync(path.join(folder, file), text)

  /** Create a bare origin and a clone with a few files pushed to master */
  function makeProject(name) {
    const bare = path.join(root, 'origins', `${name}.git`)
    mkdirSync(bare)
    git(bare, 'init', '--quiet', '--bare', '--initial-branch=master')
    const folder = path.join(root, 'projects', name)
    git(root, 'clone', '--quiet', bare, folder)
    write(folder, 'package.json', JSON.stringify({ description: `${name}, a demo project`, license: 'MIT', name, scripts: { test: 'vitest' }, type: 'module', version: '1.2.0' }, undefined, 2) + '\n')
    write(folder, 'README.md', `# ${name}\n\nA demo project.\n`)
    write(folder, 'LICENSE', 'MIT License\n')
    write(folder, '.gitignore', 'node_modules\n.env\n')
    git(folder, 'add', '.')
    git(folder, 'commit', '--quiet', '-m', 'init')
    git(folder, 'push', '--quiet', 'origin', 'master')
    git(folder, 'branch', '--set-upstream-to=origin/master', 'master')
    return { bare, folder }
  }

  /** Add commits to the origin from another clone, then fetch them in the project without merging */
  function makeBehind({ bare, folder }, count) {
    const other = `${folder}-other`
    git(root, 'clone', '--quiet', bare, other)
    for (let index = 0; index < count; index += 1) git(other, 'commit', '--quiet', '--allow-empty', '-m', `upstream change ${index + 1}`)
    git(other, 'push', '--quiet', 'origin', 'master')
    rmSync(other, { force: true, recursive: true })
    git(folder, 'fetch', '--quiet', 'origin')
  }

  makeProject('acme-api')
  const blog = makeProject('blog')
  makeBehind(blog, 3)
  write(blog.folder, 'README.md', '# blog\n\nA draft.\n')
  git(blog.folder, 'stash', 'push', '--quiet', '-m', 'half-written post')
  const dotfiles = makeProject('dotfiles')
  write(dotfiles.folder, 'notes.txt', 'todo\n')
  write(dotfiles.folder, 'README.md', '# dotfiles\n\nedited\n')
  const cli = makeProject('cli-tool')
  git(cli.folder, 'checkout', '--quiet', '-b', 'feat/redesign')
  const experiment = makeProject('old-experiment')
  git(experiment.folder, 'commit', '--quiet', '--allow-empty', '-m', 'last idea, never pushed')
  makeProject('old-site')
  mkdirSync(path.join(root, 'projects', 'notes'))
  write(path.join(root, 'projects', 'notes'), 'ideas.txt', 'a plain folder, not a git repo\n')
  for (const name of ['acme-api', 'blog', 'dotfiles', 'cli-tool', 'old-experiment', 'old-site']) git(path.join(root, 'projects', name), 'remote', 'set-url', 'origin', `git@github.com:demo/${name}.git`)
  return path.join(root, 'projects')
}

if (process.argv[1] === import.meta.filename) console.log(`built ${buildWorld(process.argv[2] ?? 'demo-world')}`)
