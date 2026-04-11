import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set([
  'ncert.nic.in',
  'www.math.umd.edu',
  'math.umd.edu',
  'www.math.toronto.edu',
  'math.toronto.edu',
  'nta.ac.in',
  'web.stanford.edu',
  'courses.cs.vt.edu',
  'cseweb.ucsd.edu',
  'acg.cis.upenn.edu',
  'www.cs.toronto.edu',
  'arxiv.org',
  'export.arxiv.org',
])

function isAllowedPdfUrl(url: URL): boolean {
  if (url.protocol !== 'https:') {
    return false
  }

  if (ALLOWED_HOSTS.has(url.hostname)) {
    return true
  }

  return (
    url.hostname.endsWith('.edu') ||
    url.hostname.endsWith('.ac.in') ||
    url.hostname.endsWith('arxiv.org')
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = (searchParams.get('url') || '').trim()
  const rangeHeader = request.headers.get('range') || request.headers.get('Range') || ''

  if (!targetUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (!isAllowedPdfUrl(parsedUrl)) {
    return NextResponse.json({ error: 'url is not allowed' }, { status: 400 })
  }

  try {
    const upstreamResponse = await fetch(parsedUrl.toString(), {
      headers: {
        Accept: 'application/pdf,*/*',
      },
      cache: 'no-store',
    })

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: 'failed to fetch pdf',
          status: upstreamResponse.status,
        },
        { status: 502 }
      )
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'application/pdf'
    const bytes = await upstreamResponse.arrayBuffer()
    const totalLength = bytes.byteLength

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/i)
      if (match) {
        const start = match[1] ? Number.parseInt(match[1], 10) : 0
        const end = match[2] ? Number.parseInt(match[2], 10) : totalLength - 1

        if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && end >= start && start < totalLength) {
          const boundedEnd = Math.min(end, totalLength - 1)
          const partialBytes = bytes.slice(start, boundedEnd + 1)

          return new NextResponse(partialBytes, {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Content-Length': String(partialBytes.byteLength),
              'Content-Range': `bytes ${start}-${boundedEnd}/${totalLength}`,
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'no-store',
              'Content-Disposition': 'inline',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        }
      }
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('PDF proxy error:', error)
    return NextResponse.json(
      {
        error: 'pdf proxy unavailable',
      },
      { status: 502 }
    )
  }
}