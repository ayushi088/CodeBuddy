'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Calendar,
  Download,
  FileText,
  PieChart,
} from 'lucide-react'
import { StudyTimeChart } from './study-time-chart'
import { FocusTrendChart } from './focus-trend-chart'
import { SubjectBreakdown } from './subject-breakdown'
import { SessionHistory } from './session-history'
import { AttendanceReport } from './attendance-report'

export function ReportsContent() {
  const [timeRange, setTimeRange] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')

  const handleExportPDF = () => {
    // TODO: Implement PDF export using jspdf
    alert('PDF export will be implemented with jspdf')
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your study progress and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Study Time"
          value="0h 0m"
          change={0}
          icon={Clock}
          color="primary"
        />
        <StatCard
          title="Average Focus"
          value="--"
          change={0}
          icon={Target}
          color="accent"
        />
        <StatCard
          title="Sessions Completed"
          value="0"
          change={0}
          icon={FileText}
          color="success"
        />
        <StatCard
          title="Attendance Rate"
          value="--"
          change={0}
          icon={Calendar}
          color="warning"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="focus" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Focus Analysis
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <PieChart className="w-4 h-4" />
            Subjects
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Calendar className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudyTimeChart timeRange={timeRange} />
            <FocusTrendChart timeRange={timeRange} />
          </div>
        </TabsContent>

        <TabsContent value="focus">
          <FocusTrendChart timeRange={timeRange} detailed />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectBreakdown timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceReport timeRange={timeRange} />
        </TabsContent>

        <TabsContent value="history">
          <SessionHistory timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  change: number
  icon: React.ComponentType<{ className?: string }>
  color: 'primary' | 'accent' | 'success' | 'warning'
}

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-card-foreground mt-1">{value}</p>
            {change !== 0 && (
              <p className={`text-xs mt-1 ${change > 0 ? 'text-success' : 'text-destructive'}`}>
                {change > 0 ? '+' : ''}{change}% vs last period
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
