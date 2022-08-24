import { parseJson } from 'shuutils/dist/strings'
import { File } from '../file'
import { log } from '../logger'

interface TsConfigJsonFile {
  compilerOptions: Record<string, string | boolean>
  include: string[]
}

export class TsConfigFile extends File {
  async start (): Promise<boolean> {
    if (this.data.use_typescript === false) return log.debug('does not use typescript, skipping tsconfig.json checks')
    await this.inspectFile('tsconfig.json')
    const data = parseJson<TsConfigJsonFile>(this.fileContent)
    if (data.error) return log.error('cannot check empty or invalid tsconfig.json file')
    const json = data.value
    let ok = this.couldContains('an include section', /"include"/, 1, undefined, true)
    if (!ok && this.doFix) json.include = ['src']
    if (this.doFix && !json.compilerOptions) json.compilerOptions = {}
    const recommendedCompilerOptions: Record<keyof TsConfigJsonFile['compilerOptions'], boolean | string | undefined> = {
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
    for (const key in recommendedCompilerOptions) {
      const value = recommendedCompilerOptions[key]
      if (value === undefined) continue
      const regex = typeof value === 'string' ? new RegExp(`"${key}": "${value}"`) : new RegExp(`"${key}": ${value}`)
      ok = this.couldContains(`a ${key} compiler option`, regex, 1, undefined, true)
      if (!ok && this.doFix) json.compilerOptions[key] = value
    }
    ok = this.couldContains('a outDir compiler option', /"outDir": "/, 1, 'ex : "outDir": "./dist",', true)
    if (!ok && this.doFix) json.compilerOptions['outDir'] = './dist'
    ok = this.couldContains('a moduleResolution compiler option', /"moduleResolution": "/, 1, 'ex : "moduleResolution": "Node",', true)
    if (!ok && this.doFix) json.compilerOptions['moduleResolution'] = 'Node'
    ok = this.couldContains('a target compiler option', /"target": "/, 1, 'ex : "target": "ES2020",', true)
    if (!ok && this.doFix) json.compilerOptions['target'] = 'ES2020'
    if (this.doFix) this.fileContent = JSON.stringify(json, undefined, 2)
    return log.debug('tsconfig.json file checked')
  }
}
