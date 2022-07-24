import { parseJson } from 'shuutils/dist/strings'
import { File } from '../file'
import { log } from '../logger'

interface TsConfigJsonFile {
  compilerOptions: Record<string, string | boolean>
  include: string[]
}

export class TsConfigFile extends File {
  async start (): Promise<boolean | undefined> {
    if (this.data.use_typescript === false) return
    await this.inspectFile('tsconfig.json')
    const data = parseJson<TsConfigJsonFile>(this.fileContent)
    if (data.error) return log.error('cannot check empty or invalid tsconfig.json file')
    const json = data.value
    let ok = this.couldContains('an include section', /"include"/, 1, undefined, true)
    if (!ok && this.doFix) json.include = ['src']
    ok = this.couldContains('a esModuleInterop compiler option', /"esModuleInterop": true,/, 1, undefined, true)
    if (this.doFix && !json.compilerOptions) json.compilerOptions = {}
    if (!ok && this.doFix) json.compilerOptions.esModuleInterop = true
    ok = this.couldContains('a forceConsistentCasingInFileNames compiler option', /"forceConsistentCasingInFileNames": true,/, 1, undefined, true)
    if (!ok && this.doFix) json.compilerOptions.forceConsistentCasingInFileNames = true
    ok = this.couldContains('a skipLibCheck compiler option', /"skipLibCheck": true,/, 1, undefined, true)
    if (!ok && this.doFix) json.compilerOptions.skipLibCheck = true
    ok = this.couldContains('a strict compiler option', /"strict": true,/, 1, undefined, true)
    if (!ok && this.doFix) json.compilerOptions.strict = true
    ok = this.couldContains('a outDir compiler option', /"outDir": "/, 1, 'ex : "outDir": "./dist",', true)
    if (!ok && this.doFix) json.compilerOptions.outDir = './dist'
    ok = this.couldContains('a moduleResolution compiler option', /"moduleResolution": "/, 1, 'ex : "moduleResolution": "Node",', true)
    if (!ok && this.doFix) json.compilerOptions.moduleResolution = 'Node'
    ok = this.couldContains('a target compiler option', /"target": "/, 1, 'ex : "target": "ES2020",', true)
    if (!ok && this.doFix) json.compilerOptions.target = 'ES2020'
    if (this.doFix) this.fileContent = JSON.stringify(json, undefined, 2)
  }
}
