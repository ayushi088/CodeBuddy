'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function FocusChart() {
  const data = useMemo(() => {
    // Generate last 7 days with placeholder data
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      days.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        focus: 0,
        hours: 0,
      })
    }
    return days
  }, [])

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.2 250)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.65 0.2 250)" stopOpacity={0} />
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
                      Focus: <span className="text-primary font-medium">{payload[0].value}%</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Study: <span className="text-accent font-medium">{payload[1]?.value || 0}h</span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="focus"
            stroke="oklch(0.65 0.2 250)"
            strokeWidth={2}
            fill="url(#focusGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">Focus Score</span>
        </div>
      </div>
    </div>
  )
}
