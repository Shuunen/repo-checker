const log = require('./logger')
const { folderContainsFile, createFile, fillTemplate, readFile } = require('./utils')

class Test {
  constructor (folderPath, data, doFix) {
    this.folderPath = folderPath
    this.data = data
    this.doFix = doFix
  }
  async hasFile (fileName) {
    const ok = await folderContainsFile(this.folderPath, fileName)
    if (!ok && this.doFix) {
      const template = await readFile('src/templates', fileName, true)
      const fileContent = fillTemplate(template, this.data)
      const fileCreated = await createFile(this.folderPath, fileName, fileContent)
      if (fileCreated) {
        log.fix(`created a ${fileName} file`)
      }
    } else {
      log.test(ok, `contains a ${fileName} file`)
    }
  }
}

module.exports = Test
