#!/usr/bin/env node

const path = require("path")
const fs = require("fs")
const { pipeline } = require("stream/promises")
const unzipper = require('unzipper')
const { execSync, spawnSync } = require("child_process")
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

function extractWithSystemUnzip(zipPath, workDir) {
  const result = spawnSync('unzip', ['-q', '-o', zipPath, '-d', workDir], { encoding: 'utf8' })

  if (result.error) {
    if (result.error.code === 'ENOENT') return false
    throw result.error
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(`unzip failed with exit code ${result.status}${detail ? `: ${detail}` : ''}`)
  }
  return true
}

async function extractZip(zipPath, workDir) {
  if (process.env.JUNIE_FORCE_UNZIPPER !== '1') {
    const usedSystem = extractWithSystemUnzip(zipPath, workDir)
    if (usedSystem) return
  }
  await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: workDir })).promise()
}

async function downloadAndInstall() {
  const {arch, osName} = resolveTarget()
  const overrideUrl = process.env.JUNIE_DOWNLOAD_URL
  const url = overrideUrl || buildUrl({arch, osName})
  const workDir = path.resolve(__dirname, 'bin', 'junie')
  const markerFile = path.resolve(__dirname, 'bin', 'junie.download')

  fs.mkdirSync(workDir, {recursive: true})

  const zipPath = path.join(workDir, 'junie.zip')
  if (overrideUrl) {
    console.log(`[Junie] Using JUNIE_DOWNLOAD_URL=${overrideUrl}`)
  }
  console.log(`[Junie] Downloading from ${url}`)

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`)

  await pipeline(res.body, fs.createWriteStream(zipPath))

  await extractZip(zipPath, workDir)

  chmodRecursive(workDir)
  stripQuarantine(workDir)

  const binaryPath = getExpectedBinaryPath()
  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Expected Junie binary not found after extraction at ${binaryPath}.`)
  }
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
