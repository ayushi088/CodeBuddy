'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Recommendation from '@/components/recommendation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSubjects } from '@/hooks/use-subjects'
import { useAuth } from '@/lib/auth-context'

/**
 * Example page showing how to use the Recommendation component
 * 
 * This page demonstrates:
 * - Different scenarios (low focus, low quiz score, bored, etc.)
 * - How to integrate with user data
 * - How to handle recommendations
 * 
 * Place this at: app/(app)/recommendation/page.tsx (or any app route)
 */

interface RecommendationScenario {
  id: string
  title: string
  description: string
  focusScore: number
  emotion: string
  weakTopic: string
  quizScore: number
}

const scenarios: RecommendationScenario[] = [
  {
    id: 'struggling-focus',
    title: 'Struggling Focus',
    description: 'Low focus score, needs easy content',
    focusScore: 35,
    emotion: 'neutral',
    weakTopic: 'Calculus',
    quizScore: 55,
  },
  {
    id: 'post-failed-quiz',
    title: 'Failed Quiz',
    description: 'Low quiz score, needs practice',
    focusScore: 65,
    emotion: 'frustrated',
    weakTopic: 'Organic Chemistry',
    quizScore: 25,
  },
  {
    id: 'bored-learner',
    title: 'Bored Learner',
    description: 'Bored emotion, needs engaging video content',
    focusScore: 60,
    emotion: 'bored',
    weakTopic: 'History',
    quizScore: 65,
  },
  {
    id: 'advanced-learner',
    title: 'Advanced Learner',
    description: 'High performance, ready for advanced content',
    focusScore: 85,
    emotion: 'focused',
    weakTopic: 'Quantum Physics',
    quizScore: 92,
  },
]

export default function RecommendationPage() {
  const { user } = useAuth()
  const { subjects } = useSubjects()
  const [selectedScenario, setSelectedScenario] = useState<RecommendationScenario>(
    scenarios[0]
  )
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [showFirstRegistrationInfo, setShowFirstRegistrationInfo] = useState(false)

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      setShowFirstRegistrationInfo(false)
      return
    }

    const key = 'codebuddy:first-registration-user-id'
    const storedUserId = window.localStorage.getItem(key)
    const shouldShowInfo = storedUserId === String(user.id)

    setShowFirstRegistrationInfo(shouldShowInfo)

    if (shouldShowInfo) {
      window.localStorage.removeItem(key)
    }
  }, [user])

  useEffect(() => {
    if (subjects.length === 0) {
      setSelectedSubjectId('')
      return
    }

    const isSelectedSubjectValid = subjects.some((subject) => subject.id === selectedSubjectId)
    if (!selectedSubjectId || !isSelectedSubjectValid) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [subjects, selectedSubjectId])

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId),
    [selectedSubjectId, subjects]
  )

  const recommendationTopic =
    selectedTopic.trim() || selectedSubject?.name || selectedScenario.weakTopic

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          📚 Study Material Recommendations
        </h1>
        <p className="text-muted-foreground mt-2">
          Dynamic, AI-powered personalized learning resources
        </p>
      </div>

      {/* Info Cards */}
      {showFirstRegistrationInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">How it Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>✨ Our recommendation engine analyzes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your focus score</li>
                <li>Current emotional state</li>
                <li>Weak topics</li>
                <li>Quiz performance</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">What You Get</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>🎁 Each recommendation includes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>YouTube video tutorials</li>
                <li>Practice resources</li>
                <li>AI-generated notes</li>
                <li>Study recommendations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Smart Strategies</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>🧠 Adaptive learning paths:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Easy (low focus)</li>
                <li>Practice (low scores)</li>
                <li>Video (bored)</li>
                <li>Advanced (high performance)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Choose a Subject</CardTitle>
          <CardDescription>
            Pick the subject you want resources for. The selected subject will be used as the topic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects found yet. Add subjects in Planner first, then come back here to generate resources.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Subject</p>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Topic</p>
                <Input
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  placeholder="e.g. Derivatives, Trigonometry, Cell Division"
                />
              </div>
            </div>
          )}
          {recommendationTopic && (
            <p className="text-sm text-muted-foreground">
              Suggesting resources for <span className="font-medium text-foreground">{recommendationTopic}</span>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scenario Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Choose a Scenario</CardTitle>
          <CardDescription>
            Select a scenario to test different recommendation strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedScenario.id === scenario.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{scenario.title}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {scenario.description}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    Focus: {scenario.focusScore}%
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Quiz: {scenario.quizScore}%
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Recommendation Component */}
      <Recommendation
        focusScore={selectedScenario.focusScore}
        emotion={selectedScenario.emotion}
        weakTopic={recommendationTopic}
        quizScore={selectedScenario.quizScore}
      />
    </div>
  )
}
