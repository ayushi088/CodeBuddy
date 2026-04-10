import { NextRequest, NextResponse } from 'next/server'
import {
  getFinalRecommendation,
  validateUserData,
  RecommendationResult,
} from '@/lib/recommendationService'

/**
 * POST /api/recommendation
 * 
 * Generates dynamic study material recommendations based on user data
 * 
 * Request body:
 * {
 *   focusScore: number (0-100)
 *   emotion: string
 *   weakTopic: string
 *   quizScore: number (0-100)
 *   difficulty?: string
 * }
 * 
 * Response:
 * {
 *   strategy: string
 *   strategyMessage: string
 *   videos: array
 *   links: array
 *   notes: string
 *   generatedAt: string
 * }
 */

// Cache recommendations for 5 minutes (in production, use Redis)
const recommendationCache = new Map<string, { data: RecommendationResult; timestamp: number }>()
const CACHE_DURATION_MS = 5 * 60 * 1000
const RECOMMENDATION_CACHE_VERSION = 'v17'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()

    // Validate user data
    const userData = validateUserData(body)

    // Generate cache key
    const cacheKey = `${RECOMMENDATION_CACHE_VERSION}-${userData.weakTopic}-${userData.focusScore}-${userData.emotion}`

    // Check cache
    const cached = recommendationCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      console.log(`Cache hit for: ${cacheKey}`)
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    // Generate recommendations
    const recommendation = await getFinalRecommendation(userData)

    // Cache the result
    recommendationCache.set(cacheKey, {
      data: recommendation,
      timestamp: Date.now(),
    })

    // Clean old cache entries (keep only last 50 entries)
    if (recommendationCache.size > 50) {
      const firstKey = recommendationCache.keys().next().value
      if (typeof firstKey === 'string') {
        recommendationCache.delete(firstKey)
      }
    }

    return NextResponse.json(recommendation, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Recommendation API error:', error)

    // Handle validation errors
    if (error instanceof Error && error.message.includes('must be')) {
      return NextResponse.json(
        {
          error: error.message,
          success: false,
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        message: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        success: false,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recommendation (optional)
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/recommendation',
    method: 'POST',
    description: 'Generate dynamic study material recommendations',
    requestBody: {
      focusScore: 'number (0-100) - Focus level',
      emotion: 'string - Current emotion (focused, bored, stressed, etc.)',
      weakTopic: 'string - Topic that needs improvement',
      quizScore: 'number (0-100) - Last quiz score',
      difficulty: 'optional string - Preferred difficulty level',
    },
    response: {
      strategy: 'Recommendation strategy (easy, practice, video, advanced)',
      strategyMessage: 'Human-readable message',
      videos: 'Array of YouTube videos',
      links: 'Array of resource links',
      notes: 'AI-generated study notes',
      generatedAt: 'ISO timestamp',
    },
    examples: {
      request: {
        focusScore: 45,
        emotion: 'bored',
        weakTopic: 'Quantum Physics',
        quizScore: 35,
      },
      response: {
        strategy: 'video',
        strategyMessage: '🎬 You seem bored. Here are engaging video tutorials.',
        videos: [
          {
            id: 'video1',
            title: 'Complete Quantum Physics Tutorial For Beginners',
            link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
        ],
        links: [
          {
            type: 'notes',
            title: 'Quantum Physics Study Notes',
            link: 'https://www.google.com/search?q="Quantum Physics+study+notes"',
          },
        ],
        notes: '## 📖 Study Guide: Quantum Physics\n...',
        generatedAt: '2024-01-01T12:00:00.000Z',
      },
    },
  })
}

/**
 * OPTIONS /api/recommendation
 * CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
