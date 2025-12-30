import { NextResponse } from 'next/server'
import * as path from 'path'
import { existsSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import mammoth from 'mammoth'

export const runtime = 'nodejs'

const VIBE_DOCS_ROOT = '/Users/bashar/Desktop/Vibe Coding'

type Hit = {
  file: string
  matches: string[]
}

async function listDocxFilesRecursive(rootDir: string, limit: number): Promise<string[]> {
  const out: string[] = []
  const queue: string[] = [rootDir]

  while (queue.length > 0 && out.length < limit) {
    const dir = queue.shift()!
    let entries: any[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
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

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

export async function GET() {
  if (!existsSync(VIBE_DOCS_ROOT)) {
    return NextResponse.json({ success: false, error: 'Vibe Coding folder not found', root: VIBE_DOCS_ROOT }, { status: 404 })
  }

  const files = await listDocxFilesRecursive(VIBE_DOCS_ROOT, 80)

  const domains: string[] = []
  const collectionHandles: string[] = []
  const tags: string[] = []
  const hits: Hit[] = []

  const domainRe = /([a-z0-9-]+\.myshopify\.com)/gi
  const collectionRe = /collections\/(?:all\/)?([a-z0-9-]+)/gi
  const tagRe = /tag(?:s)?\s*[:=]\s*([a-z0-9-_ ,]+)/gi

  for (const f of files) {
    let text = ''
    try {
      const extracted = await mammoth.extractRawText({ path: f })
      text = String(extracted.value || '')
    } catch {
      continue
    }

    const fileMatches: string[] = []

    for (const m of text.matchAll(domainRe)) {
      if (m[1]) {
        domains.push(m[1].toLowerCase())
        fileMatches.push(m[1])
      }
    }

    for (const m of text.matchAll(collectionRe)) {
      if (m[1]) {
        collectionHandles.push(m[1].toLowerCase())
        fileMatches.push(`collections/${m[1]}`)
      }
    }

    for (const m of text.matchAll(tagRe)) {
      if (m[1]) {
        const parts = m[1]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        tags.push(...parts)
        fileMatches.push(`tags:${parts.join(',')}`)
      }
    }

    if (fileMatches.length > 0) {
      hits.push({ file: f, matches: unique(fileMatches).slice(0, 20) })
    }
  }

  // Pick a likely domain (most frequent)
  const counts: Record<string, number> = {}
  for (const d of domains) counts[d] = (counts[d] || 0) + 1
  const guessedDomain = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return NextResponse.json({
    success: true,
    scannedDocx: files.length,
    guessedDomain,
    domains: unique(domains),
    collectionHandles: unique(collectionHandles),
    tags: unique(tags),
    hits: hits.slice(0, 25),
  })
}
