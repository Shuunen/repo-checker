import { FileBase } from '../file.ts'

// eslint-disable-next-line no-restricted-syntax, jsdoc/require-jsdoc
export class EditorConfigFile extends FileBase {
  /**
   * Start the editorconfig file check
   */
  public async start() {
    const hasFile = await this.checkFileExists('.editorconfig')
    if (!hasFile) return
    await this.inspectFile('.editorconfig')
    this.shouldContains('space indent', /indent_style = space/u)
    this.shouldContains('indent size of 2', /indent_size = 2/u)
    this.shouldContains('unix style line endings', /end_of_line = lf/u)
    this.shouldContains('utf-8 encoding', /charset = utf-8/u)
    this.couldContains('whitespace trailing', /trim_trailing_whitespace = true/u)
    this.couldContains('final new line rule', /insert_final_newline = true/u)
    this.couldContains('no specific html indent rule', /\[\*\.html\]\nindent_size = 4/u, 0)
  }
}
