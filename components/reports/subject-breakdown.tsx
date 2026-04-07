'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { PieChart, BookOpen, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { useSubjects } from '@/hooks/use-subjects'

interface SubjectBreakdownProps {
  timeRange: string
}

export function SubjectBreakdown({ timeRange }: SubjectBreakdownProps) {
  const { subjects: savedSubjects } = useSubjects()
  const subjects = savedSubjects.map(subject => ({
    name: subject.name,
    hours: subject.studiedHoursThisWeek,
    color: subject.color,
    targetHours: subject.targetHoursPerWeek,
  }))

  const fallbackSubjects = [
    { name: 'DSA', hours: 3, color: '#3B82F6', targetHours: 8 },
    { name: 'ML', hours: 2, color: '#10B981', targetHours: 6 },
    { name: 'DBMS', hours: 1, color: '#8B5CF6', targetHours: 5 },
  ]

  const displaySubjects = subjects.length > 0 ? subjects : fallbackSubjects

  const totalHours = displaySubjects.reduce((sum, s) => sum + s.hours, 0)
  const totalTargetHours = displaySubjects.reduce((sum, s) => sum + s.targetHours, 0)

  const strongSubject = [...displaySubjects].sort((a, b) => (b.hours / Math.max(b.targetHours, 1)) - (a.hours / Math.max(a.targetHours, 1)))[0]
  const weakSubject = [...displaySubjects].sort((a, b) => (a.hours / Math.max(a.targetHours, 1)) - (b.hours / Math.max(b.targetHours, 1)))[0]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Time Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalHours === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px]">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              {subjects.length === 0 ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Showing example subject-wise performance
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Add subjects first so reports can track your actual data.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    No study time recorded
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Start studying to see your time distribution
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={displaySubjects}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="hours"
                    nameKey="name"
                  >
                    {displaySubjects.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                            <p className="text-sm font-medium text-popover-foreground">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.hours}h studied ({((data.hours / totalHours) * 100).toFixed(1)}%)
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Progress */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent" />
            Subject Progress (Weekly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            {displaySubjects.map((subject) => {
              const progress = subject.targetHours > 0
                ? Math.min((subject.hours / subject.targetHours) * 100, 100)
                : 0
              
              return (
                <div key={subject.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm font-medium text-foreground">{subject.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {subject.hours}h / {subject.targetHours}h
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2"
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Progress</span>
              <span className="text-sm font-medium text-foreground">
                {totalHours}h / {totalTargetHours}h ({totalTargetHours > 0 ? Math.round((totalHours / totalTargetHours) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-success/10 border border-success/20 p-3">
              <div className="flex items-center gap-2 text-success">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-sm font-medium">Strong Subject</span>
              </div>
              <p className="text-base font-semibold text-foreground mt-2">{strongSubject.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{strongSubject.hours} hours studied</p>
            </div>
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
              <div className="flex items-center gap-2 text-warning">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-sm font-medium">Weak Subject</span>
              </div>
              <p className="text-base font-semibold text-foreground mt-2">{weakSubject.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{weakSubject.hours} hours studied</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
