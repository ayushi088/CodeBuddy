import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getLevelFromPoints } from '@/lib/gamification'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user stats
    const statsResult = await query(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [payload.userId]
    )

    const defaultStats = {
      total_study_minutes: 0,
      total_sessions: 0,
      avg_focus_score: 0,
      current_streak: 0,
      longest_streak: 0,
      total_points: 0,
      last_study_date: null,
    }

    const stats = statsResult.rows[0] || defaultStats

    // Get today's stats
    const todayResult = await query(
      `SELECT 
         COALESCE(SUM(actual_duration_minutes), 0) as today_minutes,
         COUNT(*) as today_sessions,
         COALESCE(AVG(avg_focus_score), 0) as today_focus
       FROM study_sessions 
       WHERE user_id = $1 AND DATE(start_time) = CURRENT_DATE`,
      [payload.userId]
    )

    const todayStats = todayResult.rows[0]

    // Get weekly stats
    const weeklyResult = await query(
      `SELECT 
         COALESCE(SUM(actual_duration_minutes), 0) as week_minutes,
         COUNT(*) as week_sessions,
         COALESCE(AVG(avg_focus_score), 0) as week_focus
       FROM study_sessions 
       WHERE user_id = $1 AND start_time >= CURRENT_DATE - INTERVAL '7 days'`,
      [payload.userId]
    )

    const weeklyStats = weeklyResult.rows[0]

    // Get badges
    const badgesResult = await query(
      `SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1`,
      [payload.userId]
    )

    // Calculate level
    const levelInfo = getLevelFromPoints(stats.total_points)

    return NextResponse.json({
      stats: {
        totalStudyMinutes: stats.total_study_minutes,
        totalSessions: stats.total_sessions,
        avgFocusScore: stats.avg_focus_score,
        currentStreak: stats.current_streak,
        longestStreak: stats.longest_streak,
        totalPoints: stats.total_points,
        lastStudyDate: stats.last_study_date,
      },
      today: {
        minutes: todayStats.today_minutes,
        sessions: todayStats.today_sessions,
        focusScore: todayStats.today_focus,
      },
      week: {
        minutes: weeklyStats.week_minutes,
        sessions: weeklyStats.week_sessions,
        focusScore: weeklyStats.week_focus,
      },
      level: levelInfo,
      badges: badgesResult.rows,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
