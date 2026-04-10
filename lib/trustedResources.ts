export type TrustedResourceType = 'practice-sheet' | 'previous-year-paper'

export type TrustedResource = {
  id: string
  type: TrustedResourceType
  title: string
  source: string
  description: string
  previewUrl: string
}

function createSearchUrl(query: string): string {
  return `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
}

export function getTrustedResources(topic: string): TrustedResource[] {
  const topicQuery = topic.trim() || 'mathematics'
  const topicSlug = encodeURIComponent(topicQuery)

  return [
    {
      id: 'ncert-practice',
      type: 'practice-sheet',
      title: `${topicQuery} Practice Sheet`,
      source: 'NCERT',
      description: 'Official curriculum-aligned practice material and exemplar-style exercises.',
      previewUrl: createSearchUrl(`site:ncert.nic.in ${topicSlug} exemplar practice pdf`),
    },
    {
      id: 'cbse-practice',
      type: 'practice-sheet',
      title: `${topicQuery} Practice Sheet`,
      source: 'CBSE Academic',
      description: 'Board-style worksheets and sample question practice from CBSE resources.',
      previewUrl: createSearchUrl(`site:cbseacademic.nic.in ${topicSlug} worksheet practice pdf`),
    },
    {
      id: 'nptel-practice',
      type: 'practice-sheet',
      title: `${topicQuery} Practice Sheet`,
      source: 'NPTEL',
      description: 'University-level learning material and structured practice from NPTEL.',
      previewUrl: createSearchUrl(`site:nptel.ac.in ${topicSlug} practice lecture`),
    },
    {
      id: 'cbse-pyp',
      type: 'previous-year-paper',
      title: `${topicQuery} Previous Year Questions`,
      source: 'CBSE Academic',
      description: 'Official board sample papers and previous-year-style questions.',
      previewUrl: createSearchUrl(`site:cbseacademic.nic.in ${topicSlug} sample paper previous year pdf`),
    },
    {
      id: 'nios-pyp',
      type: 'previous-year-paper',
      title: `${topicQuery} Previous Year Questions`,
      source: 'NIOS',
      description: 'Trusted question papers and exam-oriented practice material from NIOS.',
      previewUrl: createSearchUrl(`site:nios.ac.in ${topicSlug} question paper pdf`),
    },
  ]
}

export function getTrustedResourceById(topic: string, id: string): TrustedResource | null {
  return getTrustedResources(topic).find((resource) => resource.id === id) || null
}