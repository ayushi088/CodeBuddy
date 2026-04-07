import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

type DailyAnalyticsRow = {
  study_date: string
  study_minutes: number
  avg_focus_score: number
  sessions: number
}

type PgErrorWithCode = Error & { code?: string }

function isMissingAvgFocusScoreColumn(error: unknown): boolean {
  const err = error as PgErrorWithCode
  return err?.code === '42703' && (err?.message || '').includes('avg_focus_score')
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('days') || '30'
    const days = range === 'all' ? 365 : Math.min(Math.max(Number.parseInt(range, 10) || 30, 7), 365)
    const goalMinutes = user.study_preferences?.daily_study_goal_minutes || 120

    let rows: DailyAnalyticsRow[] = []

    try {
      rows = await query<DailyAnalyticsRow>(
        `SELECT
           DATE(start_time)::text AS study_date,
           COALESCE(SUM(COALESCE(actual_duration_minutes, planned_duration_minutes, 0)), 0)::int AS study_minutes,
           COALESCE(ROUND(AVG(COALESCE(avg_focus_score, 0))::numeric, 2), 0)::float8 AS avg_focus_score,
           COUNT(*)::int AS sessions
         FROM study_sessions
         WHERE user_id = $1
           AND start_time >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
         GROUP BY DATE(start_time)
         ORDER BY DATE(start_time) ASC`,
        [user.id, days]
      )
    } catch (error) {
      if (!isMissingAvgFocusScoreColumn(error)) {
        throw error
      }

      // Legacy schema fallback when avg_focus_score does not exist on study_sessions.
      rows = await query<DailyAnalyticsRow>(
        `SELECT
           DATE(start_time)::text AS study_date,
           COALESCE(SUM(COALESCE(actual_duration_minutes, planned_duration_minutes, 0)), 0)::int AS study_minutes,
           0::float8 AS avg_focus_score,
           COUNT(*)::int AS sessions
         FROM study_sessions
         WHERE user_id = $1
           AND start_time >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
         GROUP BY DATE(start_time)
         ORDER BY DATE(start_time) ASC`,
        [user.id, days]
      )
    }

    const daily = rows.map((row) => {
      const productivityScore = Math.min(
        100,
        Math.round((row.study_minutes / goalMinutes) * 70 + row.avg_focus_score * 0.3)
      )

      const completionRate = Math.min(100, Math.round((row.study_minutes / goalMinutes) * 100))

      return {
        date: row.study_date,
        studyMinutes: row.study_minutes,
        studyHours: Number((row.study_minutes / 60).toFixed(1)),
        avgFocusScore: Number(row.avg_focus_score.toFixed(1)),
        sessions: row.sessions,
        productivityScore,
        completionRate,
      }
    })

    return NextResponse.json({
      goalMinutes,
      days,
      daily,
    })
  } catch (error) {
    console.error('Get reports analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report analytics' },
      { status: 500 }
    )
  }
}
