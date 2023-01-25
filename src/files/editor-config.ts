import { Nb } from 'shuutils'
import { File } from '../file'

export class EditorConfigFile extends File {
  public async start (): Promise<void> {
    const exists = await this.checkFileExists('.editorconfig')
    if (!exists) return
    await this.inspectFile('.editorconfig')
    this.shouldContains('space indent', /indent_style = space/)
    this.shouldContains('indent size of 2', /indent_size = 2/)
    this.shouldContains('unix style line endings', /end_of_line = lf/)
    this.shouldContains('utf-8 encoding', /charset = utf-8/)
    this.couldContains('whitespace trailing', /trim_trailing_whitespace = true/)
    this.couldContains('final new line rule', /insert_final_newline = true/)
    this.couldContains('specific markdown trailing rule', /\[\*\.md]\ntrim_trailing_whitespace = false/)
    this.couldContains('no specific html indent rule', /\[\*\.html]\nindent_size = 4/, Nb.None)
  }
}
