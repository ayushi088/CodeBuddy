'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Smile, Brain, Activity } from 'lucide-react'
import { EmotionData } from '@/lib/emotion-detection'

interface EmotionStatsProps {
  emotionData: EmotionData | null
  showDetails?: boolean
}

export function EmotionStats({ emotionData, showDetails = true }: EmotionStatsProps) {
  if (!emotionData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Smile className="w-4 h-4" />
            Emotion Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No emotion data available</p>
        </CardContent>
      </Card>
    )
  }

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'happy':
        return '😊'
      case 'sad':
        return '😢'
      case 'angry':
        return '😠'
      case 'fear':
        return '😨'
      case 'surprise':
        return '😲'
      case 'disgust':
        return '🤢'
      case 'neutral':
      default:
        return '😐'
    }
  }

  const emotionLevels = {
    happy: { label: 'Happy', level: 'High', color: 'bg-green-500' },
    neutral: { label: 'Neutral', level: 'Medium', color: 'bg-gray-500' },
    sad: { label: 'Sad', level: 'Low', color: 'bg-red-500' },
    angry: { label: 'Angry', level: 'Low', color: 'bg-orange-500' },
    fear: { label: 'Fear', level: 'Low', color: 'bg-purple-500' },
    disgust: { label: 'Disgust', level: 'Low', color: 'bg-yellow-600' },
    surprise: { label: 'Surprise', level: 'High', color: 'bg-blue-500' },
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Current Emotion
          </CardTitle>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dominant Emotion */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{getEmotionIcon(emotionData.dominant_emotion)}</span>
            <div className="text-right">
              <div className="text-lg font-semibold capitalize text-foreground">
                {emotionData.dominant_emotion}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(emotionData.confidence * 100)}% confidence
              </div>
            </div>
          </div>
          <Badge className="text-xs">
            Level: {emotionLevels[emotionData.dominant_emotion as keyof typeof emotionLevels]?.level || 'Medium'}
          </Badge>
        </div>

        {/* Emotion Breakdown */}
        {showDetails && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Emotion Breakdown</p>
            {Object.entries(emotionData.all_emotions)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, score]) => (
                <div key={emotion} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs capitalize font-medium text-foreground">
                      {emotion}
                    </span>
                    <span className="text-xs text-muted-foreground">{score}%</span>
                  </div>
                  <Progress value={score} className="h-1.5" />
                </div>
              ))}
          </div>
        )}

        {/* Study Readiness */}
        <div className="bg-muted/50 rounded-lg p-2 mt-3">
          <p className="text-xs text-muted-foreground mb-1">Study Readiness</p>
          <div className="flex items-center gap-2">
            <Progress
              value={
                emotionData.dominant_emotion === 'happy'
                  ? 95
                  : emotionData.dominant_emotion === 'neutral'
                    ? 70
                    : 40
              }
              className="flex-1 h-2"
            />
            <span className="text-xs font-semibold">
              {emotionData.dominant_emotion === 'happy'
                ? 'Optimal'
                : emotionData.dominant_emotion === 'neutral'
                  ? 'Good'
                  : 'Low'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
