'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { EmotionData } from '@/lib/emotion-detection'

interface SessionCompletionSummaryProps {
  subject: string
  duration: number
  emotionHistory: EmotionData[]
  focusScore: number
  onClose: () => void
}

export function SessionCompletionSummary({
  subject,
  duration,
  emotionHistory,
  focusScore,
  onClose,
}: SessionCompletionSummaryProps) {
  // Calculate emotion statistics
  const emotionCounts: Record<string, number> = {}
  const emotionAverages: Record<string, number[]> = {}
  let totalConfidence = 0

  emotionHistory.forEach((data) => {
    const emotion = data.dominant_emotion.toLowerCase()
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
    totalConfidence += data.confidence

    if (!emotionAverages[emotion]) {
      emotionAverages[emotion] = []
    }
    emotionAverages[emotion].push(data.confidence)
  })

  const averageConfidence = emotionHistory.length > 0 ? totalConfidence / emotionHistory.length : 0

  // Get dominant emotion
  const dominantEmotion = emotionHistory.length > 0
    ? emotionHistory.reduce((prev, current) =>
        (prev.confidence || 0) > (current.confidence || 0) ? prev : current
      ).dominant_emotion
    : 'Unknown'

  // Prepare data for charts
  const emotionDistributionData = Object.entries(emotionCounts).map(([emotion, count]) => ({
    name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    value: count,
  }))

  const emotionTrendData = emotionHistory.slice(-20).map((data, index) => ({
    time: `${index + 1}`,
    confidence: (data.confidence * 100).toFixed(0),
    emotion: data.dominant_emotion,
  }))

  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f']

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Session Summary</CardTitle>
          <CardDescription>Your study session has been completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="text-lg font-semibold">{subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-lg font-semibold">{Math.floor(duration / 60)} minutes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Dominant Emotion</p>
              <Badge variant="secondary" className="mt-1">
                {dominantEmotion}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Focus Score</p>
              <p className="text-lg font-semibold">{Math.round(focusScore)}/100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotion Distribution Chart */}
      {emotionDistributionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emotion Distribution</CardTitle>
            <CardDescription>
              {emotionHistory.length} emotion samples detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emotionDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {emotionDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Confidence Trend */}
      {emotionTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emotion Confidence Trend</CardTitle>
            <CardDescription>
              Average confidence: {(averageConfidence * 100).toFixed(1)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emotionTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="confidence" fill="#4ecdc4" name="Confidence (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emotion Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(emotionAverages).map(([emotion, confidences]) => {
              const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
              return (
                <div
                  key={emotion}
                  className="flex justify-between items-center p-2 rounded-lg bg-muted/50"
                >
                  <span className="capitalize">{emotion}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">
                      {confidences.length}x
                    </span>
                    <div className="w-24 bg-muted rounded h-2">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${avgConfidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={onClose} className="flex-1">
          Close & View Dashboard
        </Button>
      </div>
    </div>
  )
}
