/**
 * Example: Integrating Recommendations with Study Sessions
 * 
 * This file demonstrates how to use the recommendation system
 * within an active study session to provide real-time guidance.
 */

// ============================================================================
// SCENARIO 1: Study Session with Real-time Recommendations
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import Recommendation from '@/components/recommendation'
import { useRecommendation } from '@/hooks/use-recommendation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RecommendationResult } from '@/lib/recommendationService'

interface StudySessionData {
  focusScore: number
  emotion: string
  currentTopic: string
  quizScore: number
  studyDuration: number
  sessionId: string
}

interface StudyPlanPhase {
  phase: number
  name: string
  duration: string
  activities: string[]
}

interface StudyPlan {
  topic: string
  currentLevel: 'beginner' | 'intermediate' | 'advanced'
  targetScore: number
  phases: StudyPlanPhase[]
}

/**
 * Enhanced Study Session with Recommendations
 */
export function StudySessionWithRecommendations({
  initialData,
}: {
  initialData: StudySessionData
}) {
  const [sessionData, setSessionData] = useState(initialData)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const { loading, recommendations, fetchRecommendations } = useRecommendation()

  // Auto-fetch recommendations if focus drops or emotion changes negatively
  useEffect(() => {
    if (
      sessionData.focusScore < 50 ||
      sessionData.emotion === 'bored' ||
      sessionData.emotion === 'frustrated'
    ) {
      // Automatically fetch recommendations for struggling students
      fetchRecommendations({
        focusScore: sessionData.focusScore,
        emotion: sessionData.emotion,
        weakTopic: sessionData.currentTopic,
        quizScore: sessionData.quizScore,
      })
      setShowRecommendations(true)
    }
  }, [sessionData.focusScore, sessionData.emotion])

  const handleGetHelpClicked = async () => {
    await fetchRecommendations({
      focusScore: sessionData.focusScore,
      emotion: sessionData.emotion,
      weakTopic: sessionData.currentTopic,
      quizScore: sessionData.quizScore,
    })
    setShowRecommendations(true)
  }

  return (
    <div className="space-y-4">
      {/* Study Session Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Study Session Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Focus Score</p>
              <p className="text-2xl font-bold">{sessionData.focusScore}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emotion</p>
              <p className="text-lg font-semibold capitalize">
                {sessionData.emotion}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Topic</p>
              <p className="text-lg font-semibold">{sessionData.currentTopic}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-lg font-semibold">{sessionData.studyDuration}m</p>
            </div>
          </div>

          {/* Auto-triggered recommendations alert */}
          {(sessionData.focusScore < 50 ||
            sessionData.emotion === 'bored') && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                💡 We noticed you might need help. Click below for personalized
                recommendations!
              </p>
            </div>
          )}

          <Button onClick={handleGetHelpClicked} disabled={loading} className="w-full">
            {loading ? '📚 Finding Resources...' : '🆘 Get Personalized Help'}
          </Button>
        </CardContent>
      </Card>

      {/* Recommendations Section */}
      {showRecommendations && (
        <Recommendation
          focusScore={sessionData.focusScore}
          emotion={sessionData.emotion}
          weakTopic={sessionData.currentTopic}
          quizScore={sessionData.quizScore}
        />
      )}

      {/* Study Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Study Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            💡 Combine videos with practice for better retention (60% improvement)
          </p>
          <p>📝 Take notes while watching videos to engage more</p>
          <p>✏️ Do practice problems right after watching content</p>
          <p>🔄 Review weak areas using AI-generated notes</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// SCENARIO 2: Post-Quiz Recommendation Flow
// ============================================================================

/**
 * After quiz completion, automatically suggest resources based on results
 */
export function PostQuizRecommendationFlow({
  quizResults,
}: {
  quizResults: {
    score: number
    topic: string
    totalQuestions: number
    correctAnswers: number
    weakAreas: string[]
  }
}) {
  const [recommendations, setRecommendations] =
    useState<RecommendationResult | null>(null)
  const { fetchRecommendations } = useRecommendation()

  useEffect(() => {
    // Auto-fetch recommendations after poor quiz performance
    if (quizResults.score < 60) {
      fetchRecommendations({
        focusScore: 70,
        emotion: 'determined',
        weakTopic: quizResults.topic,
        quizScore: quizResults.score,
      })
    }
  }, [quizResults])

  return (
    <div className="space-y-4">
      {/* Quiz Results Summary */}
      <Card className={quizResults.score >= 80 ? 'border-green-500' : 'border-orange-500'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Quiz Results</span>
            <span
              className={`text-3xl font-bold ${
                quizResults.score >= 80 ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              {quizResults.score}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p>
              You got <strong>{quizResults.correctAnswers}</strong> out of{' '}
              <strong>{quizResults.totalQuestions}</strong> questions correct
            </p>
          </div>

          {quizResults.weakAreas.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Areas to improve:</p>
              <div className="flex flex-wrap gap-2">
                {quizResults.weakAreas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-full text-xs"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {quizResults.score < 60 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ✨ We've generated personalized study materials to help you improve.
                Check the recommendations below!
              </p>
            </div>
          )}

          {quizResults.score >= 80 && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
              <p className="text-sm text-green-800 dark:text-green-200">
                🎉 Great job! Ready to explore advanced topics?
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automatic recommendations for low scores */}
      {quizResults.score < 60 && (
        <Recommendation
          focusScore={70}
          emotion="determined"
          weakTopic={quizResults.topic}
          quizScore={quizResults.score}
          onRecommendationsFetched={(data) => setRecommendations(data)}
        />
      )}
    </div>
  )
}

// ============================================================================
// SCENARIO 3: Dashboard Widget - Quick Recommendations
// ============================================================================

/**
 * Lightweight recommendation widget for dashboard
 */
export function QuickRecommendationWidget({
  userProfile,
}: {
  userProfile: {
    focusScore: number
    emotion: string
    strugglingWith: string
    recentQuizScore: number
  }
}) {
  const { loading, recommendations, fetchRecommendations } = useRecommendation()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">📚 Smart Study Guide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Get AI-powered recommendations for <strong>{userProfile.strugglingWith}</strong>
        </p>

        {!recommendations ? (
          <Button
            onClick={() =>
              fetchRecommendations({
                focusScore: userProfile.focusScore,
                emotion: userProfile.emotion,
                weakTopic: userProfile.strugglingWith,
                quizScore: userProfile.recentQuizScore,
              })
            }
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? 'Loading...' : 'Generate Guide'}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{recommendations.strategyMessage}</p>
            <div className="space-y-1">
              {recommendations.videos.slice(0, 2).map((video) => (
                <a
                  key={video.id}
                  href={video.link}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline block truncate"
                >
                  🎬 {video.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// SCENARIO 4: Study Plan Generation
// ============================================================================

/**
 * Generate a full study plan with recommendations
 */
export function StudyPlanGenerator({
  topic,
  currentLevel = 'beginner',
  targetScore = 85,
}: {
  topic: string
  currentLevel?: 'beginner' | 'intermediate' | 'advanced'
  targetScore?: number
}) {
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const { loading, recommendations, fetchRecommendations } = useRecommendation()

  const generatePlan = async () => {
    // Determine starting metrics based on level
    const startingMetrics = {
      beginner: { focusScore: 50, quizScore: 30 },
      intermediate: { focusScore: 65, quizScore: 55 },
      advanced: { focusScore: 80, quizScore: 75 },
    }

    const metrics = startingMetrics[currentLevel]

    await fetchRecommendations({
      focusScore: metrics.focusScore,
      emotion: 'motivated',
      weakTopic: topic,
      quizScore: metrics.quizScore,
    })

    // Generate study plan structure
    setPlan({
      topic,
      currentLevel,
      targetScore,
      phases: [
        {
          phase: 1,
          name: 'Foundation',
          duration: '3 days',
          activities: ['Watch videos', 'Read notes', 'Take initial quiz'],
        },
        {
          phase: 2,
          name: 'Practice',
          duration: '4 days',
          activities: ['Solve problems', 'Review mistakes', 'Practice test'],
        },
        {
          phase: 3,
          name: 'Mastery',
          duration: '2 days',
          activities: ['Advanced topics', 'Final review', 'Final exam'],
        },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Study Plan: {topic}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Level</p>
              <p className="font-semibold capitalize">{currentLevel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Score</p>
              <p className="font-semibold">{targetScore}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-semibold">9 Days</p>
            </div>
          </div>

          <Button onClick={generatePlan} disabled={loading} className="w-full">
            {loading ? 'Generating...' : 'Generate Personalized Plan'}
          </Button>
        </CardContent>
      </Card>

      {plan && (
        <>
          {/* Study Phases */}
          <div className="space-y-3">
            {plan.phases.map((phase) => (
              <Card key={phase.phase}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Phase {phase.phase}: {phase.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{phase.duration}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {phase.activities.map((activity) => (
                      <li key={activity} className="flex items-center gap-2">
                        <span>✓</span>
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recommendations */}
          {recommendations && (
            <Recommendation
              focusScore={65}
              emotion="motivated"
              weakTopic={topic}
              quizScore={55}
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: In a study session
<StudySessionWithRecommendations
  initialData={{
    focusScore: 65,
    emotion: 'focused',
    currentTopic: 'Physics',
    quizScore: 45,
    studyDuration: 25,
    sessionId: 'session-123',
  }}
/>

// Example 2: After quiz
<PostQuizRecommendationFlow
  quizResults={{
    score: 55,
    topic: 'Chemistry',
    totalQuestions: 20,
    correctAnswers: 11,
    weakAreas: ['Stoichiometry', 'Balancing Equations'],
  }}
/>

// Example 3: On dashboard
<QuickRecommendationWidget
  userProfile={{
    focusScore: 70,
    emotion: 'focused',
    strugglingWith: 'Calculus',
    recentQuizScore: 62,
  }}
/>

// Example 4: Study plan
<StudyPlanGenerator
  topic="Quantum Physics"
  currentLevel="intermediate"
  targetScore={90}
/>
*/
