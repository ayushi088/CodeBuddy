/**
 * Utility helpers for the recommendation system
 * 
 * These functions help integrate recommendations with other parts of the app
 */

import { UserData } from '@/lib/recommendationService'

/**
 * Maps study session data to recommendation input
 * 
 * Usage:
 * ```tsx
 * const sessionData = {
 *   focusMetrics: { average: 65, current: 60 },
 *   emotionData: { current: 'focused' },
 *   quizResults: { lastScore: 75, currentTopic: 'Physics' }
 * }
 * const userData = mapSessionToRecommendation(sessionData)
 * ```
 */
export function mapSessionToRecommendation(sessionData: {
  focusMetrics?: { average?: number; current?: number }
  emotionData?: { current?: string }
  quizResults?: { lastScore?: number; currentTopic?: string }
}): UserData {
  const focusScore = sessionData.focusMetrics?.current || sessionData.focusMetrics?.average || 50
  const emotion = sessionData.emotionData?.current || 'neutral'
  const weakTopic = sessionData.quizResults?.currentTopic || 'General'
  const quizScore = sessionData.quizResults?.lastScore || 50

  return {
    focusScore: Math.min(100, Math.max(0, focusScore)),
    emotion: emotion.toLowerCase(),
    weakTopic,
    quizScore: Math.min(100, Math.max(0, quizScore)),
  }
}

/**
 * Get emotion label with emoji
 */
export function getEmotionEmoji(emotion: string): string {
  const emojiMap: { [key: string]: string } = {
    focused: '🎯',
    happy: '😊',
    sad: '😢',
    frustrated: '😤',
    bored: '😴',
    stressed: '😰',
    confused: '😕',
    determined: '💪',
    calm: '😌',
    excited: '🤩',
    neutral: '😐',
    disengaged: '😑',
  }
  return emojiMap[emotion.toLowerCase()] || '👤'
}

/**
 * Get strategy type description
 */
export function getStrategyDescription(
  strategy: 'easy' | 'practice' | 'video' | 'advanced'
): string {
  const descriptions: {
    [key: string]: string
  } = {
    easy: 'Starting with fundamentals and simplified concepts',
    practice: 'Focus on practical exercises and problem-solving',
    video: 'Using engaging video content for learning',
    advanced: 'Deep dive into advanced topics and concepts',
  }
  return descriptions[strategy] || ''
}

/**
 * Calculate recommendation score (0-100) based on user data
 * Shows how "ready" a user is for recommendations
 */
export function calculateReadinessScore(userData: UserData): number {
  let score = 0

  // Focus score contribution (30%)
  score += userData.focusScore * 0.3

  // Quiz score contribution (40%)
  score += userData.quizScore * 0.4

  // Emotional state contribution (30%)
  const emotionBoost: { [key: string]: number } = {
    focused: 100,
    determined: 95,
    excited: 90,
    happy: 80,
    calm: 75,
    neutral: 60,
    bored: 40,
    confused: 35,
    frustrated: 30,
    stressed: 25,
    sad: 20,
  }

  const emotionScore = emotionBoost[userData.emotion.toLowerCase()] || 50
  score += emotionScore * 0.3

  return Math.round(score)
}

/**
 * Get recommended study session duration based on metrics
 */
export function getRecommendedStudyDuration(userData: UserData): number {
  let minutes = 25 // Pomodoro default

  // Adjust based on focus score
  if (userData.focusScore < 40) {
    minutes = 15 // Shorter sessions for low focus
  } else if (userData.focusScore >= 80) {
    minutes = 50 // Longer sessions for high focus
  }

  // Adjust based on emotion
  if (userData.emotion === 'bored' || userData.emotion === 'frustrated') {
    minutes = Math.max(15, minutes - 10) // Shorter for negative emotions
  }

  // Adjust based on quiz score
  if (userData.quizScore < 50) {
    minutes = Math.min(50, minutes + 15) // Longer for weak performance
  }

  return minutes
}

/**
 * Get break duration recommendation
 */
export function getBreakDurationRecommendation(userData: UserData): number {
  // Base break: 5 minutes
  let breakMinutes = 5

  // Increase break for low focus
  if (userData.focusScore < 35) {
    breakMinutes = 10
  }

  // Decrease break for high focus
  if (userData.focusScore > 85) {
    breakMinutes = 3
  }

  return breakMinutes
}

/**
 * Format recommendation data for display
 */
export function formatRecommendationMessage(
  strategy: string,
  focusScore: number,
  emotion: string,
  quizScore: number
): string {
  const emotionEmoji = getEmotionEmoji(emotion)
  const focusStatus =
    focusScore >= 75 ? 'excellent' : focusScore >= 50 ? 'moderate' : 'low'
  const performanceStatus = quizScore >= 75 ? '💯 strong' : '⚠️ needs improvement'

  return `${emotionEmoji} Based on your ${focusStatus} focus and ${performanceStatus} performance, here's what I recommend:`
}

/**
 * Get next study action based on recommendation
 */
export function getNextStudyAction(
  strategy: 'easy' | 'practice' | 'video' | 'advanced'
): {
  action: string
  description: string
  timeRequired: number
} {
  const actions: {
    [key: string]: { action: string; description: string; timeRequired: number }
  } = {
    easy: {
      action: 'Review Fundamentals',
      description:
        'Start with basic concepts and simple examples to build confidence',
      timeRequired: 15,
    },
    practice: {
      action: 'Solve Practice Problems',
      description:
        'Work through practice questions to strengthen your understanding',
      timeRequired: 30,
    },
    video: {
      action: 'Watch Tutorial Videos',
      description:
        'Engage with visual content to make learning more interesting',
      timeRequired: 20,
    },
    advanced: {
      action: 'Explore Advanced Topics',
      description:
        'Dive deeper into complex concepts and advanced applications',
      timeRequired: 40,
    },
  }

  return actions[strategy] || actions.easy
}

/**
 * Validate if recommendation data is fresh (not too old)
 */
export function isRecommendationFresh(generatedAt: string, maxAgeMinutes: number = 60): boolean {
  const generated = new Date(generatedAt)
  const now = new Date()
  const ageMinutes = (now.getTime() - generated.getTime()) / (1000 * 60)
  return ageMinutes < maxAgeMinutes
}

/**
 * Track recommendation engagement
 * Call this when user interacts with recommendations
 */
export async function trackRecommendationEngagement(
  recommendationId: string,
  action: 'view' | 'click' | 'complete' | 'skip',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Send to analytics or logging service
    const payload = {
      recommendationId,
      action,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ...metadata,
    }

    // Log locally in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Recommendation Engagement]', payload)
    }

    // In production, send to backend
    // await fetch('/api/analytics/recommendation', { method: 'POST', body: JSON.stringify(payload) })
  } catch (error) {
    console.error('Error tracking recommendation engagement:', error)
  }
}

/**
 * Get study material type icon
 */
export function getMaterialTypeIcon(type: string): string {
  const icons: { [key: string]: string } = {
    video: '🎬',
    notes: '📝',
    practice: '✏️',
    articles: '📰',
    quiz: '❓',
    book: '📚',
  }
  return icons[type] || '📄'
}

/**
 * Estimate learning completion percentage based on materials consumed
 */
export function estimateCompletionPercentage(
  videosWatched: number,
  notesRead: boolean,
  practiceCompleted: number
): number {
  let percentage = 0

  // Videos: each 5 watched = 10%
  percentage += Math.min(40, videosWatched * 10)

  // Notes: 20%
  if (notesRead) percentage += 20

  // Practice: each 3 completed = 10%
  percentage += Math.min(40, practiceCompleted * 3.33)

  return Math.round(Math.min(100, percentage))
}

/**
 * Sort recommendations by relevance/quality score
 */
export function rankResourcesByRelevance(
  resources: any[],
  userQuery: string
): any[] {
  return resources.sort((a, b) => {
    // Title match score
    const aMatch = a.title.toLowerCase().includes(userQuery.toLowerCase()) ? 1 : 0
    const bMatch = b.title.toLowerCase().includes(userQuery.toLowerCase()) ? 1 : 0

    // Type priority (notes > practice > articles > video)
    const typePriority: { [key: string]: number } = {
      notes: 4,
      practice: 3,
      articles: 2,
      video: 1,
    }
    const aPriority = typePriority[a.type] || 0
    const bPriority = typePriority[b.type] || 0

    return bMatch - aMatch || bPriority - aPriority
  })
}
