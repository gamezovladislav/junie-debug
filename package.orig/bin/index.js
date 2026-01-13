#!/usr/bin/env node
const {spawnSync} = require('child_process')
const {getExecutable} = require('../getExecutable')

function main() {
  try {
    const exe = getExecutable()
    const result = spawnSync(exe, process.argv.slice(2), {stdio: 'inherit'})
    process.exit(result.status ?? 0)
  } catch (error) {
    console.error('[Junie] Error:', error.message)
    process.exit(1)
  }
}

main()