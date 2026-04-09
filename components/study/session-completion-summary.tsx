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
  const hasAnalytics = emotionHistory.length > 0

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
              <p className="text-sm text-muted-foreground">Analytics</p>
              <Badge variant="secondary" className="mt-1">
                {hasAnalytics ? 'Captured' : 'Pending'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Focus Score</p>
              <p className="text-lg font-semibold">{Math.round(focusScore)}/100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Status</CardTitle>
          <CardDescription>
            Session data was stored and is available for reports.
          </CardDescription>
        </CardHeader>
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
