import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type ShopifyProduct = {
  id: number
  title: string
  handle: string
  body_html?: string
  tags?: string
  variants?: Array<{ price?: string; inventory_quantity?: number }>
  images?: Array<{ src?: string; position?: number }>
}

function parseTags(tags: unknown): string[] {
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  }
  return []
}

function isPainting(product: ShopifyProduct): { ok: boolean; price: number } {
  const price = Number(product.variants?.[0]?.price || 0)
  if (!Number.isFinite(price)) return { ok: false, price: 0 }

  // Primary filter: originals are >= 1000 SEK
  if (price < 1000) return { ok: false, price }

  // Secondary filter: exclude prints/frames
  const tagsLower = parseTags(product.tags).map(t => t.toLowerCase())
  if (tagsLower.some(t => t.includes('tryck') || t.includes('print'))) return { ok: false, price }

  return { ok: true, price }
}

async function fetchAllProducts(domain: string, apiVersion: string, token: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = []

  let url = `https://${domain}/admin/api/${apiVersion}/products.json?limit=250`

  while (url) {
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Shopify error: ${res.status} ${text}`)
    }

    const json = (await res.json()) as { products?: ShopifyProduct[] }
    all.push(...(json.products || []))

    // Pagination via Link header
    const link = res.headers.get('link') || ''
    const nextMatch = link.match(/<([^>]+)>;\s*rel="next"/i)
    url = nextMatch?.[1] || ''
  }

  return all
}

export async function GET() {
  const domain = process.env.SHOPIFY_DOMAIN || 'xrnear-01.myshopify.com'
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-01'
  const token = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing SHOPIFY_ADMIN_TOKEN (or SHOPIFY_ADMIN_API_ACCESS_TOKEN) in .env.local' },
      { status: 500 }
    )
  }

  try {
    const products = await fetchAllProducts(domain, apiVersion, token)

    const paintings = products
      .map(p => ({ product: p, meta: isPainting(p) }))
      .filter(x => x.meta.ok)
      .sort((a, b) => b.meta.price - a.meta.price)
      .slice(0, 3)
      .map(({ product, meta }) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        priceSEK: meta.price,
        inventoryQuantity: Number(product.variants?.[0]?.inventory_quantity || 0),
        isSold: Number(product.variants?.[0]?.inventory_quantity || 0) === 0,
        image: product.images?.[0]?.src || null,
        tags: parseTags(product.tags),
      }))

    return NextResponse.json({
      success: true,
      domain,
      apiVersion,
      count: paintings.length,
      paintings,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
