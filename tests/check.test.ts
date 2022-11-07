import { test } from 'uvu'
import { equal } from 'uvu/assert'
import { check, report } from '../src/check'
import { ProjectData, repoCheckerPath } from '../src/constants'

test('repo-checker folder fails with low max size', async function () {
  const message = await check(repoCheckerPath, new ProjectData({ maxSizeKo: 2, npmPackage: true, quiet: true })).catch(() => 'failed')
  equal(message, 'failed')
})

test('repo-checker folder succeed with acceptable max size', async function () {
  const { passed, failed } = await check(repoCheckerPath, new ProjectData({ maxSizeKo: 120, npmPackage: true, quiet: true }))
  equal(passed, [
    'has-a-gitignore-file',
    'gitignore-has-node-modules',
    'has-a-editorconfig-file',
    'editorconfig-has-space-indent',
    'editorconfig-has-indent-size-of-2',
    'editorconfig-has-unix-style-line-endings',
    'editorconfig-has-utf-8-encoding',
    'editorconfig-has-whitespace-trailing',
    'editorconfig-has-final-new-line-rule',
    'editorconfig-has-specific-markdown-trailing-rule',
    'editorconfig-has-no-specific-html-indent-rule',
    'has-no-xo-config-js-file',
    'eslintrc-json-has-eslint-recommended-rules-extend',
    'eslintrc-json-has-unicorn-rules-extend',
    'eslintrc-json-has-no-promise-plugin-require-eslint-7',
    'eslintrc-json-has-no-plugin-section-since-plugin-are-included-by-extends',
    'eslintrc-json-current-eslintrc-json-has-only-34-of-the-34-custom-rules-in-repo-checker-eslintrc-json',
    'github-workflows-ci-yml-has-a-checkout-step-in-ci-workflow',
    'github-workflows-ci-yml-has-a-node-step-in-ci-workflow',
    'github-workflows-ci-yml-a-install-step-in-ci-workflow',
    'github-workflows-ci-yml-at-least-one-test-step-in-ci-workflow',
    'has-a-license-file',
    'license-has-a-gpl-title',
    'license-has-a-version-3-subtitle',
    'has-a-nvmrc-file',
    'nvmrc-has-a-recent-lts-node-version',
    'nycrc-file-exists',
    'has-a-nycrc-json-file',
    'nycrc-json-has-a-schema-declaration',
    'has-a-package-json-file',
    'package-json-main-file-maximum-size-is-specified-in-data-file-ex-max-size-ko-100',
    'package-json-has-a-dist-repo-check-min-cjs-file',
    'package-json-main-file-specified-in-package-json-dist-repo-check-min-cjs-exists-on-disk-be-sure-to-build-before-run-repo-check',
    'package-json-main-file-size-38ko-should-be-less-or-equal-to-max-size-allowed-120ko',
    'package-json-has-a-schema-declaration',
    'package-json-has-a-bugs-property',
    'package-json-has-a-description-property',
    'package-json-has-a-files-property',
    'package-json-has-a-homepage-property',
    'package-json-has-a-keywords-property',
    'package-json-has-a-private-property',
    'package-json-has-a-repository-property',
    'package-json-has-a-author-property',
    'package-json-has-a-name-property',
    'package-json-has-a-version-property',
    'package-json-has-a-license-property',
    'package-json-has-a-gpl-3-0-license',
    'package-json-has-no-engines-section',
    'package-json-has-a-script-section',
    'package-json-has-a-pre-script-for-version-automation',
    'package-json-has-a-post-script-for-version-automation',
    'package-json-has-a-typescript-build-or-check',
    'package-json-has-a-typescript-runner',
    'package-json-has-watchlist-eager-param',
    'package-json-has-a-ci-script',
    'package-json-has-only-dev-dependencies-for-build-able-projects',
    'package-json-has-no-sass-dependency-fat-useless',
    'package-json-has-no-cross-var-dependency-old-deprecated',
    'package-json-has-no-tslint-dependency-deprecated',
    'package-json-has-no-eslint-plugin-promise-5-dependency-require-eslint-7',
    'package-json-has-no-patch-precision',
    'package-json-one-unit-testing-dependency-from-mocha-uvu',
    'package-json-one-coverage-dependency-from-nyc-c8',
    'package-json-assert-dependency-used-in-import-equal-from-uvu-assert-instead-works-also-as-deep-equal-alternative',
    'package-json-has-no-fat-color-dependency-use-shuutils-or-nanocolors',
    'package-json-has-no-fat-fs-extra-dependency-use-native-fs',
    'package-json-has-no-utopian-shuunen-stack-dependency',
    'package-json-has-no-fat-task-runner-use-npm-run-xyz-npm-run-abc-for-sequential-or-zero-deps-package-npm-parallel',
    'has-a-readme-md-file',
    'readme-md-has-a-title',
    'readme-md-has-no-link-to-deprecated-netlify-com',
    'readme-md-has-no-links-without-https-scheme',
    'readme-md-has-no-crlf-windows-carriage-return',
    'readme-md-has-no-star-flavored-list',
    'readme-md-has-a-project-license-badge',
    'readme-md-has-a-npm-monthly-downloads-badge',
    'readme-md-has-a-npm-version-badge',
    'readme-md-has-a-publish-size-badge',
    'readme-md-has-a-install-size-badge',
    'readme-md-has-a-thanks-section',
    'readme-md-has-a-thanks-to-shields-io',
    'readme-md-has-no-remaining-thanks-to-travis-ci-com',
    'readme-md-has-a-thanks-to-github',
    'readme-md-has-no-remaining-thanks-to-netlify',
    'readme-md-has-a-thanks-to-arg',
    'readme-md-has-no-remaining-thanks-to-ava',
    'readme-md-has-a-thanks-to-c8',
    'readme-md-has-no-remaining-thanks-to-chokidar',
    'readme-md-has-no-remaining-thanks-to-cypress-io',
    'readme-md-has-a-thanks-to-esbuild',
    'readme-md-has-a-thanks-to-eslint',
    'readme-md-has-no-remaining-thanks-to-mocha',
    'readme-md-has-no-remaining-thanks-to-npm-run-all',
    'readme-md-has-no-remaining-thanks-to-npm-parallel',
    'readme-md-has-no-remaining-thanks-to-nuxt',
    'readme-md-has-no-remaining-thanks-to-nyc',
    'readme-md-has-no-remaining-thanks-to-reef',
    'readme-md-has-a-thanks-to-repo-checker',
    'readme-md-has-no-remaining-thanks-to-rollup',
    'readme-md-has-no-remaining-thanks-to-servor',
    'readme-md-has-no-remaining-thanks-to-showdown',
    'readme-md-has-a-thanks-to-shuutils',
    'readme-md-has-no-remaining-thanks-to-tailwind-css',
    'readme-md-has-no-remaining-thanks-to-tsup',
    'readme-md-has-a-thanks-to-uv-u',
    'readme-md-has-no-remaining-thanks-to-vite',
    'readme-md-has-no-remaining-thanks-to-vue',
    'readme-md-has-a-thanks-to-watchlist',
    'readme-md-has-no-remaining-thanks-to-xo',
    'has-a-renovate-json-file',
    'renovate-json-has-a-schema-declaration',
    'renovate-json-has-an-extends-section',
    'renovate-json-has-a-base-config',
    'renovate-json-has-a-dashboard-setting-to-false',
    'renovate-json-has-an-auto-merge-preset',
    'renovate-json-has-a-preserve-semver-ranges-preset',
    'has-no-repo-checker-js-file',
    'has-a-repo-checker-config-js-file',
    'tsconfig-json-has-a-schema-declaration',
    'tsconfig-json-has-an-include-section',
    'tsconfig-json-has-a-allow-unreachable-code-compiler-option',
    'tsconfig-json-has-a-allow-unused-labels-compiler-option',
    'tsconfig-json-has-a-check-js-compiler-option',
    'tsconfig-json-has-a-es-module-interop-compiler-option',
    'tsconfig-json-has-a-exact-optional-property-types-compiler-option',
    'tsconfig-json-has-a-force-consistent-casing-in-file-names-compiler-option',
    'tsconfig-json-has-a-imports-not-used-as-values-compiler-option',
    'tsconfig-json-has-a-no-fallthrough-cases-in-switch-compiler-option',
    'tsconfig-json-has-a-no-implicit-any-compiler-option',
    'tsconfig-json-has-a-no-implicit-override-compiler-option',
    'tsconfig-json-has-a-no-implicit-returns-compiler-option',
    'tsconfig-json-has-a-no-property-access-from-index-signature-compiler-option',
    'tsconfig-json-has-a-no-unchecked-indexed-access-compiler-option',
    'tsconfig-json-has-a-no-unused-locals-compiler-option',
    'tsconfig-json-has-a-no-unused-parameters-compiler-option',
    'tsconfig-json-has-a-skip-lib-check-compiler-option',
    'tsconfig-json-has-a-strict-compiler-option',
    'tsconfig-json-has-a-out-dir-compiler-option',
    'tsconfig-json-has-a-module-resolution-compiler-option',
    'tsconfig-json-has-a-target-compiler-option',
  ])
  equal(failed, [], 'failed')
})

// const folder = join(__dirname, 'checkFolder')
// test('check & fix test folder', async function () {
//   const gitConfig = join(folder, '.git', 'config')
//   await ensureFile(gitConfig)
//   const data = new ProjectData({ quiet: true })
//   const status = await check(folder, data, true)
//   equal(status.failed, [])
//   console.log('clearing folder', folder)
//   // status = await check(folder, data, true, true)
//   // equal(status.failed, [])
// })

test('report does nothing by default', function () {
  report()
})

test.run()
