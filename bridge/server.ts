#!/usr/bin/env npx ts-node

import { exec } from 'child_process'
import { existsSync } from 'fs'
import * as path from 'path'
import { WebSocketServer } from 'ws'

const PORT = 8080
const AUTH_TOKEN = 'palace_secret_123'

type CommandType = 'LAUNCH' | 'PULSE' | 'TERMINAL'

type CockpitRequest = {
  id: string
  token: string
  type: CommandType
  path: string
}

type CockpitResponse = {
  id: string
  ok: boolean
  data?: unknown
  error?: string
}

const allowedRoots = ['/Users/bashar/Desktop']

function isAllowed(targetPath: string) {
  const normalized = path.normalize(targetPath)
  return allowedRoots.some(root => normalized.startsWith(root))
}

function execAsync(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout, stderr })
    })
  })
}

async function handle(req: CockpitRequest): Promise<CockpitResponse> {
  if (req.token !== AUTH_TOKEN) {
    return { id: req.id, ok: false, error: 'Unauthorized' }
  }

  if (!isAllowed(req.path)) {
    return { id: req.id, ok: false, error: 'Path not allowed' }
  }

  if (!existsSync(req.path)) {
    return { id: req.id, ok: false, error: 'Path not found' }
  }

  try {
    if (req.type === 'LAUNCH') {
      await execAsync(`windsurf "${req.path}"`)
      return { id: req.id, ok: true, data: { message: 'Launched in Windsurf' } }
    }

    if (req.type === 'PULSE') {
      const { stdout } = await execAsync('git status --porcelain', req.path)
      const changes = stdout.trim().split('\n').filter(Boolean)
      return {
        id: req.id,
        ok: true,
        data: {
          hasChanges: changes.length > 0,
          changeCount: changes.length,
          changes: changes.slice(0, 50),
        },
      }
    }

    if (req.type === 'TERMINAL') {
      await execAsync(`open -a Terminal "${req.path}"`)
      return { id: req.id, ok: true, data: { message: 'Opened Terminal' } }
    }

    return { id: req.id, ok: false, error: 'Unknown command' }
  } catch (err) {
    return { id: req.id, ok: false, error: err instanceof Error ? err.message : 'Command failed' }
  }
}

const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' })

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    let req: CockpitRequest | null = null
    try {
      req = JSON.parse(data.toString()) as CockpitRequest
    } catch {
      const res: CockpitResponse = { id: 'error', ok: false, error: 'Invalid JSON' }
      ws.send(JSON.stringify(res))
      return
    }

    const res = await handle(req)
    ws.send(JSON.stringify(res))
  })
})

console.log(`Palace Cockpit Bridge listening on ws://127.0.0.1:${PORT}`)
