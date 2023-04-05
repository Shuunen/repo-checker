import { clone, Nb, parseJson } from 'shuutils'
import { FileBase } from '../file'
import { log } from '../logger'

const recommendedCompilerOptions = {
  /* eslint-disable @typescript-eslint/naming-convention */
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  checkJs: true,
  esModuleInterop: true,
  exactOptionalPropertyTypes: true,
  forceConsistentCasingInFileNames: true,
  noFallthroughCasesInSwitch: true,
  noImplicitAny: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noPropertyAccessFromIndexSignature: false,
  noUncheckedIndexedAccess: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  skipLibCheck: true,
  strict: true,
  /* eslint-enable @typescript-eslint/naming-convention */
}

interface TsConfigJsonFile {
  compilerOptions?: Record<string, string[] | boolean | string | undefined> & typeof recommendedCompilerOptions
  include: string[]
  exclude: string[]
  files: string[]
}

export class TsConfigFile extends FileBase {

  private fileContentObject: TsConfigJsonFile | undefined

  private checkFileManagement (): void {
    const files = this.fileContentObject?.files ?? []
    if (files.length > Nb.Zero) {
      const hasNoWildcard = !files.some(file => file.includes('*'))
      this.test(hasNoWildcard, 'does not use wildcard in files section')
    }
    /* c8 ignore next */
    const include = this.fileContentObject?.include ?? []
    if (include.length > Nb.Zero) {
      const hasNoGlob = !include.some(file => file.endsWith('**/*'))
      this.test(hasNoGlob, '"my-folder/**/*" is not needed in include section, "my-folder" is enough', true)
    }
  }

  // eslint-disable-next-line max-statements, complexity, sonarjs/cognitive-complexity
  private checkCompilerOptions (): void {
    /* c8 ignore next */
    if (this.fileContentObject === undefined) { log.error('cannot check compiler options without file content'); return }
    const json = this.fileContentObject
    let isOk = this.couldContains('an include section', /"include"/u, Nb.One, undefined, true)
    if (!isOk && this.canFix) json.include = ['src']
    if (this.canFix && json.compilerOptions === undefined) json.compilerOptions = clone(recommendedCompilerOptions)
    // eslint-disable-next-line guard-for-in
    for (const inputKey in recommendedCompilerOptions) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const key = inputKey as keyof typeof recommendedCompilerOptions
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const value = recommendedCompilerOptions[key]
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(`"${key}": ${String(value)}`, 'u')
      isOk = this.couldContains(`a ${key} compiler option`, regex, Nb.One, undefined, true)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions[key] = value as never
    }
    isOk = this.couldContains('a outDir compiler option', /"outDir": "/u, Nb.One, 'ex : "outDir": "./dist",', true)
    if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions.outDir = './dist'
    isOk = this.couldContains('a moduleResolution compiler option', /"moduleResolution": "/u, Nb.One, 'ex : "moduleResolution": "Node",', true)
    if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions.moduleResolution = 'Node'
    isOk = this.couldContains('a target compiler option', /"target": "/u, Nb.One, 'ex : "target": "ES2020",', true)
    if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions.target = 'ES2020'
    isOk = this.couldContains('a non-empty lib compiler option', /"lib":\s\[\n/u, Nb.One, 'ex : "lib": [ "ESNext" ],', true)
    if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions.lib = ['ESNext']
    isOk = this.couldContains('a non-empty types compiler option', /"types":\s\[\n/u, Nb.One, 'ex : "types": [ "node/fs/promises" ],', true)
    if (!isOk && this.canFix && json.compilerOptions !== undefined) json.compilerOptions.types = []
    if (this.canFix) this.fileContent = JSON.stringify(json, undefined, Nb.Two)
  }

  // eslint-disable-next-line max-statements
  public async start (): Promise<void> {
    if (!this.data.isUsingTypescript) { log.debug('does not use typescript, skipping tsconfig.json checks'); return }
    await this.inspectFile('tsconfig.json')
    const data = parseJson<TsConfigJsonFile>(this.fileContent)
    if (data.error) { log.error('cannot check empty or invalid tsconfig.json file'); return }
    this.fileContentObject = data.value
    this.couldContainsSchema('https://json.schemastore.org/tsconfig')
    this.checkCompilerOptions()
    this.checkFileManagement()
    log.debug('tsconfig.json file checked')
  }
}
