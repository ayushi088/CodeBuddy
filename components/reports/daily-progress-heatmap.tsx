'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Activity } from 'lucide-react'

type DailyProgressPoint = {
  date: string
  total_minutes: number
  sessions: number
}

export function DailyProgressHeatmap() {
  const [dailyProgress, setDailyProgress] = useState<DailyProgressPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/profile/daily-progress?days=365')
        if (!res.ok) throw new Error('Failed to fetch progress')
        const data = await res.json()
        setDailyProgress(Array.isArray(data.progress) ? data.progress : [])
      } catch {
        setDailyProgress([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchProgress()
  }, [])

  const heatmap = useMemo(() => {
    const map = new Map<string, DailyProgressPoint>()
    for (const entry of dailyProgress) {
      map.set(entry.date, entry)
    }

    const days: Array<{
      date: string
      level: 0 | 1 | 2 | 3 | 4
      minutes: number
      sessions: number
      monthLabel: string
    }> = []

    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - 364)

    const firstDay = new Date(start)
    firstDay.setDate(start.getDate() - start.getDay())

    for (let cursor = new Date(firstDay); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
      const dateKey = cursor.toISOString().slice(0, 10)
      const point = map.get(dateKey)
      const minutes = point?.total_minutes ?? 0

      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (minutes > 0 && minutes < 30) level = 1
      else if (minutes >= 30 && minutes < 60) level = 2
      else if (minutes >= 60 && minutes < 120) level = 3
      else if (minutes >= 120) level = 4

      days.push({
        date: dateKey,
        level,
        minutes,
        sessions: point?.sessions ?? 0,
        monthLabel: cursor.toLocaleDateString('en-US', { month: 'short' }),
      })
    }

    const weeks: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }

    const monthMarkers = weeks
      .map((week, index) => ({
        index,
        label: week[0]?.monthLabel || '',
        day: week[0]?.date || '',
      }))
      .filter((marker, index, arr) => index === 0 || marker.label !== arr[index - 1].label)

    const activeDays = days.filter((d) => d.minutes > 0).length

    return {
      weeks,
      monthMarkers,
      activeDays,
      totalSessions: days.reduce((acc, d) => acc + d.sessions, 0),
      totalMinutes: days.reduce((acc, d) => acc + d.minutes, 0),
    }
  }, [dailyProgress])

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-success" />
          Daily Progress
        </CardTitle>
        <CardDescription>
          Your study activity heatmap for the last 365 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 shadow-sm">
            <p className="text-xs text-muted-foreground">Active Days</p>
            <p className="text-lg font-semibold text-foreground">{heatmap.activeDays}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 shadow-sm">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-lg font-semibold text-foreground">{heatmap.totalSessions}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Hours</p>
            <p className="text-lg font-semibold text-foreground">{(heatmap.totalMinutes / 60).toFixed(1)}h</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-40 w-full flex items-center justify-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[760px] rounded-xl border border-border/60 bg-muted/10 p-4 shadow-sm">
              <div className="relative mb-3 h-5 text-[10px] font-medium text-muted-foreground">
                {heatmap.monthMarkers.map((marker) => (
                  <span
                    key={marker.day}
                    className="absolute"
                    style={{ left: `${marker.index * 15}px` }}
                  >
                    {marker.label}
                  </span>
                ))}
              </div>

              <div className="grid grid-flow-col auto-cols-[12px] grid-rows-7 gap-[3px] rounded-lg bg-background/60 p-2">
                {heatmap.weeks.flat().map((cell) => {
                  const colorClass =
                    cell.level === 0
                      ? 'bg-muted/70 ring-1 ring-border/50'
                      : cell.level === 1
                        ? 'bg-emerald-200 ring-1 ring-emerald-300/70'
                        : cell.level === 2
                          ? 'bg-emerald-300 ring-1 ring-emerald-400/70'
                          : cell.level === 3
                            ? 'bg-emerald-500 ring-1 ring-emerald-600/60'
                            : 'bg-emerald-600 ring-1 ring-emerald-700/70'

                  return (
                    <div
                      key={cell.date}
                      className={`h-3 w-3 rounded-[2px] ${colorClass}`}
                      title={`${cell.date} - ${cell.minutes} min, ${cell.sessions} sessions`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 text-xs font-medium text-muted-foreground">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[2px] bg-muted/70 ring-1 ring-border/50" />
          <span className="h-3 w-3 rounded-[2px] bg-emerald-200 ring-1 ring-emerald-300/70" />
          <span className="h-3 w-3 rounded-[2px] bg-emerald-300 ring-1 ring-emerald-400/70" />
          <span className="h-3 w-3 rounded-[2px] bg-emerald-500 ring-1 ring-emerald-600/60" />
          <span className="h-3 w-3 rounded-[2px] bg-emerald-600 ring-1 ring-emerald-700/70" />
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
