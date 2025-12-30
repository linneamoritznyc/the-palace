import { NextResponse } from 'next/server'
import { localProjects } from '@/lib/registry'
import { WebSocket } from 'ws'
import * as path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import mammoth from 'mammoth'

export const runtime = 'nodejs'

type BridgeRequest = {
  id: string
  token: string
  type: 'READ_README'
  path: string
}

type BridgeResponse = {
  id: string
  ok: boolean
  data?: {
    readmePath: string
    mtimeMs: number
    wordCount: number
    snippet: string
  }
  error?: string
}

type ProjectAnalysis = {
  projectId: string
  projectName: string
  absolutePath: string
  source: 'vibe_docs' | 'readme'
  sourceMtimeMs: number
  executiveSummary: string
  primaryTechStack: string
  updatedAt: string
}

type CacheFile = {
  version: 1
  projects: Record<string, ProjectAnalysis>
}

const BRIDGE_URL = 'ws://127.0.0.1:8080'
const BRIDGE_TOKEN = 'palace_secret_123'

const CACHE_DIR = path.join(process.cwd(), '.palace')
const CACHE_PATH = path.join(CACHE_DIR, 'analysis-cache.json')

const VIBE_DOCS_ROOT = '/Users/bashar/Desktop/Vibe Coding'

async function readCache(): Promise<CacheFile> {
  if (!existsSync(CACHE_PATH)) return { version: 1, projects: {} }
  try {
    const raw = await readFile(CACHE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as CacheFile
    if (!parsed || parsed.version !== 1 || !parsed.projects) return { version: 1, projects: {} }
    return parsed
  } catch {
    return { version: 1, projects: {} }
  }
}

async function writeCache(cache: CacheFile) {
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8')
}

async function listDocxFilesRecursive(rootDir: string, limit: number): Promise<string[]> {
  const out: string[] = []
  const queue: string[] = [rootDir]

  while (queue.length > 0 && out.length < limit) {
    const dir = queue.shift()!
    let entries: any[]
    try {
      entries = await (await import('fs/promises')).readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (out.length >= limit) break

      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        queue.push(full)
        continue
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx')) {
        out.push(full)
      }
    }
  }

  return out
}

function getVibeDocsFolderForProject(projectId: string, projectName: string): string | null {
  const key = `${projectId} ${projectName}`.toLowerCase()

  if (key.includes('nordiqflow')) {
    return path.join(VIBE_DOCS_ROOT, 'NORDIQFLOW')
  }
  if (key.includes('anti') && key.includes('apathy')) {
    return path.join(VIBE_DOCS_ROOT, 'JOB HUNT VIBE CODING', 'Anti Apathy Job Portal')
  }
  if (key.includes('curatorial') || key.includes('framework')) {
    return path.join(VIBE_DOCS_ROOT, 'ART VIBE CODING', 'Curatorial Framework Analysis Coefficient')
  }
  if (key.includes('palace')) {
    return path.join(VIBE_DOCS_ROOT, 'The PALACE - Mental Hub for all my projects')
  }

  return null
}

async function extractDocxText(docxPath: string): Promise<{ text: string; mtimeMs: number }> {
  const stat = (await import('fs/promises')).stat
  const s = await stat(docxPath)
  const result = await mammoth.extractRawText({ path: docxPath })
  return { text: String(result.value || ''), mtimeMs: s.mtimeMs }
}

function toFirstNWords(raw: string, wordLimit: number) {
  const words = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  return {
    snippet: words.slice(0, wordLimit).join(' '),
    wordCount: words.length,
  }
}

async function bridgeReadReadme(projectPath: string) {
  const id = crypto.randomUUID()
  const payload: BridgeRequest = {
    id,
    token: BRIDGE_TOKEN,
    type: 'READ_README',
    path: projectPath,
  }

  return new Promise<BridgeResponse>((resolve, reject) => {
    const ws = new WebSocket(BRIDGE_URL)

    const timeout = setTimeout(() => {
      try { ws.close() } catch {}
      reject(new Error('Bridge timeout'))
    }, 8000)

    ws.on('open', () => {
      ws.send(JSON.stringify(payload))
    })

    ws.on('message', (data) => {
      try {
        const res = JSON.parse(data.toString()) as BridgeResponse
        if (res.id === id) {
          clearTimeout(timeout)
          ws.close()
          resolve(res)
        }
      } catch {
        // ignore
      }
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

async function analyzeWithAnthropic(readmeSnippet: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY in .env.local')
  }

  const prompt = `You are an executive assistant. Given README text, return ONLY valid JSON with keys: executiveSummary (one sentence), primaryTechStack (short badge like Next.js, Python, React, Supabase, etc).\n\nREADME:\n${readmeSnippet}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic error: ${res.status} ${text}`)
  }

  const json = await res.json() as any
  const text = json?.content?.[0]?.text
  if (!text || typeof text !== 'string') throw new Error('Anthropic response missing text')

  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Anthropic did not return valid JSON')
  }

  if (!parsed.executiveSummary || !parsed.primaryTechStack) {
    throw new Error('Anthropic JSON missing required keys')
  }

  return {
    executiveSummary: String(parsed.executiveSummary),
    primaryTechStack: String(parsed.primaryTechStack),
  }
}

export async function GET() {
  const cache = await readCache()

  const results: ProjectAnalysis[] = []

  for (const p of localProjects) {
    const cached = cache.projects[p.id]

    // Prefer Vibe Coding docs when we can map them.
    let source: 'vibe_docs' | 'readme' = 'readme'
    let sourceMtimeMs = 0
    let snippet = ''

    const vibeFolder = getVibeDocsFolderForProject(p.id, p.projectName)
    if (vibeFolder && existsSync(vibeFolder)) {
      const candidates = await listDocxFilesRecursive(vibeFolder, 12)
      if (candidates.length > 0) {
        // Take newest docs first
        const withStats: Array<{ p: string; m: number }> = []
        for (const fp of candidates) {
          try {
            const { mtimeMs } = await extractDocxText(fp)
            withStats.push({ p: fp, m: mtimeMs })
          } catch {
            // ignore
          }
        }

        withStats.sort((a, b) => b.m - a.m)
        const top = withStats.slice(0, 3)
        const texts: string[] = []
        sourceMtimeMs = top.reduce((acc, x) => Math.max(acc, x.m), 0)

        for (const d of top) {
          try {
            const extracted = await mammoth.extractRawText({ path: d.p })
            texts.push(String(extracted.value || ''))
          } catch {
            // ignore
          }
        }

        const combined = texts.join('\n\n')
        const cut = toFirstNWords(combined, 500)
        snippet = cut.snippet
        source = 'vibe_docs'
      }
    }

    // Fallback to README via the local bridge.
    if (!snippet) {
      let bridgeRes: BridgeResponse
      try {
        bridgeRes = await bridgeReadReadme(p.absolutePath)
      } catch {
        continue
      }

      if (!bridgeRes.ok || !bridgeRes.data) continue

      snippet = bridgeRes.data.snippet
      sourceMtimeMs = bridgeRes.data.mtimeMs
      source = 'readme'
    }

    if (cached && cached.source === source && cached.sourceMtimeMs === sourceMtimeMs) {
      results.push(cached)
      continue
    }

    let ai: { executiveSummary: string; primaryTechStack: string }
    try {
      ai = await analyzeWithAnthropic(snippet)
    } catch {
      // If we can't call Anthropic, don't fail the route. Return cached if present.
      // Otherwise return a minimal placeholder so UI can still render.
      if (cached) {
        results.push(cached)
        continue
      }
      ai = {
        executiveSummary: 'AI summary unavailable (missing ANTHROPIC_API_KEY or offline).',
        primaryTechStack: 'Unknown',
      }
    }

    const analysis: ProjectAnalysis = {
      projectId: p.id,
      projectName: p.projectName,
      absolutePath: p.absolutePath,
      source,
      sourceMtimeMs,
      executiveSummary: ai.executiveSummary,
      primaryTechStack: ai.primaryTechStack,
      updatedAt: new Date().toISOString(),
    }

    cache.projects[p.id] = analysis
    results.push(analysis)
  }

  await writeCache(cache)

  return NextResponse.json({
    success: true,
    count: results.length,
    projects: results,
  })
}
