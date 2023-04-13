import { FileBase } from '../file'

export class EditorConfigFile extends FileBase {
  public async start (): Promise<void> {
    const hasFile = await this.checkFileExists('.editorconfig')
    if (!hasFile) return
    await this.inspectFile('.editorconfig')
    this.shouldContains('space indent', /indent_style = space/u)
    this.shouldContains('indent size of 2', /indent_size = 2/u)
    this.shouldContains('unix style line endings', /end_of_line = lf/u)
    this.shouldContains('utf-8 encoding', /charset = utf-8/u)
    this.couldContains('whitespace trailing', /trim_trailing_whitespace = true/u)
    this.couldContains('final new line rule', /insert_final_newline = true/u)
    // eslint-disable-next-line require-unicode-regexp, regexp/require-unicode-regexp, unicorn/better-regex
    this.couldContains('no specific html indent rule', /\[\*\.html\]\nindent_size = 4/, 0)
  }
}
