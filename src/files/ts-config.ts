import { copy } from 'shuutils/dist/objects'
import { parseJson } from 'shuutils/dist/strings'
import { File } from '../file'
import { log } from '../logger'

const recommendedCompilerOptions = {
  allowUnreachableCode: false,
  allowUnusedLabels: false,
  checkJs: true,
  esModuleInterop: true,
  exactOptionalPropertyTypes: true,
  forceConsistentCasingInFileNames: true,
  importsNotUsedAsValues: 'error',
  noFallthroughCasesInSwitch: true,
  noImplicitAny: true,
  noImplicitOverride: true,
  noImplicitReturns: true,
  noPropertyAccessFromIndexSignature: true,
  noUncheckedIndexedAccess: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  skipLibCheck: true,
  strict: true,
  zob: undefined, // zob is not a recommended option ^^' just to please tsConfig/tsc
}

interface TsConfigJsonFile {
  compilerOptions?: Record<string, string[] | boolean | string | undefined> & typeof recommendedCompilerOptions
  include: string[]
  exclude: string[]
  files: string[]
}

export class TsConfigFile extends File {

  private fileContentObject: TsConfigJsonFile | undefined

  public async start (): Promise<boolean> {
    if (!this.data.useTypescript) return log.debug('does not use typescript, skipping tsconfig.json checks')
    await this.inspectFile('tsconfig.json')
    const data = parseJson<TsConfigJsonFile>(this.fileContent)
    if (data.error) return log.error('cannot check empty or invalid tsconfig.json file')
    this.fileContentObject = data.value
    this.couldContainsSchema('https://json.schemastore.org/tsconfig')
    this.checkCompilerOptions()
    this.checkFileManagement()
    return log.debug('tsconfig.json file checked')
  }

  private checkFileManagement (): void {
    const files = this.fileContentObject?.files ?? []
    if (files.length > 0) {
      const ok = !files.some(file => file.includes('*'))
      this.test(ok, 'does not use wildcard in files section')
    }
    /* c8 ignore next */
    const include = this.fileContentObject?.include ?? []
    if (include.length > 0) {
      const ok = !include.some(file => file.endsWith('**/*'))
      this.test(ok, '"my-folder/**/*" is not needed in include section, "my-folder" is enough', true)
    }
  }

  private checkCompilerOptions (): boolean {
    /* c8 ignore next */
    if (this.fileContentObject === undefined) return log.error('cannot check compiler options without file content')
    const json = this.fileContentObject
    let ok = this.couldContains('an include section', /"include"/, 1, undefined, true)
    if (!ok && this.doFix) json.include = ['src']
    if (this.doFix && json.compilerOptions === undefined) json.compilerOptions = copy(recommendedCompilerOptions)
    for (const inputKey in recommendedCompilerOptions) {
      const key = inputKey as keyof typeof recommendedCompilerOptions
      const value = recommendedCompilerOptions[key]
      if (value === undefined) continue
      const regex = typeof value === 'string' ? new RegExp(`"${key}": "${value}"`) : new RegExp(`"${key}": ${String(value)}`)
      ok = this.couldContains(`a ${key} compiler option`, regex, 1, undefined, true)
      if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions[key] = value as never
    }
    ok = this.couldContains('a outDir compiler option', /"outDir": "/, 1, 'ex : "outDir": "./dist",', true)
    if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions['outDir'] = './dist'
    ok = this.couldContains('a moduleResolution compiler option', /"moduleResolution": "/, 1, 'ex : "moduleResolution": "Node",', true)
    if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions['moduleResolution'] = 'Node'
    ok = this.couldContains('a target compiler option', /"target": "/, 1, 'ex : "target": "ES2020",', true)
    if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions['target'] = 'ES2020'
    ok = this.couldContains('a non-empty lib compiler option', /"lib":\s\[\n/, 1, 'ex : "lib": [ "ESNext" ],', true)
    if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions['lib'] = ['ESNext']
    ok = this.couldContains('a non-empty types compiler option', /"types":\s\[\n/, 1, 'ex : "types": [ "node/fs/promises" ],', true)
    if (!ok && this.doFix && json.compilerOptions !== undefined) json.compilerOptions['types'] = []
    if (this.doFix) this.fileContent = JSON.stringify(json, undefined, 2)
    return true
  }
}
