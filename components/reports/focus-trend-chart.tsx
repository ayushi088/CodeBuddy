'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts'

interface FocusTrendChartProps {
  timeRange: string
  detailed?: boolean
}

export function FocusTrendChart({ timeRange, detailed = false }: FocusTrendChartProps) {
  const data = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 14
    const result = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toLocaleDateString('en-US', { 
          weekday: days <= 7 ? 'short' : undefined,
          month: 'short',
          day: 'numeric',
        }),
        avgFocus: 0,
        maxFocus: 0,
        minFocus: 0,
        sessions: 0,
      })
    }
    
    return result
  }, [timeRange])

  if (detailed) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Focus Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-foreground">--</p>
              <p className="text-sm text-muted-foreground">Average Focus Score</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-success">--</p>
              <p className="text-sm text-muted-foreground">Best Focus Score</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold text-warning">--</p>
              <p className="text-sm text-muted-foreground">Improvement Needed</p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="oklch(0.6 0 0)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.6 0 0)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="text-sm font-medium text-popover-foreground">{label}</p>
                          <p className="text-sm text-primary">Avg: {payload[0].value}%</p>
                          <p className="text-sm text-success">Max: {payload[1]?.value}%</p>
                          <p className="text-sm text-warning">Min: {payload[2]?.value}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgFocus"
                  stroke="oklch(0.65 0.2 250)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="maxFocus"
                  stroke="oklch(0.65 0.18 145)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="minFocus"
                  stroke="oklch(0.75 0.18 85)"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Average</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Maximum</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 rounded-full bg-warning" />
              <span className="text-xs text-muted-foreground">Minimum</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Focus Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.15 180)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.7 0.15 180)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium text-popover-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Focus: <span className="text-accent font-medium">{payload[0].value}%</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="avgFocus"
                stroke="oklch(0.7 0.15 180)"
                strokeWidth={2}
                fill="url(#focusGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center mt-4">
          <p className="text-sm text-muted-foreground">
            No focus data recorded for this period
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
