'use client'

import { useState, useCallback } from 'react'
import {
  RecommendationResult,
  UserData,
} from '@/lib/recommendationService'

interface UseRecommendationOptions {
  autoFetch?: boolean
}

interface UseRecommendationReturn {
  loading: boolean
  error: string | null
  recommendations: RecommendationResult | null
  fetchRecommendations: (userData: UserData) => Promise<void>
  reset: () => void
  isFromCache: boolean
}

/**
 * Hook for fetching study material recommendations
 * 
 * Usage:
 * ```tsx
 * const { loading, recommendations, fetchRecommendations } = useRecommendation()
 * 
 * const handleClick = async () => {
 *   await fetchRecommendations({
 *     focusScore: 45,
 *     emotion: 'bored',
 *     weakTopic: 'Physics',
 *     quizScore: 35
 *   })
 * }
 * ```
 */
export function useRecommendation(
  options: UseRecommendationOptions = {}
): UseRecommendationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)

  const fetchRecommendations = useCallback(
    async (userData: UserData) => {
      setLoading(true)
      setError(null)
      setIsFromCache(false)

      try {
        const response = await fetch('/api/recommendation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch recommendations')
        }

        const data = await response.json()
        setRecommendations(data)

        // Check if response came from cache
        const cacheHeader = response.headers.get('X-Cache')
        setIsFromCache(cacheHeader === 'HIT')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        console.error('Recommendation error:', err)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setRecommendations(null)
    setError(null)
    setLoading(false)
    setIsFromCache(false)
  }, [])

  return {
    loading,
    error,
    recommendations,
    fetchRecommendations,
    reset,
    isFromCache,
  }
}
