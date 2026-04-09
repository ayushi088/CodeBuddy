'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Bell,
  Coffee,
  AlertTriangle,
  CalendarClock,
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
  const [isProfileSubmitted, setIsProfileSubmitted] = useState(false)
  const currentFocusLevel = 85
  const moodStatus = 'Focused'
  const productivityLevel = 'High'
  const smartAlerts = [
    {
      id: 'upcoming-session',
      title: 'Upcoming Session Alert',
      message: "Your DBMS session starts in 10 minutes",
      icon: CalendarClock,
      tone: 'primary' as const,
    },
    {
      id: 'take-break',
      title: 'Take Break Alert',
      message: 'You have been studying for 90 minutes. Take a 10 minute break.',
      icon: Coffee,
      tone: 'warning' as const,
    },
    {
      id: 'low-focus',
      title: 'Low Focus Alert',
      message: 'Focus has dropped below 70%. Consider reducing distractions.',
      icon: AlertTriangle,
      tone: 'destructive' as const,
    },
    {
      id: 'missed-session',
      title: 'Missed Session Alert',
      message: 'You missed your 8:00 AM session. Mark attendance as absent.',
      icon: Bell,
      tone: 'success' as const,
    },
  ]

  useEffect(() => {
    if (!user) return

    try {
      const raw = localStorage.getItem(`profile-settings-${user.id}`)
      if (!raw) {
        setIsProfileSubmitted(Boolean(user.avatar_url))
        return
      }

      const parsed = JSON.parse(raw) as { isProfileSubmitted?: boolean }
      setIsProfileSubmitted(Boolean(parsed.isProfileSubmitted) || Boolean(user.avatar_url))
    } catch {
      setIsProfileSubmitted(Boolean(user?.avatar_url))
    }
  }, [user])

  const initials = (user?.full_name || 'A')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
        <div className="flex items-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link href="/study">
              <Play className="w-4 h-4" />
              Start Study Session
            </Link>
          </Button>

          {isProfileSubmitted && (
            <Link
              href="/profile"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-muted/50"
              aria-label="Open account"
              title="Account"
            >
              <Avatar className="h-8 w-8 border border-primary/30">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground pr-1">Account</span>
            </Link>
          )}
        </div>
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

      {/* Emotion / Focus Status */}
      <Card className="bg-card border-border mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Emotion / Focus Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Focus Level</p>
            <p className="text-3xl font-bold text-foreground mt-2">{currentFocusLevel}%</p>
            <Progress value={currentFocusLevel} className="mt-3 h-2" />
          </div>

          <div className="rounded-xl bg-accent/10 border border-accent/20 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Mood Status</p>
            <p className="text-3xl font-bold text-foreground mt-2">{moodStatus}</p>
            <p className="text-sm text-muted-foreground mt-3">Example: Focus → 85% • Mood → Focused</p>
          </div>

          <div className="rounded-xl bg-success/10 border border-success/20 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Productivity Level</p>
            <p className="text-3xl font-bold text-foreground mt-2">{productivityLevel}</p>
            <p className="text-sm text-muted-foreground mt-3">Keep the momentum going with a steady study streak.</p>
          </div>
        </CardContent>
      </Card>

      {/* Smart Alerts Panel */}
      <Card className="bg-card border-border mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-warning" />
            Smart Alerts Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {smartAlerts.map((alert) => {
            const Icon = alert.icon
            const toneClasses = {
              primary: 'bg-primary/10 border-primary/20 text-primary',
              warning: 'bg-warning/10 border-warning/20 text-warning',
              destructive: 'bg-destructive/10 border-destructive/20 text-destructive',
              success: 'bg-success/10 border-success/20 text-success',
            }

            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${toneClasses[alert.tone]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-background/80 p-2 shadow-sm">
                    <Icon className={`w-5 h-5 ${alert.tone === 'primary' ? 'text-primary' : alert.tone === 'warning' ? 'text-warning' : alert.tone === 'destructive' ? 'text-destructive' : 'text-success'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

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
