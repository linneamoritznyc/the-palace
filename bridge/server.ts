#!/usr/bin/env npx ts-node

import { exec } from 'child_process'
import { existsSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import * as path from 'path'
import { WebSocketServer } from 'ws'

const PORT = 8080
const AUTH_TOKEN = 'palace_secret_123'

type CommandType = 'LAUNCH' | 'PULSE' | 'TERMINAL' | 'READ_README' | 'DETECT_PORT'

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

    if (req.type === 'READ_README') {
      const readmePath = path.join(req.path, 'README.md')
      if (!existsSync(readmePath)) {
        return { id: req.id, ok: false, error: 'README.md not found' }
      }

      const raw = await readFile(readmePath, 'utf8')
      const words = raw
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)

      const snippet = words.slice(0, 500).join(' ')
      const mtimeMs = statSync(readmePath).mtimeMs

      return {
        id: req.id,
        ok: true,
        data: {
          readmePath,
          mtimeMs,
          wordCount: words.length,
          snippet,
        },
      }
    }

    if (req.type === 'DETECT_PORT') {
      const pkgPath = path.join(req.path, 'package.json')
      if (!existsSync(pkgPath)) {
        return { id: req.id, ok: true, data: { port: 3001, reason: 'no package.json' } }
      }

      const raw = await readFile(pkgPath, 'utf8')
      let pkg: any
      try {
        pkg = JSON.parse(raw)
      } catch {
        return { id: req.id, ok: true, data: { port: 3001, reason: 'invalid package.json' } }
      }

      const scripts = pkg?.scripts || {}
      const haystack = [scripts.dev, scripts.start, scripts.serve, scripts.preview]
        .filter(Boolean)
        .join(' ')

      // Heuristics: look for explicit port flags or localhost URLs.
      const patterns: Array<{ re: RegExp; hint: string }> = [
        { re: /localhost:(\d{2,5})/i, hint: 'localhost:url' },
        { re: /--port\s+(\d{2,5})/i, hint: '--port' },
        { re: /--port=(\d{2,5})/i, hint: '--port=' },
        { re: /-p\s+(\d{2,5})/i, hint: '-p' },
        { re: /:?(\d{4,5})/i, hint: 'bare-number' },
      ]

      let port: number | null = null
      let reason = 'default'

      for (const ptn of patterns) {
        const m = haystack.match(ptn.re)
        if (m?.[1]) {
          const n = Number(m[1])
          if (Number.isFinite(n) && n >= 1 && n <= 65535) {
            port = n
            reason = ptn.hint
            break
          }
        }
      }

      // Common defaults by tooling when no explicit flag.
      if (!port) {
        if (/\b(vite|vitest)\b/i.test(haystack)) {
          port = 5173
          reason = 'vite-default'
        } else if (/\b(next)\b/i.test(haystack)) {
          port = 3000
          reason = 'next-default'
        } else {
          port = 3001
          reason = 'fallback'
        }
      }

      return { id: req.id, ok: true, data: { port, reason } }
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
