#!/usr/bin/env npx ts-node
/**
 * THE PALACE - LOCAL SIDECAR BRIDGE
 * WebSocket server that allows the Vercel frontend to execute local commands
 * 
 * Run with: npx ts-node bridge/server.ts
 * Or: npm run bridge
 */

import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const PORT = 9999
const BRIDGE_SECRET = process.env.PALACE_BRIDGE_SECRET || crypto.randomBytes(32).toString('hex')

interface BridgeCommand {
  id: string
  action: 'launch' | 'pulse' | 'terminal' | 'open' | 'exec'
  path: string
  token?: string
}

interface BridgeResponse {
  id: string
  success: boolean
  data?: unknown
  error?: string
}

const allowedPaths = [
  '/Users/bashar/Desktop'
]

function isPathAllowed(targetPath: string): boolean {
  const normalized = path.normalize(targetPath)
  return allowedPaths.some(allowed => normalized.startsWith(allowed))
}

async function handleCommand(cmd: BridgeCommand): Promise<BridgeResponse> {
  const response: BridgeResponse = { id: cmd.id, success: false }

  if (!isPathAllowed(cmd.path)) {
    response.error = `Path not allowed: ${cmd.path}`
    return response
  }

  if (!fs.existsSync(cmd.path)) {
    response.error = `Path does not exist: ${cmd.path}`
    return response
  }

  try {
    switch (cmd.action) {
      case 'launch':
        // Open in Windsurf (VS Code fork)
        await execAsync(`code "${cmd.path}"`)
        response.success = true
        response.data = { message: `Opened ${cmd.path} in Windsurf` }
        break

      case 'pulse':
        // Git status check
        try {
          const { stdout: status } = await execAsync(`git status --porcelain`, { cwd: cmd.path })
          const { stdout: branch } = await execAsync(`git branch --show-current`, { cwd: cmd.path })
          const { stdout: lastCommit } = await execAsync(`git log -1 --format="%h %s" 2>/dev/null || echo "No commits"`, { cwd: cmd.path })
          
          const changes = status.trim().split('\n').filter(Boolean)
          response.success = true
          response.data = {
            branch: branch.trim(),
            lastCommit: lastCommit.trim(),
            hasChanges: changes.length > 0,
            changeCount: changes.length,
            changes: changes.slice(0, 10), // Limit to 10 for display
          }
        } catch {
          response.success = true
          response.data = { hasGit: false, message: 'Not a git repository' }
        }
        break

      case 'terminal':
        // Open Terminal at path
        await execAsync(`open -a Terminal "${cmd.path}"`)
        response.success = true
        response.data = { message: `Opened Terminal at ${cmd.path}` }
        break

      case 'open':
        // Open in Finder
        await execAsync(`open "${cmd.path}"`)
        response.success = true
        response.data = { message: `Opened ${cmd.path} in Finder` }
        break

      case 'exec':
        // Generic command execution (more restricted)
        response.error = 'Generic exec not implemented for security'
        break

      default:
        response.error = `Unknown action: ${cmd.action}`
    }
  } catch (err) {
    response.error = err instanceof Error ? err.message : 'Unknown error'
  }

  return response
}

// HTTP server for health checks and CORS preflight
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ 
      status: 'ok', 
      bridge: 'palace-sidecar',
      version: '1.0.0',
      secret: BRIDGE_SECRET.slice(0, 8) + '...' // Show partial for verification
    }))
    return
  }

  if (req.url === '/secret') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ secret: BRIDGE_SECRET }))
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

// WebSocket server
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (ws: WebSocket) => {
  console.log('🏰 Palace Bridge: Client connected')

  ws.on('message', async (data: Buffer) => {
    try {
      const cmd: BridgeCommand = JSON.parse(data.toString())
      console.log(`📡 Command received: ${cmd.action} -> ${cmd.path}`)
      
      const response = await handleCommand(cmd)
      ws.send(JSON.stringify(response))
      
      console.log(`✅ Response sent: ${response.success ? 'SUCCESS' : 'FAILED'}`)
    } catch (err) {
      const errorResponse: BridgeResponse = {
        id: 'error',
        success: false,
        error: err instanceof Error ? err.message : 'Parse error'
      }
      ws.send(JSON.stringify(errorResponse))
    }
  })

  ws.on('close', () => {
    console.log('🏰 Palace Bridge: Client disconnected')
  })
})

httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏰 THE PALACE - LOCAL SIDECAR BRIDGE                     ║
║                                                            ║
║   Status:    ONLINE                                        ║
║   Port:      ${PORT}                                          ║
║   WebSocket: ws://localhost:${PORT}                           ║
║   Health:    http://localhost:${PORT}/health                  ║
║                                                            ║
║   Bridge Secret (first 8 chars): ${BRIDGE_SECRET.slice(0, 8)}                 ║
║                                                            ║
║   Commands:                                                ║
║   • launch   - Open folder in Windsurf                     ║
║   • pulse    - Get git status                              ║
║   • terminal - Open Terminal at path                       ║
║   • open     - Open in Finder                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `)
})
