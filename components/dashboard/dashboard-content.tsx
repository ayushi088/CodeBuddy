'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import {
  Play,
  Clock,
  Target,
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  BookOpen,
  Zap,
} from 'lucide-react'
import { FocusChart } from './focus-chart'
import { RecentSessions } from './recent-sessions'
import { UpcomingTasks } from './upcoming-tasks'
import type { User } from '@/lib/auth-context'

interface DashboardContentProps {
  user: User | null
}

export function DashboardContent({ user }: DashboardContentProps) {
  const greeting = getGreeting()
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready to focus and achieve your goals today?
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/study">
            <Play className="w-4 h-4" />
            Start Study Session
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Today's Study Time"
          value="0h 0m"
          subtitle="Goal: 4 hours"
          icon={Clock}
          progress={0}
          color="primary"
        />
        <StatCard
          title="Focus Score"
          value="--"
          subtitle="No sessions today"
          icon={Target}
          color="accent"
        />
        <StatCard
          title="Current Streak"
          value="0 days"
          subtitle="Start studying to build streak"
          icon={Flame}
          color="warning"
        />
        <StatCard
          title="Total Points"
          value="0"
          subtitle="Level 1"
          icon={Trophy}
          color="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Focus Trend Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Focus Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FocusChart />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/study">
                <Play className="w-4 h-4" />
                Start Studying
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/planner">
                <Calendar className="w-4 h-4" />
                View Schedule
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/reports">
                <TrendingUp className="w-4 h-4" />
                View Reports
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start gap-2">
              <Link href="/planner?tab=subjects">
                <BookOpen className="w-4 h-4" />
                Manage Subjects
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RecentSessions />
        <UpcomingTasks />
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  progress?: number
  color: 'primary' | 'accent' | 'warning' | 'success'
}

function StatCard({ title, value, subtitle, icon: Icon, progress, color }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    warning: 'text-warning bg-warning/10',
    success: 'text-success bg-success/10',
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-card-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="mt-4 h-1.5" />
        )}
      </CardContent>
    </Card>
  )
}
