import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

type DailyProgressRow = {
  study_date: string
  total_minutes: number
  sessions: number
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = Number.parseInt(searchParams.get('days') || '365', 10)
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 30), 730) : 365

    const rows = await query<DailyProgressRow>(
      `SELECT
         DATE(start_time)::text AS study_date,
         COALESCE(SUM(COALESCE(actual_duration_minutes, planned_duration_minutes, 0)), 0)::int AS total_minutes,
         COUNT(*)::int AS sessions
       FROM study_sessions
       WHERE user_id = $1
         AND start_time >= CURRENT_DATE - (($2::int - 1) * INTERVAL '1 day')
       GROUP BY DATE(start_time)
       ORDER BY DATE(start_time) ASC`,
      [user.id, days]
    )

    return NextResponse.json({ progress: rows })
  } catch (error) {
    console.error('Get daily progress error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily progress' },
      { status: 500 }
    )
  }
}
