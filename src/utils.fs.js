import makeDebug from 'debug'
import fs from 'fs'
import path from 'path'

const debug = makeDebug('kapture:utils:fs')

const tmpDir = process.env.TMP_DIR || './tmp'

export function getTmpDirName () {
  return tmpDir
}

export function createTmpDir () {
  if (!fs.existsSync(tmpDir)) {
    debug('createTmpDir; create temporay dir', tmpDir)
    fs.mkdirSync(tmpDir, { recusrive: true })
  }
}

export function writeTmpFile (file, content) {
  const filePath = path.join(tmpDir, file)
  debug('writeTmpFile: write temporay file', filePath)
  fs.writeFileSync(filePath, content)
}

export function deleteTmpFile (file) {
  const filePath = path.join(tmpDir, file)
  if (fs.existsSync(filePath)) {
    debug('deleteTmpFile: delete temporay file', filePath)
    fs.unlinkSync(filePath)
  }
}
