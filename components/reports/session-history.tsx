'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Target, Calendar, ChevronRight, BookOpen } from 'lucide-react'

interface SessionHistoryProps {
  timeRange: string
}

interface Session {
  id: string
  subject: string
  subjectColor: string
  date: string
  duration: string
  focusScore: number
  status: 'completed' | 'abandoned' | 'paused'
}

export function SessionHistory({ timeRange }: SessionHistoryProps) {
  // Placeholder - will be populated from DB
  const sessions: Session[] = []

  const getStatusBadge = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-success/10 text-success">Completed</Badge>
      case 'abandoned':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive">Abandoned</Badge>
      case 'paused':
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Paused</Badge>
    }
  }

  const getFocusColor = (score: number) => {
    if (score >= 70) return 'text-success'
    if (score >= 40) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Session History
        </CardTitle>
        <span className="text-sm text-muted-foreground">{sessions.length} sessions</span>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              No study sessions found
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Start a study session to see your history
            </p>
            <Button asChild className="mt-4">
              <a href="/study">Start Studying</a>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-4 hover:bg-muted/50 -mx-6 px-6 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${session.subjectColor}20` }}
                  >
                    <BookOpen className="w-5 h-5" style={{ color: session.subjectColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{session.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {session.date}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {session.duration}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Target className={`w-4 h-4 ${getFocusColor(session.focusScore)}`} />
                      <span className={`text-sm font-medium ${getFocusColor(session.focusScore)}`}>
                        {session.focusScore}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Focus Score</p>
                  </div>
                  {getStatusBadge(session.status)}
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
