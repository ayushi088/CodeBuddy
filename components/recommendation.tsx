'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RecommendationResult } from '@/lib/recommendationService'
import { Loader2, AlertCircle, ExternalLink, BookOpen, Film, FileText } from 'lucide-react'

interface RecommendationProps {
  focusScore: number
  emotion: string
  weakTopic: string
  quizScore: number
  difficulty?: string
  onRecommendationsFetched?: (data: RecommendationResult) => void
}

export default function Recommendation({
  focusScore,
  emotion,
  weakTopic,
  quizScore,
  difficulty = 'medium',
  onRecommendationsFetched,
}: RecommendationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          focusScore,
          emotion,
          weakTopic,
          quizScore,
          difficulty,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch recommendations')
      }

      const data = await response.json()
      setRecommendations(data)
      onRecommendationsFetched?.(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Recommendation error:', err)
    } finally {
      setLoading(false)
    }
  }, [focusScore, emotion, weakTopic, quizScore, difficulty, onRecommendationsFetched])

  return (
    <div className="w-full space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Study Material Recommendations
          </CardTitle>
          <CardDescription>
            Personalized learning resources based on your current performance and emotional state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Focus Score</p>
              <p className="text-lg font-semibold">{focusScore}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Emotion</p>
              <p className="text-lg font-semibold capitalize">{emotion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Topic</p>
              <p className="text-lg font-semibold truncate">{weakTopic}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Quiz Score</p>
              <p className="text-lg font-semibold">{quizScore}%</p>
            </div>
          </div>

          <Button
            onClick={fetchRecommendations}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Recommendations...
              </>
            ) : (
              'Get Recommendations'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Recommendations Content */}
      {recommendations && (
        <div className="space-y-4">
          {/* Strategy Message */}
          <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950">
            <CardContent className="pt-6">
              <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                {recommendations.strategyMessage}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Strategy: <span className="font-semibold capitalize">{recommendations.strategy}</span>
              </p>
            </CardContent>
          </Card>

          {/* Tabs for Different Content Types */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="videos">
                <Film className="h-4 w-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="resources">
                <FileText className="h-4 w-4 mr-2" />
                Resources
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI-Generated Study Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {recommendations.notes}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-4">
              {recommendations.videos.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No videos found. Try a different topic.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.videos.map((video) => (
                  <Card key={video.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        {video.thumbnail && (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="h-24 w-40 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate hover:text-blue-600">
                            {video.title}
                          </h4>
                          {video.duration && (
                            <p className="text-sm text-muted-foreground">
                              Duration: {video.duration}
                            </p>
                          )}
                          <a
                            href={video.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm mt-2 inline-flex items-center gap-1"
                          >
                            Watch on YouTube
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-4">
              {recommendations.links.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No resources found.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.links.map((link, index) => (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{link.title}</h4>
                            <p className="text-xs text-muted-foreground capitalize mt-1">
                              Type: {link.type}
                            </p>
                          </div>
                        </div>
                        <a
                          href={link.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                        >
                          Open Resource
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          <Card className="bg-gray-50 dark:bg-gray-950">
            <CardContent className="pt-6 text-xs text-muted-foreground">
              <p>
                Generated at: {new Date(recommendations.generatedAt).toLocaleString()}
              </p>
              <p className="mt-1">
                💡 Pro Tip: Combine videos, notes, and practice questions for better learning outcomes.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initial Empty State */}
      {!loading && !recommendations && !error && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Click "Get Recommendations" to generate personalized study materials
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
