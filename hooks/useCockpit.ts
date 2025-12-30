'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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

const WS_URL = 'ws://localhost:8080'
const AUTH_TOKEN = 'palace_secret_123'

export function useCockpit() {
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef(new Map<string, (res: CockpitResponse) => void>())

  const [isLocalConnected, setIsLocalConnected] = useState(false)

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setIsLocalConnected(true)

    ws.onclose = () => {
      setIsLocalConnected(false)
      wsRef.current = null
      pendingRef.current.clear()
    }

    ws.onerror = () => {
      setIsLocalConnected(false)
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(String(evt.data)) as CockpitResponse
        const resolver = pendingRef.current.get(msg.id)
        if (resolver) {
          pendingRef.current.delete(msg.id)
          resolver(msg)
        }
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
      pendingRef.current.clear()
    }
  }, [connect])

  const sendCommand = useCallback(async (type: CommandType, path: string) => {
    connect()

    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('Local bridge not connected')
    }

    const id = crypto.randomUUID()
    const payload: CockpitRequest = { id, token: AUTH_TOKEN, type, path }

    const response = await new Promise<CockpitResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingRef.current.delete(id)
        reject(new Error('Command timeout'))
      }, 8000)

      pendingRef.current.set(id, (res) => {
        clearTimeout(timeout)
        resolve(res)
      })

      ws.send(JSON.stringify(payload))
    })

    if (!response.ok) {
      throw new Error(response.error || 'Command failed')
    }

    return response
  }, [connect])

  return useMemo(() => ({
    isLocalConnected,
    sendCommand,
  }), [isLocalConnected, sendCommand])
}
