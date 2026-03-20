#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const backendEnvLocal = path.join(repoRoot, 'backend', '.env.local')
const backendEnv = path.join(repoRoot, 'backend', '.env')
const backendEnvExample = path.join(repoRoot, 'backend', '.env.example')
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const children = []
let shuttingDown = false

const log = (message) => {
  process.stdout.write(`${message}\n`)
}

const warn = (message) => {
  process.stderr.write(`${message}\n`)
}

const killChildren = (signal = 'SIGTERM') => {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal)
    }
  }
}

const spawnService = (label, args) => {
  const child = spawn(pnpmBin, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  })

  children.push(child)

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    if (signal) {
      warn(`[${label}] exited on signal ${signal}`)
      killChildren(signal)
      process.exit(1)
      return
    }

    if (code && code !== 0) {
      warn(`[${label}] exited with code ${code}`)
      killChildren('SIGTERM')
      process.exit(code)
    }
  })
}

if (!fs.existsSync(backendEnvLocal) && !fs.existsSync(backendEnv)) {
  warn(
    `Backend env not found. Create backend/.env.local from ${backendEnvExample} before expecting the UI-equivalent wizard flow to work.`,
  )
}

log('Starting RevCenter backend API and worker for the UI-equivalent wizard flow...')
log('')
log('Next CLI command once services are up:')
log('pnpm --filter revcenter-cli run wizard')
log('')

spawnService('backend-api', ['--filter', 'revcenter-backend', 'dev'])
spawnService('backend-worker', ['--filter', 'revcenter-backend', 'dev:worker'])

process.on('SIGINT', () => {
  killChildren('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  killChildren('SIGTERM')
  process.exit(0)
})
