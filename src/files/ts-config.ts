import { File } from '../file'

interface TsConfigJsonFile {
  compilerOptions: Record<string, string | boolean>
  include: string[]
}

export class TsConfigFile extends File {
  async start (): Promise<void> {
    if (this.data.use_typescript === false) return
    await this.inspectFile('tsconfig.json')
    const content = JSON.parse(this.fileContent) as TsConfigJsonFile
    let ok = this.couldContains('an include section', /"include"/, 1, undefined, true)
    if (!ok && this.doFix) content.include = ['src']
    ok = this.couldContains('a esModuleInterop compiler option', /"esModuleInterop": true,/, 1, undefined, true)
    if (this.doFix && !content.compilerOptions) content.compilerOptions = {}
    if (!ok && this.doFix) content.compilerOptions.esModuleInterop = true
    ok = this.couldContains('a forceConsistentCasingInFileNames compiler option', /"forceConsistentCasingInFileNames": true,/, 1, undefined, true)
    if (!ok && this.doFix) content.compilerOptions.forceConsistentCasingInFileNames = true
    ok = this.couldContains('a skipLibCheck compiler option', /"skipLibCheck": true,/, 1, undefined, true)
    if (!ok && this.doFix) content.compilerOptions.skipLibCheck = true
    ok = this.couldContains('a strict compiler option', /"strict": true,/, 1, undefined, true)
    if (!ok && this.doFix) content.compilerOptions.strict = true
    ok = this.couldContains('a outDir compiler option', /"outDir": "/, 1, 'ex : "outDir": "./dist",', true)
    if (!ok && this.doFix) content.compilerOptions.outDir = './dist'
    ok = this.couldContains('a moduleResolution compiler option', /"moduleResolution": "/, 1, 'ex : "moduleResolution": "Node",', true)
    if (!ok && this.doFix) content.compilerOptions.moduleResolution = 'Node'
    ok = this.couldContains('a target compiler option', /"target": "/, 1, 'ex : "target": "ES2020",', true)
    if (!ok && this.doFix) content.compilerOptions.target = 'ES2020'
    if (this.doFix) this.fileContent = JSON.stringify(content, undefined, 2)
  }
}
