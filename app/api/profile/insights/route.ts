import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { queryOne, query } from '@/lib/db'

type SubjectRow = {
  id: number
  name: string
}

type StatsRow = {
  current_streak: number
  avg_focus_score: number
}

type BadgeCountRow = {
  total: number
}

type WeeklyGoalsRow = {
  completed_days: number
}

function isMissingRelationError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '42P01'
  )
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let subjects: SubjectRow[] = []
    try {
      subjects = await query<SubjectRow>(
        `SELECT id, name
         FROM subjects
         WHERE user_id = $1
         ORDER BY name ASC`,
        [user.id]
      )
    } catch (error) {
      if (!isMissingRelationError(error)) throw error
    }

    let stats: StatsRow | null = null
    try {
      stats = await queryOne<StatsRow>(
        `SELECT current_streak, avg_focus_score
         FROM user_stats
         WHERE user_id = $1`,
        [user.id]
      )
    } catch (error) {
      if (!isMissingRelationError(error)) throw error
    }

    let badges: BadgeCountRow | null = null
    try {
      badges = await queryOne<BadgeCountRow>(
        `SELECT COUNT(*)::int AS total
         FROM user_badges
         WHERE user_id = $1`,
        [user.id]
      )
    } catch (error) {
      if (!isMissingRelationError(error)) throw error
    }

    const dailyGoalMinutes = user.study_preferences?.daily_study_goal_minutes ?? 120

    let weeklyGoals: WeeklyGoalsRow | null = null
    try {
      weeklyGoals = await queryOne<WeeklyGoalsRow>(
        `SELECT COUNT(*)::int AS completed_days
         FROM (
           SELECT DATE(start_time) AS day,
             COALESCE(SUM(COALESCE(actual_duration_minutes, planned_duration_minutes, 0)), 0) AS total_minutes
           FROM study_sessions
           WHERE user_id = $1
             AND start_time >= CURRENT_DATE - INTERVAL '6 days'
           GROUP BY DATE(start_time)
         ) daily
         WHERE total_minutes >= $2`,
        [user.id, dailyGoalMinutes]
      )
    } catch (error) {
      if (!isMissingRelationError(error)) throw error
    }

    const avgFocus = Number(stats?.avg_focus_score ?? 0)

    const suggestions: string[] = []
    if ((stats?.current_streak ?? 0) < 3) {
      suggestions.push('Start with two focused sessions today to build a stronger study streak.')
    }
    if (avgFocus < 70) {
      suggestions.push('Try a 25/5 pomodoro cycle and keep your phone away to improve focus score.')
    }
    if ((weeklyGoals?.completed_days ?? 0) < 4) {
      suggestions.push('You are below your weekly goal pace. Add one catch-up block this weekend.')
    }
    if (suggestions.length === 0) {
      suggestions.push('Great momentum. Increase your daily goal by 15 minutes this week for faster progress.')
    }

    return NextResponse.json({
      subjects,
      achievements: {
        studyStreak: Number(stats?.current_streak ?? 0),
        weeklyGoalsCompleted: Number(weeklyGoals?.completed_days ?? 0),
        productivityBadges: Number(badges?.total ?? 0),
        focusChampion: avgFocus >= 85,
      },
      aiSuggestions: suggestions,
    })
  } catch (error) {
    console.error('Get profile insights error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile insights' },
      { status: 500 }
    )
  }
}
