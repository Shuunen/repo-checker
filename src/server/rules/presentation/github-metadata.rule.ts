import { requireRepoField } from './github-metadata.utils.ts'

export const missingLicense = requireRepoField({ id: 'missing-license', isMissing: repo => !repo.hasLicense, message: 'the repo has no license on GitHub', severity: 'warning' })
export const missingDescription = requireRepoField({ actions: ['sync-github-metadata'], id: 'missing-description', isMissing: repo => repo.description === undefined, message: 'the repo has no description on GitHub', severity: 'warning' })
export const missingTopics = requireRepoField({ id: 'missing-topics', isMissing: repo => repo.topics.length === 0, message: 'the repo has no topics on GitHub', severity: 'info' })
export const missingHomepage = requireRepoField({ actions: ['sync-github-metadata'], id: 'missing-homepage', isMissing: repo => repo.homepage === undefined, message: 'the repo has no homepage on GitHub', severity: 'info' })
