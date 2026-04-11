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

  const pdfType = resource.type
  const pdfUrl = `/api/resource-pdf?topic=${encodeURIComponent(topic)}&type=${pdfType}&disposition=inline`
  const sourceUrl = resource.previewUrl

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${resource.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #fff; color: #111; }
          .wrap { height: 100vh; display: flex; flex-direction: column; }
          .head { padding: 14px 16px; border-bottom: 1px solid #e5e7eb; }
          .title { margin: 0; font-size: 18px; font-weight: 700; }
          .meta { margin-top: 6px; color: #4b5563; font-size: 13px; }
          .actions { margin-top: 10px; }
          .link { color: #1d4ed8; text-decoration: none; font-size: 13px; }
          .viewer { flex: 1; width: 100%; border: 0; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="head">
            <h1 class="title">${resource.title}</h1>
            <div class="meta">${resource.source} - ${resource.description}</div>
            <div class="actions">
              <a class="link" href="${sourceUrl}" target="_blank" rel="noopener noreferrer">View original trusted source</a>
            </div>
          </div>
          <iframe class="viewer" src="${pdfUrl}"></iframe>
        </div>
      </body>
    </html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}