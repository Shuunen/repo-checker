const log = require('./logger')
const { folderContainsFile } = require('./utils')

class Test {
  constructor (folderPath) {
    this.folderPath = folderPath
  }
  async hasFile (file) {
    const ok = await folderContainsFile(this.folderPath, file)
    log.test(ok, `contains a ${file} file`)
  }
}

module.exports = Test
