// oxlint-disable max-lines-per-function
import { parseJson } from 'shuutils'
import { FileBase } from '../file.ts'
import { log } from '../logger.ts'
import { objectToJson } from '../utils.ts'

interface BiomeJsonFile {
  $schema?: string // ideally "./node_modules/@biomejs/biome/configuration_schema.json"
  formatter?: {
    indentStyle?: string // "space" ideally
    indentWidth?: number // 2 ideally
    lineEnding?: string // "lf" ideally
    lineWidth?: number // 300 ideally
  }
  javascript?: {
    formatter?: {
      arrowParentheses?: string // "asNeeded" ideally
      bracketSpacing?: boolean // true ideally
      quoteStyle?: string // "single" ideally
      semicolons?: string // "asNeeded" ideally
    }
  }
  json?: {
    parser?: {
      allowComments?: boolean // false ideally
      allowTrailingCommas?: boolean // false ideally
    }
  }
  linter?: {
    enabled?: boolean // true ideally
    rules?: {
      all?: boolean // true ideally but optional
      recommended?: boolean // true ideally, enforced if "all" is undefined
      style?: {
        useBlockStatements?: string // "off" ideally
      }
    }
  }
  organizeImports?: {
    enabled?: boolean // true ideally
  }
  overrides?: {
    include?: string[] // ideally ["*.test.ts"]
    linter?: {
      rules?: {
        style?: {
          noUnusedTemplateLiteral?: string // "off" ideally
        }
      }
    }
  }[]
  vcs?: {
    enabled?: boolean // true ideally
    clientKind?: string // "git" ideally
    useIgnoreFile?: boolean // true ideally, to ignore files listed in .gitignore
  }
}

const schema = './node_modules/@biomejs/biome/configuration_schema.json'
const indentWidth = 2
const minLineWidth = 80

export class BiomeFile extends FileBase {
  private fileContentObject: BiomeJsonFile | undefined

  // Helper to check and fix a property
  private checkProp<T, K extends keyof T>(opts: { expected: T[K]; key: K; message: string; obj: T | undefined }) {
    const { expected, key, message, obj } = opts
    const has = this.test(obj?.[key] === expected, message, true, true)
    if (!has && this.canFix && obj) (obj as T)[key] = expected
    return has
  }

  // oxlint-disable-next-line max-lines-per-function
  public async start() {
    if (!this.data.isUsingBiome) {
      log.debug('biome.json file not used, skipping checks')
      return
    }
    const hasFile = await this.checkFileExists('biome.json')
    if (!hasFile) return
    await this.inspectFile('biome.json')
    const data = parseJson<BiomeJsonFile>(this.fileContent)
    if (data.error) {
      log.error('cannot check empty or invalid tsconfig.json file')
      return
    }
    this.fileContentObject = data.value
    this.checkRootKeys()
    if (this.canFix) this.fileContent = objectToJson(this.fileContentObject)
  }

  private checkRootKeys() {
    this.checkProp({ expected: schema, key: '$schema', message: 'use the correct $schema', obj: this.fileContentObject })
    const rootKeys = ['formatter', 'javascript', 'json', 'linter', 'organizeImports', 'vcs'] as const
    // create any missing root sections if canFix is true
    // oxlint-disable-next-line max-depth
    if (this.fileContentObject && this.canFix) for (const key of rootKeys) if (this.fileContentObject[key] === undefined) (this.fileContentObject as unknown as Record<string, unknown>)[key] = {}
    if (this.fileContentObject && this.canFix && this.fileContentObject.overrides === undefined) this.fileContentObject.overrides = []
    this.checkSection('formatter', this.checkFormatterSection)
    this.checkSection('javascript', this.checkJavaScriptSection)
    this.checkSection('json', this.checkJsonSection)
    this.checkSection('linter', this.checkLinterSection)
    this.checkSection('organizeImports', this.checkOrganizeImportsSection)
    this.checkSection('vcs', this.checkVcsSection)
    const hasOverrides = this.test(Array.isArray(this.fileContentObject?.overrides), 'has an overrides section (array)', true, true)
    if (hasOverrides) this.checkOverridesSection()
  }

  private checkSection<K extends keyof BiomeJsonFile>(key: K, checkFn: () => void) {
    const hasSection = this.test(this.fileContentObject?.[key] !== undefined, `has a "${key}" section`, true, true)
    if (hasSection) checkFn.call(this)
  }

  private checkJavaScriptSection() {
    const section = this.fileContentObject?.javascript
    if (!section) throw new Error('JavaScript section is undefined, this should not happen')
    section.formatter = section.formatter ?? {}
    const formatter = section.formatter
    this.checkProp({ expected: 'asNeeded', key: 'arrowParentheses', message: 'could use "asNeeded" in "javascript.formatter.arrowParentheses"', obj: formatter })
    this.checkProp({ expected: true, key: 'bracketSpacing', message: 'could use true in "javascript.formatter.bracketSpacing"', obj: formatter })
    this.checkProp({ expected: 'single', key: 'quoteStyle', message: 'could use "single" in "javascript.formatter.quoteStyle"', obj: formatter })
    this.checkProp({ expected: 'asNeeded', key: 'semicolons', message: 'could use "asNeeded" in "javascript.formatter.semicolons"', obj: formatter })
  }

  private checkJsonSection() {
    const section = this.fileContentObject?.json
    if (!section) throw new Error('JSON section is undefined, this should not happen')
    section.parser = section.parser ?? {}
    const parser = section.parser
    this.checkProp({ expected: false, key: 'allowComments', message: 'could use false in "json.parser.allowComments"', obj: parser })
    this.checkProp({ expected: false, key: 'allowTrailingCommas', message: 'could use false in "json.parser.allowTrailingCommas"', obj: parser })
  }

  private checkLinterSection() {
    const section = this.fileContentObject?.linter
    if (!section) throw new Error('Linter section is undefined, this should not happen')
    this.checkProp({ expected: true, key: 'enabled', message: 'could use true in "linter.enabled"', obj: section })
    section.rules = section.rules ?? {}
    const rules = section.rules
    const hasRecommended = rules.recommended === true
    const hasAll = rules.all === true
    const hasAllOrRecommended = this.test(hasAll || hasRecommended, 'could use "all" (preferred but more strict) or "recommended" in "linter.rules"', true, true)
    if (!hasAllOrRecommended && this.canFix) rules.recommended = true
    rules.style = rules.style ?? {}
    this.checkProp({ expected: 'off', key: 'useBlockStatements', message: 'could use "off" in "linter.rules.style.useBlockStatements"', obj: rules.style })
  }

  private checkOrganizeImportsSection() {
    const section = this.fileContentObject?.organizeImports
    if (!section) throw new Error('organizeImports section is undefined, this should not happen')
    this.checkProp({ expected: true, key: 'enabled', message: 'could use true in "organizeImports.enabled"', obj: section })
  }

  private checkVcsSection() {
    const section = this.fileContentObject?.vcs
    if (!section) throw new Error('vcs section is undefined, this should not happen')
    this.checkProp({ expected: true, key: 'enabled', message: 'could use true in "vcs.enabled"', obj: section })
    this.checkProp({ expected: 'git', key: 'clientKind', message: 'could use "git" in "vcs.clientKind"', obj: section })
    this.checkProp({ expected: true, key: 'useIgnoreFile', message: 'could use true in "vcs.useIgnoreFile"', obj: section })
  }

  private checkFormatterSection() {
    const section = this.fileContentObject?.formatter
    if (!section) throw new Error('Formatter section is undefined, this should not happen')
    this.checkProp({ expected: 'space', key: 'indentStyle', message: 'could uses "space" in "formatter.indentStyle"', obj: section })
    this.checkProp({ expected: indentWidth, key: 'indentWidth', message: 'could uses "2" in "formatter.indentWidth"', obj: section })
    this.checkProp({ expected: 'lf', key: 'lineEnding', message: 'could uses "lf" in "formatter.lineEnding"', obj: section })
    const hasLineWidth = this.test((section.lineWidth ?? 0) > minLineWidth, `could uses more than ${minLineWidth} in "formatter.lineWidth"`, true, true)
    if (!hasLineWidth && this.canFix) section.lineWidth = minLineWidth
  }

  private checkOverridesSection() {
    if (!this.fileContentObject) throw new Error('overrides section is undefined, this should not happen')
    /* c8 ignore next */
    this.fileContentObject.overrides = this.fileContentObject.overrides ?? []
    const overrides = this.fileContentObject.overrides
    // oxlint-disable-next-line max-nested-callbacks
    const hasTestOverride = overrides.some(o => o.include?.includes('*.test.ts'))
    this.test(hasTestOverride, 'has a test override', true, true)
    if (!hasTestOverride && this.canFix)
      overrides.push({
        include: ['*.test.ts'],
        linter: {
          rules: {
            style: {
              noUnusedTemplateLiteral: 'off',
            },
          },
        },
      })
  }
}
