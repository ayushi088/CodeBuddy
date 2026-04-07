'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BrainCircuit, Clock3, Gauge, LineChart as LineChartIcon } from 'lucide-react'

export type ReportAnalyticsDay = {
  date: string
  studyMinutes: number
  studyHours: number
  avgFocusScore: number
  sessions: number
  productivityScore: number
  completionRate: number
}

function formatDayLabel(dateValue: string) {
  const date = new Date(dateValue)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function emptyState(message: string) {
  return (
    <div className="h-[280px] flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export function FocusScoreGraph({ data, isLoading }: { data: ReportAnalyticsDay[]; isLoading?: boolean }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <LineChartIcon className="w-5 h-5 text-primary" />
          Focus Score Graph
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center"><Spinner className="w-5 h-5" /></div>
        ) : data.length === 0 ? (
          emptyState('No focus data recorded for this period')
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.map((item) => ({ ...item, label: formatDayLabel(item.date) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium text-popover-foreground">{label}</p>
                          <p className="text-sm text-muted-foreground">Focus Score: <span className="text-primary font-medium">{payload[0].value}%</span></p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line type="monotone" dataKey="avgFocusScore" stroke="var(--primary)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function StudyTimeGraph({ data, isLoading }: { data: ReportAnalyticsDay[]; isLoading?: boolean }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Clock3 className="w-5 h-5 text-accent" />
          Study Time Graph
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center"><Spinner className="w-5 h-5" /></div>
        ) : data.length === 0 ? (
          emptyState('No study sessions recorded for this period')
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.map((item) => ({ ...item, label: formatDayLabel(item.date) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={56} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium text-popover-foreground">{label}</p>
                          <p className="text-sm text-muted-foreground">Study Time: <span className="text-accent font-medium">{payload[0].value}h</span></p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="studyHours" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ProductivityGraph({ data, isLoading }: { data: ReportAnalyticsDay[]; isLoading?: boolean }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-success" />
          Productivity Graph
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center"><Spinner className="w-5 h-5" /></div>
        ) : data.length === 0 ? (
          emptyState('No productivity data recorded for this period')
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.map((item) => ({ ...item, label: formatDayLabel(item.date) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium text-popover-foreground">{label}</p>
                          <p className="text-sm text-muted-foreground">Productivity: <span className="text-success font-medium">{payload[0].value}%</span></p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="productivityScore" stroke="var(--success)" strokeWidth={2} fill="url(#productivityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function WeeklyProgressGraph({ data, isLoading }: { data: ReportAnalyticsDay[]; isLoading?: boolean }) {
  const weekData = data.slice(-7)

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Gauge className="w-5 h-5 text-warning" />
          Weekly Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center"><Spinner className="w-5 h-5" /></div>
        ) : weekData.length === 0 ? (
          emptyState('No weekly progress data recorded yet')
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData.map((item) => ({ ...item, label: formatDayLabel(item.date) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium text-popover-foreground">{label}</p>
                          <p className="text-sm text-muted-foreground">Goal completion: <span className="text-warning font-medium">{payload[0].value}%</span></p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine y={100} stroke="var(--warning)" strokeDasharray="4 4" />
                <Bar dataKey="completionRate" fill="var(--warning)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
