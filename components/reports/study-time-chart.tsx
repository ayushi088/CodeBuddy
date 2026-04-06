'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface StudyTimeChartProps {
  timeRange: string
}

export function StudyTimeChart({ timeRange }: StudyTimeChartProps) {
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
        hours: 0, // Placeholder - will be populated from DB
      })
    }
    
    return result
  }, [timeRange])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Study Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval={data.length > 14 ? 'preserveStartEnd' : 0}
                angle={data.length > 14 ? -45 : 0}
                textAnchor={data.length > 14 ? 'end' : 'middle'}
                height={data.length > 14 ? 60 : 30}
              />
              <YAxis
                stroke="oklch(0.6 0 0)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium text-popover-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Study Time: <span className="text-primary font-medium">{payload[0].value}h</span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="hours"
                fill="oklch(0.65 0.2 250)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center mt-4">
          <p className="text-sm text-muted-foreground">
            No study sessions recorded for this period
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
