import { HfInference } from '@huggingface/inference'

/**
 * Recommendation Strategy Types
 */
export type RecommendationStrategy = 'easy' | 'practice' | 'video' | 'advanced'

/**
 * Video Result from YouTube
 */
export interface VideoResult {
  id: string
  title: string
  link: string
  thumbnail?: string
  channelTitle?: string
  duration?: string
}

/**
 * Resource Link
 */
export interface ResourceLink {
  type: 'practice-sheet' | 'previous-year-paper'
  title: string
  source: string
  description: string
  link: string
}

/**
 * User Data for Recommendation
 */
export interface UserData {
  focusScore: number
  emotion: string
  weakTopic: string
  quizScore: number
  difficulty?: string
}

/**
 * Final Recommendation Result
 */
export interface RecommendationResult {
  strategy: RecommendationStrategy
  strategyMessage: string
  videos: VideoResult[]
  links: ResourceLink[]
  notes: string
  generatedAt: string
}

const MIN_VIDEO_DURATION_SECONDS = 30 * 60
const DEFAULT_VIDEO_COUNT = 8
const MIN_RELEVANCE_SCORE = 1
const MATH_KEYWORDS = [
  'math',
  'mathematics',
  'algebra',
  'geometry',
  'trigonometry',
  'calculus',
  'probability',
  'statistics',
  'set',
  'sets',
]
const PROGRAMMING_KEYWORDS = [
  'dsa',
  'data structure',
  'coding',
  'programming',
  'c++',
  'java',
  'python',
  'javascript',
]
const GENERIC_TOPIC_TOKENS = [
  'math',
  'mathematics',
  'lecture',
  'tutorial',
  'course',
  'subject',
]

/**
 * Rule Engine: Determine strategy based on user data
 */
function determineStrategy(userData: UserData): {
  strategy: RecommendationStrategy
  message: string
} {
  const { focusScore, emotion, quizScore } = userData

  if (focusScore < 50) {
    return {
      strategy: 'easy',
      message: '📚 Focus level is low. Starting with easy-to-digest content.',
    }
  }

  if (quizScore < 40) {
    return {
      strategy: 'practice',
      message: '✏️ Quiz score needs improvement. Fetching practice questions.',
    }
  }

  if (emotion === 'bored' || emotion === 'disengaged') {
    return {
      strategy: 'video',
      message: '🎬 You seem bored. Here are engaging video tutorials.',
    }
  }

  return {
    strategy: 'advanced',
    message: '🚀 You\'re ready for advanced content. Let\'s dig deeper!',
  }
}

/**
 * YouTube Video Fetcher using YouTube Data API v3
 */
async function fetchYouTubeVideos(
  topic: string,
  maxResults: number = DEFAULT_VIDEO_COUNT
): Promise<VideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY

  if (!apiKey) {
    console.warn('YouTube API key not configured, using public search fallback')
    return fetchYouTubeVideosWithoutApi(topic, maxResults)
  }

  try {
    const expandedMax = Math.min(Math.max(maxResults * 2, 12), 25)
    const combinedQuery = buildTopicAwareQuery(topic)
    const topicTokens = tokenizeTopic(topic)
    const requiredRelevanceScore = getRequiredRelevanceScore(topicTokens)

    const allIds = await searchYouTubeVideoIds(apiKey, combinedQuery, expandedMax)
    if (allIds.length === 0) {
      return fetchYouTubeVideosWithoutApi(topic, maxResults)
    }

    const detailedVideos = await fetchYouTubeVideoDetails(apiKey, allIds)

    const eligibleVideos = detailedVideos
      .filter((video) => {
        const durationSeconds = parseDurationToSeconds(video.duration)
        return durationSeconds >= MIN_VIDEO_DURATION_SECONDS
      })
      .filter((video) => !isDomainMismatch(video, topic))

    const topicMatchedVideos = eligibleVideos.filter((video) => {
      const relevanceScore = getTopicRelevanceScore(video, topicTokens)
      return relevanceScore >= requiredRelevanceScore
    })

    const rankingPool = topicMatchedVideos.length > 0 ? topicMatchedVideos : []
    
    if (rankingPool.length === 0) {
      return fetchYouTubeVideosWithoutApi(topic, maxResults)
    }

    const rankedVideos = rankingPool
      .sort((a, b) => rankVideoForTopic(b, topicTokens) - rankVideoForTopic(a, topicTokens))
      .map(({ relevanceText, viewCount, likeCount, title, channelTitle, ...video }) => ({
        ...video,
        title,
        channelTitle,
      }))

    if (rankedVideos.length === 0) {
      return fetchYouTubeVideosWithoutApi(topic, maxResults)
    }

    return rankedVideos.slice(0, maxResults)
  } catch (error) {
    console.error('Error fetching YouTube videos:', error)
    return fetchYouTubeVideosWithoutApi(topic, maxResults)
  }
}

async function fetchYouTubeVideosWithoutApi(
  topic: string,
  maxResults: number
): Promise<VideoResult[]> {
  const query = buildTopicAwareQuery(topic)
  const topicTokens = tokenizeTopic(topic)
  const requiredRelevanceScore = getRequiredRelevanceScore(topicTokens)

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    const idMatches = Array.from(html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g))
    const uniqueIds: string[] = []

    for (const match of idMatches) {
      const id = match[1]
      if (!uniqueIds.includes(id)) {
        uniqueIds.push(id)
      }
      if (uniqueIds.length >= maxResults * 4) {
        break
      }
    }

    if (uniqueIds.length === 0) {
      return []
    }

    const metadataResults = await Promise.allSettled(
      uniqueIds.map((id) => fetchYouTubeOEmbed(id))
    )

    const candidates = metadataResults
      .filter((result): result is PromiseFulfilledResult<{ id: string; title: string; channelTitle: string } | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((video): video is { id: string; title: string; channelTitle: string } => Boolean(video))
      .map((video) => ({
        id: video.id,
        title: video.title,
        link: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        channelTitle: video.channelTitle,
      }))

    const filtered = candidates
      .filter((video) => {
        const relevanceText = `${video.title} ${video.channelTitle || ''}`.toLowerCase()
        const relevanceScore = getTopicRelevanceScore(
          { ...video, relevanceText },
          topicTokens
        )
        return relevanceScore >= requiredRelevanceScore
      })
      .filter((video) =>
        !isDomainMismatch(
          { ...video, relevanceText: `${video.title} ${video.channelTitle || ''}`.toLowerCase() },
          topic
        )
      )

    return filtered.slice(0, maxResults)
  } catch (error) {
    console.error('Error in no-API YouTube fallback:', error)
    return []
  }
}

async function fetchYouTubeOEmbed(
  videoId: string
): Promise<{ id: string; title: string; channelTitle: string } | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const title = typeof data.title === 'string' ? data.title : ''
    const channelTitle = typeof data.author_name === 'string' ? data.author_name : ''

    if (!title) {
      return null
    }

    return {
      id: videoId,
      title,
      channelTitle,
    }
  } catch {
    return null
  }
}

async function searchYouTubeVideoIds(
  apiKey: string,
  query: string,
  maxResults: number
): Promise<string[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.append('key', apiKey)
  url.searchParams.append('q', query)
  url.searchParams.append('part', 'snippet')
  url.searchParams.append('maxResults', maxResults.toString())
  url.searchParams.append('type', 'video')
  url.searchParams.append('order', 'relevance')
  url.searchParams.append('videoDuration', 'long')
  url.searchParams.append('relevanceLanguage', 'en')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return (data.items || [])
    .map((item: any) => item?.id?.videoId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
}

async function fetchYouTubeVideoDetails(
  apiKey: string,
  videoIds: string[]
): Promise<Array<VideoResult & { relevanceText: string; viewCount: number; likeCount: number }>> {
  const chunkSize = 50
  const allResults: Array<VideoResult & { relevanceText: string; viewCount: number; likeCount: number }> = []

  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize)
    if (chunk.length === 0) continue

    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.append('key', apiKey)
    url.searchParams.append('id', chunk.join(','))
    url.searchParams.append('part', 'snippet,contentDetails,statistics')
    url.searchParams.append('maxResults', chunk.length.toString())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      continue
    }

    const data = await response.json()
    const mapped: Array<VideoResult & { relevanceText: string; viewCount: number; likeCount: number }> = (data.items || []).map((item: any) => {
      const rawDuration = item?.contentDetails?.duration
      const durationSeconds = parseDurationToSeconds(rawDuration)
      const title = item?.snippet?.title || 'YouTube Video'
      const description = item?.snippet?.description || ''
      const viewCount = Number(item?.statistics?.viewCount || 0)
      const likeCount = Number(item?.statistics?.likeCount || 0)

      return {
        id: item.id,
        title,
        link: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnail: item?.snippet?.thumbnails?.medium?.url,
        channelTitle: item?.snippet?.channelTitle,
        duration: formatDuration(durationSeconds),
        relevanceText: `${title} ${description}`.toLowerCase(),
        viewCount,
        likeCount,
      }
    })

    allResults.push(...mapped)
  }

  const deduped = new Map<string, VideoResult & { relevanceText: string; viewCount: number; likeCount: number }>()
  for (const video of allResults) {
    if (!deduped.has(video.id)) {
      deduped.set(video.id, video)
    }
  }

  return Array.from(deduped.values())
}

function tokenizeTopic(topic: string): string[] {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'your', 'their'])
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token))
}

function getTopicRelevanceScore(
  video: VideoResult & { relevanceText: string },
  topicTokens: string[]
): number {
  if (topicTokens.length === 0) return 0

  let score = 0
  for (const token of topicTokens) {
    if (video.relevanceText.includes(token)) {
      score += 1
    }
  }

  return score
}

function parseDurationToSeconds(duration?: string): number {
  if (!duration) return 0

  if (duration.startsWith('PT')) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0

    const hours = Number(match[1] || 0)
    const minutes = Number(match[2] || 0)
    const seconds = Number(match[3] || 0)

    return hours * 3600 + minutes * 60 + seconds
  }

  const parts = duration.split(':').map((value) => Number(value))
  if (parts.some((part) => Number.isNaN(part))) {
    return 0
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  return 0
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'N/A'

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function rankVideoForTopic(
  video: VideoResult & { relevanceText: string; viewCount: number; likeCount: number },
  topicTokens: string[]
): number {
  const durationSeconds = parseDurationToSeconds(video.duration)
  const topicScore = getTopicRelevanceScore(video, topicTokens)

  return (
    topicScore * 200000 +
    Math.min(video.viewCount, 10000000) * 0.02 +
    Math.min(video.likeCount, 500000) * 0.2 +
    durationSeconds * 0.5
  )
}

function getRequiredRelevanceScore(topicTokens: string[]): number {
  const specificTokens = topicTokens.filter(
    (token) => !GENERIC_TOPIC_TOKENS.includes(token)
  )

  if (specificTokens.length <= 1) return MIN_RELEVANCE_SCORE
  return 2
}

function isMathTopic(topic: string): boolean {
  const normalizedTopic = topic.toLowerCase()
  return MATH_KEYWORDS.some((keyword) => normalizedTopic.includes(keyword))
}

function buildTopicAwareQuery(topic: string): string {
  const normalizedTopic = topic.toLowerCase()
  const isMathOnlyTopic = isMathTopic(topic) && !PROGRAMMING_KEYWORDS.some((keyword) => normalizedTopic.includes(keyword))

  if (isMathOnlyTopic) {
    return `${topic} mathematics full lecture -dsa -programming -coding -java -python -c++`
  }

  return `${topic} full lecture tutorial`
}

function isDomainMismatch(video: VideoResult & { relevanceText: string }, topic: string): boolean {
  const mathTopic = isMathTopic(topic)
  const normalizedText = video.relevanceText.toLowerCase()

  if (mathTopic) {
    return PROGRAMMING_KEYWORDS.some((keyword) => normalizedText.includes(keyword))
  }

  return false
}

/**
 * Mock YouTube videos for development
 */
function getMockYouTubeVideos(topic: string, maxResults: number = DEFAULT_VIDEO_COUNT): VideoResult[] {
  const mockVideos: VideoResult[] = [
    {
      id: 'video1',
      title: `${topic} Complete Course | Apna College Style Long Session`,
      link: `https://www.youtube.com/watch?v=video1`,
      thumbnail: 'https://placehold.co/640x360?text=Apna+College',
      channelTitle: 'Apna College',
      duration: '1:12:30',
    },
    {
      id: 'video2',
      title: `${topic} One Shot Revision + Concepts`,
      link: `https://www.youtube.com/watch?v=video2`,
      thumbnail: 'https://placehold.co/640x360?text=College+Wallah',
      channelTitle: 'College Wallah',
      duration: '58:40',
    },
    {
      id: 'video3',
      title: `${topic} Full Lecture Series - Part 1`,
      link: `https://www.youtube.com/watch?v=video3`,
      thumbnail: 'https://placehold.co/640x360?text=Physics+Wallah',
      channelTitle: 'Physics Wallah',
      duration: '45:10',
    },
    {
      id: 'video4',
      title: `${topic} Full Lecture Series - Part 2`,
      link: `https://www.youtube.com/watch?v=video4`,
      thumbnail: 'https://placehold.co/640x360?text=Gate+Smashers',
      channelTitle: 'Gate Smashers',
      duration: '39:50',
    },
    {
      id: 'video5',
      title: `${topic} Problem Solving Marathon`,
      link: `https://www.youtube.com/watch?v=video5`,
      thumbnail: 'https://placehold.co/640x360?text=NPTEL',
      channelTitle: 'NPTEL',
      duration: '1:05:20',
    },
    {
      id: 'video6',
      title: `${topic} Exam-Oriented Deep Dive`,
      link: `https://www.youtube.com/watch?v=video6`,
      thumbnail: 'https://placehold.co/640x360?text=Unacademy',
      channelTitle: 'Unacademy',
      duration: '52:15',
    },
  ]

  return mockVideos.slice(0, maxResults)
}

/**
 * Google Resource Links Generator
 */
async function generateResourceLinks(
  topic: string,
  _strategy: RecommendationStrategy
): Promise<ResourceLink[]> {
  const safeTopic = topic.trim() || 'mathematics'
  const normalizedTopic = safeTopic.toLowerCase()

  const multithreadingPracticeSheets: ResourceLink[] = [
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - Stanford CS110`,
      source: 'Stanford University',
      description: 'Lecture notes introducing multithreading, threads, and synchronization.',
      link: 'https://web.stanford.edu/class/cs110/lectures/cs110-win2122-lecture-13.pdf',
    },
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - Virginia Tech CS3214`,
      source: 'Virginia Tech',
      description: 'University lecture notes covering core multithreading concepts.',
      link: 'https://courses.cs.vt.edu/cs3214/spring2025/lecturesarb/intro_to_multithreading.pdf',
    },
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - UCSD Multithreading`,
      source: 'University of California, San Diego',
      description: 'Slides covering multiprocessors and multithreading concepts.',
      link: 'https://cseweb.ucsd.edu/classes/wi13/cse141-b/slides/10-Multithreading.pdf',
    },
  ]

  const multithreadingPreviousYearQuestions: ResourceLink[] = [
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - Stanford Threads and Mutexes`,
      source: 'Stanford University',
      description: 'Lecture material with thread coordination and mutex practice questions.',
      link: 'https://web.stanford.edu/class/cs110/lectures/cs110-win2122-lecture-14.pdf',
    },
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - University of Pennsylvania`,
      source: 'University of Pennsylvania',
      description: 'Multithreading lecture material with exam-style discussion of thread scheduling.',
      link: 'https://acg.cis.upenn.edu/milom/cis501-Fall08/lectures/10_multithreading.pdf',
    },
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - University of Toronto`,
      source: 'University of Toronto',
      description: 'Threads lecture notes focused on multithreaded programming concepts.',
      link: 'https://www.cs.toronto.edu/~hesam/Teaching/CSC207-Summer-2011/lectures/w11/Threads.pdf',
    },
  ]

  const setsPracticeSheets: ResourceLink[] = [
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - NCERT Exemplar`,
      source: 'NCERT',
      description: 'Official exemplar problems for Class XI Mathematics: Sets.',
      link: 'https://ncert.nic.in/pdf/publication/exemplarproblem/classXI/mathematics/keep201.pdf',
    },
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - University of Maryland`,
      source: 'University of Maryland',
      description: 'Trusted university notes on sets and proofs with direct topic coverage.',
      link: 'https://www.math.umd.edu/~immortal/CMSC250/notes/sets.pdf',
    },
    {
      type: 'practice-sheet',
      title: `${safeTopic} Practice Sheet - University of Toronto`,
      source: 'University of Toronto',
      description: 'Academic set theory notes suitable for practice and revision.',
      link: 'https://www.math.toronto.edu/weiss/set_theory.pdf',
    },
  ]

  const setsPreviousYearQuestions: ResourceLink[] = [
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - NTA Mathematics Core`,
      source: 'National Testing Agency',
      description: 'Question paper containing mathematics items related to sets.',
      link: 'https://nta.ac.in/Download/ExamPaper/Paper_20230320093216.pdf',
    },
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - NTA Paper`,
      source: 'National Testing Agency',
      description: 'Official exam paper with set-based mathematics questions.',
      link: 'https://nta.ac.in/Download/ExamPaper/Paper_20250530112357.pdf',
    },
    {
      type: 'previous-year-paper',
      title: `${safeTopic} Previous Year Questions - NTA Mathematics Section A`,
      source: 'National Testing Agency',
      description: 'Mathematics section paper with topic-relevant set questions.',
      link: 'https://nta.ac.in/Download/ExamPaper/Paper_20250728134957.pdf',
    },
  ]

  if (normalizedTopic.includes('multithread') || normalizedTopic.includes('thread') || normalizedTopic.includes('concurrency') || normalizedTopic.includes('parallel') || normalizedTopic.includes('mutex') || normalizedTopic.includes('deadlock') || normalizedTopic.includes('synchron')) {
    return [...multithreadingPracticeSheets, ...multithreadingPreviousYearQuestions]
  }

  if (normalizedTopic.includes('set')) {
    return [...setsPracticeSheets, ...setsPreviousYearQuestions]
  }

  return fetchDynamicTopicResources(safeTopic)
}

function isTrustedPdfHost(hostname: string): boolean {
  const host = hostname.toLowerCase()

  if (
    host.endsWith('.edu') ||
    host.endsWith('.ac.in') ||
    host === 'ncert.nic.in' ||
    host === 'nta.ac.in' ||
    host === 'arxiv.org' ||
    host === 'export.arxiv.org' ||
    host.endsWith('.nptel.ac.in') ||
    host === 'nptel.ac.in'
  ) {
    return true
  }

  return false
}

function parseDuckDuckGoPdfUrls(html: string): string[] {
  const candidates = new Set<string>()
  const matches = Array.from(html.matchAll(/uddg=([^&"']+)/g))

  for (const match of matches) {
    try {
      const decoded = decodeURIComponent(match[1])
      const url = new URL(decoded)
      const looksLikePdf = url.pathname.toLowerCase().endsWith('.pdf') || decoded.toLowerCase().includes('.pdf')

      if (url.protocol === 'https:' && looksLikePdf && isTrustedPdfHost(url.hostname)) {
        candidates.add(url.toString())
      }
    } catch {
      // Ignore malformed URLs from scraped HTML fragments.
    }
  }

  return Array.from(candidates)
}

function sourceNameFromUrl(pdfUrl: string): string {
  try {
    const host = new URL(pdfUrl).hostname.toLowerCase()
    if (host.includes('stanford')) return 'Stanford University'
    if (host.includes('mit.edu')) return 'MIT'
    if (host.includes('nptel')) return 'NPTEL'
    if (host.includes('ncert')) return 'NCERT'
    if (host.includes('nta.ac.in')) return 'National Testing Agency'
    if (host.includes('arxiv.org')) return 'arXiv'
    if (host.includes('toronto')) return 'University of Toronto'
    if (host.includes('umd.edu')) return 'University of Maryland'
    if (host.includes('washington.edu')) return 'University of Washington'
    if (host.includes('ucsd.edu')) return 'University of California, San Diego'
    if (host.includes('upenn.edu')) return 'University of Pennsylvania'
    if (host.includes('vt.edu')) return 'Virginia Tech'
    return host.replace(/^www\./, '')
  } catch {
    return 'Trusted Source'
  }
}

async function searchTrustedPdfs(query: string, limit: number): Promise<string[]> {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    return parseDuckDuckGoPdfUrls(html).slice(0, limit)
  } catch {
    return []
  }
}

async function fetchDynamicTopicResources(topic: string): Promise<ResourceLink[]> {
  const practiceQuery = `${topic} filetype:pdf lecture notes worksheet site:.edu OR site:.ac.in OR site:nptel.ac.in`
  const questionQuery = `${topic} filetype:pdf question paper assignment exam site:.edu OR site:.ac.in OR site:nta.ac.in OR site:nptel.ac.in`

  let [practicePdfUrls, questionPdfUrls] = await Promise.all([
    searchTrustedPdfs(practiceQuery, 3),
    searchTrustedPdfs(questionQuery, 3),
  ])

  if (practicePdfUrls.length === 0 && questionPdfUrls.length === 0) {
    const arxivPdfUrls = await fetchArxivPdfUrls(topic, 6)
    practicePdfUrls = arxivPdfUrls.slice(0, 3)
    questionPdfUrls = arxivPdfUrls.slice(3, 6)
  }

  if (questionPdfUrls.length === 0 && practicePdfUrls.length > 0) {
    questionPdfUrls = practicePdfUrls.slice(0, Math.min(2, practicePdfUrls.length))
  }

  if (practicePdfUrls.length === 0 && questionPdfUrls.length > 0) {
    practicePdfUrls = questionPdfUrls.slice(0, Math.min(2, questionPdfUrls.length))
  }

  const seenUrls = new Set<string>()
  practicePdfUrls = practicePdfUrls.filter((url) => {
    if (seenUrls.has(url)) return false
    seenUrls.add(url)
    return true
  })

  questionPdfUrls = questionPdfUrls.filter((url) => {
    if (seenUrls.has(url)) return false
    seenUrls.add(url)
    return true
  })

  const practiceLinks: ResourceLink[] = practicePdfUrls.map((pdfUrl, index) => ({
    type: 'practice-sheet',
    title: `${topic} Practice Sheet ${index + 1}`,
    source: sourceNameFromUrl(pdfUrl),
    description: `Trusted PDF practice material for ${topic}.`,
    link: pdfUrl,
  }))

  const previousYearLinks: ResourceLink[] = questionPdfUrls.map((pdfUrl, index) => ({
    type: 'previous-year-paper',
    title: `${topic} Previous Year Questions ${index + 1}`,
    source: sourceNameFromUrl(pdfUrl),
    description: `Trusted PDF question paper or assignment material for ${topic}.`,
    link: pdfUrl,
  }))

  return [...practiceLinks, ...previousYearLinks]
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractTagValue(entryXml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = entryXml.match(regex)
  if (!match?.[1]) {
    return ''
  }

  return decodeXmlEntities(stripHtmlTags(match[1]))
}

function tokenizeSimple(value: string): string[] {
  return (value.toLowerCase().match(/[a-z0-9]+/g) || []).filter((token) => token.length >= 3)
}

function scoreArxivEntryRelevance(topicTokens: string[], title: string, summary: string): number {
  const combined = `${title} ${summary}`.toLowerCase()
  let score = 0

  for (const token of topicTokens) {
    if (combined.includes(token)) {
      score += 1
    }
  }

  return score
}

async function fetchArxivPdfUrls(topic: string, limit: number): Promise<string[]> {
  try {
    const query = `all:${topic}`
    const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=${Math.max(limit * 3, 12)}`
    const response = await fetch(url, {
      headers: {
        Accept: 'application/atom+xml,text/xml',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const xml = await response.text()
    const entryMatches = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))
    const topicTokens = tokenizeSimple(topic)

    const ranked = entryMatches
      .map((match) => match[1])
      .map((entryXml) => {
        const id = extractTagValue(entryXml, 'id')
        const title = extractTagValue(entryXml, 'title')
        const summary = extractTagValue(entryXml, 'summary')

        if (!id) {
          return null
        }

        const absUrl = id.trim().replace('http://', 'https://')
        const pdfUrl = absUrl.replace('/abs/', '/pdf/') + '.pdf'
        const score = scoreArxivEntryRelevance(topicTokens, title, summary)

        return { pdfUrl, score }
      })
      .filter((entry): entry is { pdfUrl: string; score: number } => Boolean(entry))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)

    const unique = new Set<string>()
    const urls: string[] = []

    for (const entry of ranked) {
      if (!unique.has(entry.pdfUrl)) {
        unique.add(entry.pdfUrl)
        urls.push(entry.pdfUrl)
      }

      if (urls.length >= limit) {
        break
      }
    }

    return urls
  } catch {
    return []
  }
}

/**
 * LLM-Based Notes Generator using Hugging Face
 */
async function generateLLMNotes(
  topic: string,
  strategy: RecommendationStrategy
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY

  if (!apiKey) {
    console.warn('Hugging Face API key not configured, returning mock notes')
    return getMockNotes(topic, strategy)
  }

  try {
    const client = new HfInference(apiKey)

    const prompt = buildPromptForNotes(topic, strategy)

    const response = await client.chatCompletion({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    return response.choices[0]?.message?.content?.trim() || getMockNotes(topic, strategy)
  } catch (error) {
    console.error('Error generating LLM notes:', error)
    return getMockNotes(topic, strategy)
  }
}

/**
 * Build prompt for LLM note generation
 */
function buildPromptForNotes(
  topic: string,
  strategy: RecommendationStrategy
): string {
  let depthGuidance = 'beginner-friendly and structured'
  if (strategy === 'advanced') depthGuidance = 'advanced, exam-ready, and conceptually deep'
  if (strategy === 'practice') depthGuidance = 'practice-oriented with clear problem-solving steps'
  if (strategy === 'video') depthGuidance = 'engaging, visual-learning friendly, and concise'

  return `You are a senior academic tutor.

Create professional study notes for the topic: "${topic}".
The notes must be ${depthGuidance}.

Important formatting rules:
- Return plain text only.
- Do not use markdown symbols like #, ##, **, or backticks.
- Use clear section titles in ALL CAPS followed by a colon.
- Use short bullet points with "- " when needed.

Required sections:
1) TOPIC OVERVIEW: 4-6 sentences with definitions and context.
2) CORE CONCEPTS: 6-10 bullet points explaining essential ideas.
3) STEP-BY-STEP UNDERSTANDING: A numbered explanation of how to approach this topic during study.
4) COMMON MISTAKES: 3-5 practical mistakes and how to avoid them.
5) REAL-WORLD APPLICATIONS: 3 concrete applications.
6) QUICK REVISION SHEET: concise formulas/rules/checklist style notes.
7) PRACTICE QUESTIONS: 5 questions, increasing from easy to hard.
8) MODEL ANSWER OUTLINE: short answer skeleton for the hardest question.

Keep the notes accurate, actionable, and classroom-ready.`
}

/**
 * Mock notes for development
 */
function getMockNotes(topic: string, strategy: RecommendationStrategy): string {
  const strategyTip =
    strategy === 'advanced'
      ? 'Focus on derivations, edge cases, and trade-offs between methods.'
      : strategy === 'practice'
        ? 'Focus on repeated problem-solving and checking each step.'
        : strategy === 'video'
          ? 'Use visual examples and short study bursts to stay engaged.'
          : 'Start with fundamentals and build confidence with short revision cycles.'

  return `
PROFESSIONAL STUDY NOTES: ${topic}

TOPIC OVERVIEW:
${topic} is an important academic area that combines foundational theory with practical application. A strong understanding of this topic helps improve analytical thinking, problem-solving speed, and exam performance. The goal is to first master core definitions, then apply them to increasingly complex problems.

CORE CONCEPTS:
- Define the scope of ${topic} and where it is used.
- Learn the essential terminology and notation.
- Distinguish between core principles and secondary details.
- Understand how concepts connect to previously studied topics.
- Identify common patterns that appear in assignments and exams.
- Build a checklist for solving topic-related questions.
- Review one representative example after each concept.

STEP-BY-STEP UNDERSTANDING:
1. Read and summarize the main definition in your own words.
2. Break the topic into 3-5 subtopics and study them one at a time.
3. Solve a basic example for each subtopic before moving on.
4. Compare at least two approaches or methods when applicable.
5. Practice mixed questions under time limits.
6. End with a short recap and error log.

COMMON MISTAKES:
- Memorizing rules without understanding when to apply them.
- Skipping intermediate steps, which causes avoidable errors.
- Confusing similar terms or symbols.
- Not validating final answers against constraints in the question.

REAL-WORLD APPLICATIONS:
- Academic assessments and competitive exams.
- Software, engineering, or analytical workflows depending on curriculum.
- Structured decision-making where clear reasoning is required.

QUICK REVISION SHEET:
- Key idea: Understand concept before memorizing details.
- Exam strategy: Attempt direct questions first, then multi-step ones.
- Review cycle: Learn, practice, correct, and reattempt.
- Study tip: ${strategyTip}

PRACTICE QUESTIONS:
1. State the core definition of ${topic} and one key property.
2. Explain the difference between two major sub-concepts in ${topic}.
3. Solve one standard textbook-style problem on ${topic}.
4. Analyze a case where a common mistake in ${topic} leads to a wrong answer.
5. Design an efficient strategy to solve a harder ${topic} problem under exam constraints.

MODEL ANSWER OUTLINE (FOR QUESTION 5):
- Clarify inputs, constraints, and expected output.
- Select the most suitable method and justify the choice.
- Execute solution steps in logical order.
- Verify correctness with a quick check.
- Conclude with complexity, limitations, or improvement options.
`.trim()
}

/**
 * Get Final Recommendation combining all resources
 */
export async function getFinalRecommendation(
  userData: UserData
): Promise<RecommendationResult> {
  try {
    // Step 1: Determine strategy
    const { strategy, message } = determineStrategy(userData)

    // Step 2: Fetch videos (parallel)
    const videosPromise = fetchYouTubeVideos(userData.weakTopic, DEFAULT_VIDEO_COUNT)

    // Step 3: Generate resource links (parallel)
    const linksPromise = generateResourceLinks(userData.weakTopic, strategy)

    // Step 4: Generate LLM notes (parallel)
    const notesPromise = generateLLMNotes(userData.weakTopic, strategy)

    // Wait for async operations
    const [videos, notes, links] = await Promise.all([videosPromise, notesPromise, linksPromise])
    
    const topicTokens = tokenizeTopic(userData.weakTopic)
    const requiredRelevanceScore = getRequiredRelevanceScore(topicTokens)
    
    const finalVideos = videos.filter((video) => {
      const relevanceScore = getTopicRelevanceScore(
        { ...video, relevanceText: `${video.title} ${video.channelTitle || ''}`.toLowerCase() },
        topicTokens
      )
      return relevanceScore >= requiredRelevanceScore
    })

    return {
      strategy,
      strategyMessage: message,
      videos: finalVideos,
      links,
      notes,
      generatedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error in getFinalRecommendation:', error)
    throw new Error('Failed to generate recommendations')
  }
}

/**
 * Validate user data
 */
export function validateUserData(data: any): UserData {
  if (
    typeof data.focusScore !== 'number' ||
    data.focusScore < 0 ||
    data.focusScore > 100
  ) {
    throw new Error('focusScore must be a number between 0 and 100')
  }

  if (!data.emotion || typeof data.emotion !== 'string') {
    throw new Error('emotion is required')
  }

  if (!data.weakTopic || typeof data.weakTopic !== 'string') {
    throw new Error('weakTopic is required')
  }

  if (
    typeof data.quizScore !== 'number' ||
    data.quizScore < 0 ||
    data.quizScore > 100
  ) {
    throw new Error('quizScore must be a number between 0 and 100')
  }

  return {
    focusScore: data.focusScore,
    emotion: data.emotion.toLowerCase(),
    weakTopic: data.weakTopic.trim(),
    quizScore: data.quizScore,
    difficulty: data.difficulty || 'medium',
  }
}
