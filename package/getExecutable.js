const fs = require('fs')
const path = require('path')
const os = require("node:os")

function getExpectedBinaryPath() {
  const workDir = path.resolve(__dirname, 'bin', 'junie')

  return os.platform() === 'darwin'
    ? path.join(workDir, 'Applications', 'junie.app', 'Contents', 'MacOS', 'junie')
    : path.join(workDir, 'junie', 'bin', 'junie')
}

function readMarkerPath(markerFile) {
  if (!fs.existsSync(markerFile)) return null
  try {
    const content = fs.readFileSync(markerFile, 'utf8').trim()
    return content.length ? content : null
  } catch {
    return null
  }
}

function buildMissingBinaryMessage({ resolvedPath, expectedPath, markerFile, markerPath }) {
  const markerStatus = fs.existsSync(markerFile)
    ? (markerPath ? markerPath : '<empty>')
    : '<missing>'

  const hint = [
    'Reinstall with scripts enabled:',
    'npm config set ignore-scripts false && npm rebuild @jetbrains/junie-cli --foreground-scripts',
    'If you are behind a proxy, ensure GitHub downloads are reachable.',
  ].join(' ')

  return [
    `Junie binary not found at ${resolvedPath || '<undefined>'}.`,
    `platform=${os.platform()} arch=${os.arch()}`,
    `expected=${expectedPath}`,
    `marker=${markerStatus}`,
    hint,
  ].join(' ')
}

function getExecutable() {
  const markerFile = path.resolve(__dirname, 'bin', 'junie.download')
  const expectedPath = getExpectedBinaryPath()
  const envPath = process.env.JUNIE_BINARY_PATH || process.env.JUNIE_BINARY
  const markerPath = readMarkerPath(markerFile)

  const resolvedPath = envPath || markerPath || expectedPath

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    return resolvedPath
  }

  const error = new Error(buildMissingBinaryMessage({
    resolvedPath,
    expectedPath,
    markerFile,
    markerPath,
  }))
  error.code = 'JUNIE_BINARY_NOT_FOUND'
  throw error
}


module.exports = {
  getExpectedBinaryPath,
  getExecutable,
};
