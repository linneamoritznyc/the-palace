'use client'

/**
 * THE PALACE - Bridge Client
 * Connects frontend to the local sidecar WebSocket server
 */

export type BridgeAction = 'launch' | 'pulse' | 'terminal' | 'open'

export interface BridgeCommand {
  id: string
  action: BridgeAction
  path: string
}

export interface PulseData {
  hasGit: boolean
  branch?: string
  lastCommit?: string
  hasChanges?: boolean
  changeCount?: number
  changes?: string[]
  message?: string
}

export interface BridgeResponse {
  id: string
  success: boolean
  data?: PulseData | { message: string }
  error?: string
}

const BRIDGE_URL = 'ws://localhost:9999'
const BRIDGE_HEALTH_URL = 'http://localhost:9999/health'

class PalaceBridge {
  private ws: WebSocket | null = null
  private pendingCommands: Map<string, { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void }> = new Map()
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(BRIDGE_HEALTH_URL, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      return res.ok
    } catch {
      return false
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.isConnecting && this.connectionPromise) return this.connectionPromise

    this.isConnecting = true
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(BRIDGE_URL)

        this.ws.onopen = () => {
          console.log('🏰 Palace Bridge: Connected')
          this.isConnecting = false
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const response: BridgeResponse = JSON.parse(event.data)
            const pending = this.pendingCommands.get(response.id)
            if (pending) {
              pending.resolve(response)
              this.pendingCommands.delete(response.id)
            }
          } catch (err) {
            console.error('Bridge parse error:', err)
          }
        }

        this.ws.onerror = () => {
          this.isConnecting = false
          reject(new Error('Bridge connection failed'))
        }

        this.ws.onclose = () => {
          this.ws = null
          this.isConnecting = false
          // Reject all pending commands
          this.pendingCommands.forEach(({ reject }) => {
            reject(new Error('Connection closed'))
          })
          this.pendingCommands.clear()
        }
      } catch (err) {
        this.isConnecting = false
        reject(err)
      }
    })

    return this.connectionPromise
  }

  async send(action: BridgeAction, path: string): Promise<BridgeResponse> {
    await this.connect()

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Bridge not connected')
    }

    const id = crypto.randomUUID()
    const command: BridgeCommand = { id, action, path }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(id)
        reject(new Error('Command timeout'))
      }, 10000)

      this.pendingCommands.set(id, {
        resolve: (r) => {
          clearTimeout(timeout)
          resolve(r)
        },
        reject: (e) => {
          clearTimeout(timeout)
          reject(e)
        }
      })

      this.ws!.send(JSON.stringify(command))
    })
  }

  async launch(path: string): Promise<BridgeResponse> {
    return this.send('launch', path)
  }

  async pulse(path: string): Promise<BridgeResponse> {
    return this.send('pulse', path)
  }

  async terminal(path: string): Promise<BridgeResponse> {
    return this.send('terminal', path)
  }

  async openFinder(path: string): Promise<BridgeResponse> {
    return this.send('open', path)
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }
}

// Singleton instance
export const bridge = new PalaceBridge()

// Deep link helper (works without bridge server)
export function createDeepLink(action: string, path: string): string {
  return `the-palace://${action}?path=${encodeURIComponent(path)}`
}

// React hook for bridge status
import { useState, useEffect, useCallback } from 'react'

export function useBridge() {
  const [isConnected, setIsConnected] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkConnection() {
      const healthy = await bridge.checkHealth()
      if (mounted) {
        setIsConnected(healthy)
        setIsChecking(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const launch = useCallback(async (path: string) => {
    if (!isConnected) {
      // Fallback to deep link
      window.location.href = createDeepLink('launch', path)
      return { success: true, data: { message: 'Deep link triggered' } } as BridgeResponse
    }
    return bridge.launch(path)
  }, [isConnected])

  const pulse = useCallback(async (path: string) => {
    if (!isConnected) {
      return { 
        id: 'offline', 
        success: false, 
        error: 'Bridge not connected. Start the sidecar server.' 
      } as BridgeResponse
    }
    return bridge.pulse(path)
  }, [isConnected])

  const terminal = useCallback(async (path: string) => {
    if (!isConnected) {
      window.location.href = createDeepLink('terminal', path)
      return { success: true, data: { message: 'Deep link triggered' } } as BridgeResponse
    }
    return bridge.terminal(path)
  }, [isConnected])

  return {
    isConnected,
    isChecking,
    launch,
    pulse,
    terminal,
    openFinder: bridge.openFinder.bind(bridge),
  }
}
