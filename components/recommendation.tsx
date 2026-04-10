'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RecommendationResult } from '@/lib/recommendationService'
import { Loader2, AlertCircle, ExternalLink, BookOpen, Film, FileText, PlayCircle } from 'lucide-react'

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
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [previewResource, setPreviewResource] = useState<{
    title: string
    source: string
    description: string
    previewUrl: string
  } | null>(null)

  const getEmbeddableVideoId = useCallback((video: { id: string; link: string }) => {
    const directIdPattern = /^[A-Za-z0-9_-]{11}$/
    if (directIdPattern.test(video.id)) {
      return video.id
    }

    try {
      const url = new URL(video.link)
      const idFromQuery = url.searchParams.get('v')
      if (idFromQuery && directIdPattern.test(idFromQuery)) {
        return idFromQuery
      }

      const embedMatch = url.pathname.match(/\/embed\/([A-Za-z0-9_-]{11})/)
      if (embedMatch?.[1]) {
        return embedMatch[1]
      }
    } catch {
      return null
    }

    return null
  }, [])

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedVideoId(null)

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
          <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Focus Score</p>
              <p className="text-lg font-semibold">{focusScore}%</p>
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
              <TabsTrigger value="overview">Notes</TabsTrigger>
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
            <TabsContent value="videos" className="space-y-6">
              {recommendations.videos.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      No videos found. Try a different topic.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Embedded Video Player */}
                  {selectedVideoId && (
                    <Card className="border-2 border-blue-500">
                      <CardHeader>
                        <CardTitle className="text-base">
                          {recommendations.videos.find(v => v.id === selectedVideoId)?.title || 'Video Player'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${selectedVideoId}?rel=0&modestbranding=1`}
                            title="Video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                        <Button
                          onClick={() => setSelectedVideoId(null)}
                          variant="outline"
                          className="mt-4"
                        >
                          Close Player
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Video List */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {recommendations.videos.map((video) => (
                      <Card
                        key={video.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          const embedId = getEmbeddableVideoId(video)
                          if (!embedId) {
                            setError('This video is not embeddable right now. Please try another one.')
                            return
                          }
                          setError(null)
                          setSelectedVideoId(embedId)
                        }}
                      >
                        <CardContent className="p-0 pb-3">
                          <div className="aspect-video overflow-hidden rounded-t-lg bg-muted relative group">
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                <PlayCircle className="h-10 w-10" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                              <PlayCircle className="h-12 w-12 text-white" />
                            </div>
                          </div>
                          <div className="px-3 pt-2">
                            <p className="font-semibold text-sm line-clamp-2 text-foreground hover:text-blue-600 transition-colors">
                              {video.title}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
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
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Practice Sheets
                    </h3>
                    {recommendations.links
                      .filter((link) => link.type === 'practice-sheet')
                      .map((link, index) => (
                        <Card key={`practice-sheet-${index}`} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold">{link.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {link.source}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {link.description}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full justify-center"
                                onClick={() => setPreviewResource(link)}
                              >
                                Preview in app
                                <ExternalLink className="ml-2 h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Previous Year Question Papers
                    </h3>
                    {recommendations.links
                      .filter((link) => link.type === 'previous-year-paper')
                      .map((link, index) => (
                        <Card key={`previous-paper-${index}`} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold">{link.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {link.source}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {link.description}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="w-full justify-center"
                                onClick={() => setPreviewResource(link)}
                              >
                                Preview in app
                                <ExternalLink className="ml-2 h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={Boolean(previewResource)} onOpenChange={(open) => !open && setPreviewResource(null)}>
            <DialogContent className="max-w-5xl h-[85vh] overflow-hidden p-0">
              {previewResource && (
                <div className="flex h-full flex-col">
                  <DialogHeader className="border-b px-6 py-4 text-left">
                    <DialogTitle>{previewResource.title}</DialogTitle>
                    <DialogDescription>
                      {previewResource.source} • {previewResource.description}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 bg-muted/20">
                    <iframe
                      src={previewResource.previewUrl}
                      className="h-full w-full"
                      title={previewResource.title}
                    />
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
