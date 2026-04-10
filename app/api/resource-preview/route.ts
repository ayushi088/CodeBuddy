import { NextRequest, NextResponse } from 'next/server'
import { getTrustedResourceById } from '@/lib/trustedResources'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topic = (searchParams.get('topic') || '').trim() || 'mathematics'
  const id = (searchParams.get('id') || '').trim()

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const resource = getTrustedResourceById(topic, id)

  if (!resource) {
    return NextResponse.json({ error: 'resource not found' }, { status: 404 })
  }

  try {
    const response = await fetch(resource.previewUrl, {
      headers: {
        Accept: 'text/html,application/pdf;q=0.9,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Upstream preview fetch failed: ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8'

    if (contentType.includes('application/pdf')) {
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Cache-Control': 'no-store',
        },
      })
    }

    const html = await response.text()
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const fallbackHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${resource.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #fff; color: #111; }
            .card { max-width: 900px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
            h1 { margin: 0 0 12px; font-size: 24px; }
            .meta { color: #4b5563; margin-bottom: 16px; }
            .error { background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${resource.title}</h1>
            <div class="meta">${resource.source} • ${resource.description}</div>
            <div class="error">Preview temporarily unavailable for this trusted resource.</div>
          </div>
        </body>
      </html>`

    return new NextResponse(fallbackHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }
}