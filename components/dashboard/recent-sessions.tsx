'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Target, BookOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Session {
  id: number
  subject: string
  duration: string
  focusScore: number
  date: string
}

export function RecentSessions() {
  // Placeholder - will be replaced with real data from API
  const sessions: Session[] = []

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Sessions
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/reports">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No recent sessions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a study session to see your history
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/study">Start Studying</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.subject}</p>
                    <p className="text-xs text-muted-foreground">{session.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{session.duration}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-accent/10">
                    <Target className="w-3 h-3 text-accent" />
                    <span className="text-xs font-medium text-accent">{session.focusScore}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
