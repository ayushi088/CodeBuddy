'use client'

import { useEffect } from 'react'
import { Clock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface SessionTimerProps {
  isRunning: boolean
  seconds: number
  onTick: () => void
  plannedMinutes: number
}

export function SessionTimer({ isRunning, seconds, onTick, plannedMinutes }: SessionTimerProps) {
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(onTick, 1000)
    return () => clearInterval(interval)
  }, [isRunning, onTick])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const progress = Math.min((seconds / (plannedMinutes * 60)) * 100, 100)
  const remainingSeconds = Math.max((plannedMinutes * 60) - seconds, 0)
  const isOvertime = seconds > (plannedMinutes * 60)

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-3xl font-bold font-mono text-foreground">
            {formatTime(seconds)}
          </p>
          <p className="text-sm text-muted-foreground">
            {isOvertime ? (
              <span className="text-warning">+{formatTime(seconds - (plannedMinutes * 60))} overtime</span>
            ) : (
              `${formatTime(remainingSeconds)} remaining`
            )}
          </p>
        </div>
      </div>
      <div className="flex-1 max-w-xs hidden md:block">
        <Progress 
          value={progress} 
          className={`h-2 ${isOvertime ? '[&>div]:bg-warning' : ''}`} 
        />
        <p className="text-xs text-muted-foreground mt-1">
          {Math.round(progress)}% of planned time
        </p>
      </div>
    </div>
  )
}
