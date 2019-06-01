const log = require('./logger')
const { folderContainsFile, createFile } = require('./utils')

class Test {
  constructor (folderPath, doFix) {
    this.folderPath = folderPath
    this.doFix = doFix
  }
  async hasFile (file) {
    const ok = await folderContainsFile(this.folderPath, file)
    if (!ok && this.doFix) {
      createFile(this.folderPath, file)
      log.fix(`created a ${file} file`)
    } else {
      log.test(ok, `contains a ${file} file`)
    }
  }
}

module.exports = Test
