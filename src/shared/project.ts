/**
 * The inventory types shared by the server and the web app: what a scan knows about each local clone, each GitHub repo, and the project that matches them.
 * @module
 */

/** One local branch and how it compares with its upstream */
export interface BranchState {
  /** Commits on the branch that are not on its upstream */
  ahead: number
  /** Commits on the upstream that are not on the branch */
  behind: number
  /** True when the upstream was deleted on the remote */
  isGone: boolean
  /** True when the branch is merged into the default branch of the remote (`origin/HEAD`), undefined when it was not read */
  isMerged?: boolean
  /** When the last commit of the branch was made, ISO 8601, undefined when it was not read */
  lastCommitAt?: string
  /** The branch name, like `master` */
  name: string
  /** The upstream, like `origin/master`, undefined when the branch has none */
  upstream: string | undefined
}

/** One branch of the remote, as the last fetch saw it */
export interface RemoteBranch {
  /** True when the branch is merged into the default branch of the remote (`origin/HEAD`) */
  isMerged: boolean
  /** When the last commit of the branch was made, ISO 8601 */
  lastCommitAt: string
  /** The branch name without the remote, like `feature/login` */
  name: string
}

/** The most recent tag of a clone */
export interface LastTag {
  /** When the tag was made, ISO 8601 */
  at: string
  /** How many commits the checked out branch holds since the tag */
  commitsSince: number
  /** The tag name, like `v1.2.0` */
  name: string
}

/** Commits of one branch that are not on its upstream */
interface UnpushedCommits {
  /** The branch name */
  branch: string
  /** The subjects of the commits, newest first */
  subjects: string[]
}

/** Why a local folder cannot be compared with GitHub */
type CloneProblem = 'no-git' | 'no-origin'

/** What a scan knows about one local folder */
export interface LocalClone {
  /** Every local branch and its upstream state */
  branches: BranchState[]
  /** Uncommitted and untracked files, as `git status --porcelain` lines like `?? notes.txt` */
  changedFiles: string[]
  /** The checked out branch, empty when the HEAD is detached */
  currentBranch: string
  /** True when `git fetch` failed, so nothing about the remote can be trusted */
  fetchFailed: boolean
  /** The folder name */
  folderName: string
  /** The most recent tag, undefined when the clone has none or when it was not read */
  lastTag?: LastTag | undefined
  /** Local branches that have no upstream, or whose upstream was deleted */
  localOnlyBranches: string[]
  /** The `origin` url, undefined when there is none */
  origin: string | undefined
  /** The absolute path of the folder */
  path: string
  /** Why the folder cannot be compared, undefined for a usable clone */
  problem: CloneProblem | undefined
  /** The branches of the remote as the last fetch saw them, the default branch included, undefined when they were not read */
  remoteBranches?: RemoteBranch[]
  /** `owner/name` of the GitHub repo the origin points to, lowercase, undefined when it is not a GitHub url */
  slug: string | undefined
  /** The stash entries, newest first */
  stashes: string[]
  /** The unpushed commits, per branch */
  unpushed: UnpushedCommits[]
}

/** One branch of a fork, compared with the default branch of the parent */
interface ForkBranch {
  /** Commits on the branch that are not in the parent's default branch */
  aheadBy: number
  /** The branch name */
  name: string
}

/** What a scan knows about a fork compared with its parent, the proof needed before ever offering to delete it */
export interface ForkStatus {
  /** The branches whose comparison succeeded */
  branches: ForkBranch[]
  /** Every GitHub call that failed, a fork with a failure cannot be verified and is never offered for deletion */
  failures: string[]
  /** Open pull requests from the fork to its parent */
  openPullRequests: number
  /** `owner/name` of the parent, empty when it could not be read */
  parent: string
}

/** The open pull requests of a repo, split by who opened them */
export interface PullRequestCounts {
  /** Open pull requests that Renovate opened, each one is a dependency update waiting to be merged */
  renovate: number
  /** Open pull requests of anyone else, a person or another bot */
  other: number
}

/** How the last finished workflow run of the default branch ended: `failing`, `passing`, or `none` when the repo has no workflow run */
export type CiStatus = 'failing' | 'none' | 'passing'

/** What a scan knows about one GitHub repo */
export interface GithubRepo {
  /** The CI status of the default branch, undefined when it was not read (single project mode, a dead repo, or the call failed) */
  ci?: CiStatus | undefined
  /** The default branch of the repo, like `master` */
  defaultBranch: string
  /** The description shown on GitHub, undefined when there is none */
  description: string | undefined
  /** True when the repo publishes a GitHub Pages site, undefined when it was not read */
  hasPages?: boolean
  /** True when GitHub detects a license for the repo */
  hasLicense: boolean
  /** The homepage shown on GitHub, undefined when there is none */
  homepage: string | undefined
  /** The comparison with the parent, only for forks, undefined until it is read */
  forkStatus: ForkStatus | undefined
  /** True when the repo is archived, read-only */
  isArchived: boolean
  /** True when the repo is a fork */
  isFork: boolean
  /** True when the repo is private */
  isPrivate: boolean
  /** When the account last committed to the repo, ISO 8601, bots excluded, or `never` when it never did. Undefined when it was not read (only the repos that could be archive candidates are read) */
  lastOwnCommitAt?: string | undefined
  /** The repo name */
  name: string
  /** How many issues and pull requests are open, GitHub counts both together */
  openItems: number
  /** The owner login */
  owner: string
  /** The open pull requests, undefined when they were not read (single project mode, or the search failed) */
  pullRequests: PullRequestCounts | undefined
  /** When the last push happened, ISO 8601 */
  pushedAt: string
  /** `owner/name`, lowercase, the key used to match clones */
  slug: string
  /** How many people starred the repo, undefined when it was not read */
  stars?: number
  /** The topics of the repo on GitHub */
  topics: string[]
}

/** One project: a local clone, a GitHub repo, or both when the clone's origin points to the repo */
export interface Project {
  /** The GitHub repo, undefined when there is none or when the clone belongs to another owner */
  github: GithubRepo | undefined
  /** True when the clone's origin belongs to another owner, such projects are left out of every Sync check */
  isOtherOwner: boolean
  /** The local clone, undefined when the repo is not cloned */
  local: LocalClone | undefined
  /** The repo name, or the folder name when there is no repo */
  name: string
}
