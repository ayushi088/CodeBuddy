'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'

interface FocusMeterProps {
  score: number
}

export function FocusMeter({ score }: FocusMeterProps) {
  const [displayedScore, setDisplayedScore] = useState(score)

  useEffect(() => {
    const next = Math.max(0, Math.min(100, score))

    if (Math.abs(next - displayedScore) < 1) {
      setDisplayedScore(next)
      return
    }

    const step = next > displayedScore ? 1 : -1
    const timer = window.setInterval(() => {
      setDisplayedScore((current) => {
        const reached = step > 0 ? current >= next : current <= next
        if (reached) {
          window.clearInterval(timer)
          return next
        }
        return current + step
      })
    }, 40)

    return () => window.clearInterval(timer)
  }, [displayedScore, score])

  const getColor = () => {
    if (displayedScore >= 70) return { bg: 'bg-success', text: 'text-success', glow: 'shadow-success/30' }
    if (displayedScore >= 40) return { bg: 'bg-warning', text: 'text-warning', glow: 'shadow-warning/30' }
    return { bg: 'bg-destructive', text: 'text-destructive', glow: 'shadow-destructive/30' }
  }

  const getLabel = () => {
    if (displayedScore >= 90) return 'Excellent'
    if (displayedScore >= 70) return 'Good'
    if (displayedScore >= 50) return 'Fair'
    if (displayedScore >= 30) return 'Needs Improvement'
    return 'Low Focus'
  }

  const colors = getColor()
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Focus Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular Progress */}
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={`${colors.text} transition-all duration-500 ease-out`}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                }}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${colors.text}`}>{Math.round(displayedScore)}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Label */}
          <div className={`mt-4 px-3 py-1.5 rounded-full ${colors.bg}/10`}>
            <span className={`text-sm font-medium ${colors.text}`}>{getLabel()}</span>
          </div>

          {/* Tips */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 w-full">
            <p className="text-xs text-muted-foreground text-center">
              {displayedScore >= 70
                ? 'Great focus! Keep up the good work.'
                : displayedScore >= 40
                ? 'Try to minimize distractions and stay focused.'
                : 'Take a short break or adjust your environment.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
