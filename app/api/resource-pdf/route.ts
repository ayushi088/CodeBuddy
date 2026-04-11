import { NextRequest, NextResponse } from 'next/server'

type ResourceType = 'practice-sheet' | 'previous-year-paper'

type TrustedResource = {
  title: string
  source: string
  url: string
  note: string
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function buildPdfContent(lines: string[]): Uint8Array {
  const objects: string[] = []

  // 1: Catalog
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')

  // 2: Pages
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')

  // 3: Page
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>')

  // 4: Font
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  // 5: Stream with text
  const safeLines = lines.slice(0, 35)
  let y = 800
  const textCommands = ['BT', '/F1 12 Tf', '50 800 Td']

  safeLines.forEach((line, index) => {
    const escaped = escapePdfText(line)
    if (index === 0) {
      textCommands.push(`(${escaped}) Tj`)
    } else {
      y -= 20
      textCommands.push(`1 0 0 1 50 ${y} Tm`)
      textCommands.push(`(${escaped}) Tj`)
    }
  })

  textCommands.push('ET')
  const streamBody = textCommands.join('\n')
  objects.push(`<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream`)

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }

  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return new TextEncoder().encode(pdf)
}

function sanitizeFileNamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'topic'
}

  function getTrustedResources(topic: string, type: ResourceType): TrustedResource[] {
    const topicSlug = encodeURIComponent(topic)

    if (type === 'previous-year-paper') {
      return [
        {
          title: `${topic} previous year paper - CBSE sample paper search`,
          source: 'CBSE Academic',
          url: `https://www.google.com/search?q=site%3Acbseacademic.nic.in+${topicSlug}+sample+paper+pdf`,
          note: 'Official board-linked sample and previous paper references.',
        },
        {
          title: `${topic} previous year paper - NCERT exemplar`,
          source: 'NCERT',
          url: `https://www.google.com/search?q=site%3Ancert.nic.in+${topicSlug}+exemplar+pdf`,
          note: 'Trusted foundation-level exercise references from NCERT.',
        },
        {
          title: `${topic} previous year paper - NIOS resources`,
          source: 'NIOS',
          url: `https://www.google.com/search?q=site%3Anios.ac.in+${topicSlug}+question+paper+pdf`,
          note: 'Official open school question paper archive.',
        },
        {
          title: `${topic} previous year paper - Khan Academy practice`,
          source: 'Khan Academy',
          url: `https://www.khanacademy.org/search?page_search_query=${topicSlug}`,
          note: 'Trusted topic-aligned practice and review material.',
        },
      ]
    }

    return [
      {
        title: `${topic} practice sheet - NCERT exemplar`,
        source: 'NCERT',
        url: `https://www.google.com/search?q=site%3Ancert.nic.in+${topicSlug}+exemplar+pdf`,
        note: 'Structured practice from the official curriculum body.',
      },
      {
        title: `${topic} practice sheet - CBSE sample questions`,
        source: 'CBSE Academic',
        url: `https://www.google.com/search?q=site%3Acbseacademic.nic.in+${topicSlug}+worksheet+pdf`,
        note: 'Official board-aligned worksheets and sample questions.',
      },
      {
        title: `${topic} practice sheet - NPTEL learning material`,
        source: 'NPTEL',
        url: `https://nptel.ac.in/search?query=${topicSlug}`,
        note: 'Trusted higher-education learning resources.',
      },
      {
        title: `${topic} practice sheet - Khan Academy exercises`,
        source: 'Khan Academy',
        url: `https://www.khanacademy.org/search?page_search_query=${topicSlug}`,
        note: 'Practice-focused exercises from a reputable education platform.',
      },
    ]
}

function buildTrustedPdfLines(topic: string, type: ResourceType, selectedSource?: string): string[] {
  const resources = getTrustedResources(topic, type)
  const trustedSources = selectedSource || resources.map((resource) => resource.source).join(', ')

  if (type === 'previous-year-paper') {
    return [
      `${topic.toUpperCase()} - PREVIOUS YEAR QUESTION SET`,
      `Reference Sources: ${trustedSources}`,
      '',
      'SECTION A (Concept Checks)',
      `1. Define ${topic} and list two core properties.`,
      `2. Explain one common misconception in ${topic}.`,
      '',
      'SECTION B (Application)',
      `3. Solve one exam-style problem based on ${topic} with full steps.`,
      `4. Compare two approaches used in ${topic} and justify the better one.`,
      '',
      'SECTION C (Higher Order)',
      `5. Create and solve a mixed-concept question involving ${topic}.`,
      `6. Analyze where students usually lose marks in ${topic} questions.`,
      '',
      'Instructions: Show complete steps and reasoning for every answer.',
      'Prepared from trusted educational source patterns for exam readiness.',
    ]
  }

  return [
    `${topic.toUpperCase()} - PRACTICE SHEET`,
    `Reference Sources: ${trustedSources}`,
    '',
    'PART 1 (Fundamentals)',
    `1. Write key definitions and formulas used in ${topic}.`,
    `2. Solve two short concept questions on ${topic}.`,
    '',
    'PART 2 (Problem Solving)',
    `3. Solve three standard problems from ${topic}.`,
    `4. Solve one case-based question and explain each step.`,
    '',
    'PART 3 (Revision)',
    `5. Write a quick checklist to revise ${topic} in 10 minutes.`,
    `6. List two mistakes to avoid while solving ${topic} problems.`,
    '',
    'Use this sheet for self-practice and timed revision.',
  ]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const topic = (searchParams.get('topic') || '').trim()
  const typeParam = searchParams.get('type') || 'practice-sheet'
  const dispositionParam = (searchParams.get('disposition') || 'inline').toLowerCase()
  const sourceParam = (searchParams.get('source') || '').trim()

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  if (typeParam !== 'practice-sheet' && typeParam !== 'previous-year-paper') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }

  const type = typeParam as ResourceType
  const lines = buildTrustedPdfLines(topic, type, sourceParam || undefined)
  const pdfBytes = buildPdfContent(lines)

  const safeTopic = sanitizeFileNamePart(topic)
  const fileName = `${type}-${safeTopic}.pdf`
  const contentDisposition = dispositionParam === 'attachment'
    ? `attachment; filename="${fileName}"`
    : `inline; filename="${fileName}"`

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'no-store',
    },
  })
}
