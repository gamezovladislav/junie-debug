#!/usr/bin/env node

const path = require("path")
const fs = require("fs")
const { pipeline } = require("stream/promises")
const unzipper = require('unzipper')
const os = require("os")
const { getExpectedBinaryPath } = require("./getExecutable")

// Check for Windows early and exit gracefully
if (os.platform() === 'win32') {
  console.log('')
  console.log('╭──────────────────────────────────────────────────────╮')
  console.log('│                                                      │')
  console.log('│  Junie CLI does not support Windows yet.             │')
  console.log('│  Supported platforms: macOS, Linux                   │')
  console.log('│                                                      │')
  console.log('│  Stay tuned for Windows support in future releases!  │')
  console.log('│                                                      │')
  console.log('╰──────────────────────────────────────────────────────╯')
  console.log('')
  process.exit(0)
}

const ARCH_MAP = {
  x64: 'amd64',
  amd64: 'amd64',
  arm64: 'aarch64',
  aarch64: 'aarch64'
}
const OS_MAP = {
  linux: 'linux',
  darwin: 'macos'
}

function resolveTarget() {
  const arch = ARCH_MAP[os.arch()]
  const osName = OS_MAP[os.platform()]
  if (!arch) throw new Error(`Unsupported architecture: ${os.arch()}`)
  if (!osName) throw new Error(`Unsupported platform: ${os.platform()}`)
  return {arch, osName}
}

function buildUrl({arch, osName}) {
  const JUNIE_VERSION = require("./package.json").junieVersion
  const tag = `${JUNIE_VERSION}`
  return `https://github.com/jetbrains-junie/junie/releases/download/${tag}/junie-eap-${JUNIE_VERSION}-${osName}-${arch}.zip`
}

function stripQuarantine(targetPath) {
  if (os.platform() !== 'darwin') return
  try {
    execSync(`xattr -dr com.apple.quarantine "${targetPath}"`, { stdio: 'ignore' })
  } catch {
    // ignore if xattr not available or attribute missing
  }
}

function chmodRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return
  const stack = [dirPath]
  while (stack.length) {
    const current = stack.pop()
    let stat;
    try {
      stat = fs.lstatSync(current)
    } catch {
      continue
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) {
      try {
        for (const entry of fs.readdirSync(current)) {
          stack.push(path.join(current, entry))
        }
      } catch {
        // ignore unreadable dirs
      }
    } else if (stat.isFile()) {
      try {
        fs.chmodSync(current, 0o755);
      } catch {
        // ignore files we can't chmod
      }
    }
  }
}

async function downloadAndInstall() {
  const {arch, osName} = resolveTarget()
  const url = buildUrl({arch, osName})
  const workDir = path.resolve(__dirname, 'bin', 'junie')
  const markerFile = path.resolve(__dirname, 'bin', 'junie.download')

  fs.mkdirSync(workDir, {recursive: true})

  const zipPath = path.join(workDir, 'junie.zip')
  console.log(`[Junie] Downloading from ${url}`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)

  await pipeline(res.body, fs.createWriteStream(zipPath))

  await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: workDir })).promise()

  chmodRecursive(workDir)
  stripQuarantine(workDir)

  const binaryPath = getExpectedBinaryPath()
  // Re-assert main binary is executable (cheap, idempotent)
  try { fs.chmodSync(binaryPath, 0o755); } catch {}

  fs.rmSync(zipPath)

  fs.writeFileSync(markerFile, binaryPath, 'utf8')

  console.log('[Junie] Installation complete.')

  return binaryPath
}

async function main() {
  try {
    await downloadAndInstall()
  } catch (error) {
    console.error('[Junie] Post-install error:', error)
    process.exit(1)
  }
}

main()