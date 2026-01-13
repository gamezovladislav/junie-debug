const fs = require('fs')
const path = require('path')
const { platform } = require("node:os")

function getExpectedBinaryPath() {
  const workDir = path.resolve(__dirname, 'bin', 'junie')

  return platform() === 'darwin'
    ? path.join(workDir, 'Applications', 'junie.app', 'Contents', 'MacOS', 'junie')
    : path.join(workDir, 'junie', 'bin', 'junie')
}


function getExecutable() {
  const markerFile = path.resolve(__dirname, 'bin', 'junie.download')

  if (fs.existsSync(markerFile)) {
    const binaryPath = getExpectedBinaryPath()

    if (fs.existsSync(binaryPath)) {
      return binaryPath
    } else {
      console.error('Junie binary not found. Please re-install the package')
    }
  } else {
    console.error('Junie download is corrupted. Please re-install the package')
  }
}


module.exports = {
  getExpectedBinaryPath,
  getExecutable,
};