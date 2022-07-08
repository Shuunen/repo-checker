import { File } from '../file'
import { findStringInFolder } from '../utils'

export class AllFiles extends File {
  async start (): Promise<void> {
    let files = []
    files = await findStringInFolder({ folderPath: '.', fix: this.doFix, pattern: /\r\n/, replaceWith: '\n' })
    this.test(files.length === 0, 'no windows carriage returns \\r\\n')
    // await findStringInFolder('.', /([a-zA-Z\u00C0-\u024F])'([a-zA-Z\u00C0-\u024F])/, '$1’$2')
  }
}
