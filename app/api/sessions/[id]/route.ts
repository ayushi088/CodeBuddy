import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const {
      end_time,
      actual_duration_minutes,
      avg_focus_score,
      total_alerts,
      total_distractions,
      notes,
    } = body

    const result = await query(
      `UPDATE study_sessions 
       SET end_time = COALESCE($1, end_time),
           actual_duration_minutes = COALESCE($2, actual_duration_minutes),
           avg_focus_score = COALESCE($3, avg_focus_score),
           total_alerts = COALESCE($4, total_alerts),
           total_distractions = COALESCE($5, total_distractions),
           notes = COALESCE($6, notes),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        end_time,
        actual_duration_minutes,
        avg_focus_score,
        total_alerts,
        total_distractions,
        notes,
        id,
        payload.userId,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update user stats after session ends
    if (end_time && actual_duration_minutes) {
      await updateUserStats(payload.userId, actual_duration_minutes, avg_focus_score)
    }

    return NextResponse.json({ session: result.rows[0] })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

async function updateUserStats(userId: string, durationMinutes: number, focusScore: number) {
  try {
    // Get current streak info
    const streakResult = await query(
      `SELECT current_streak, last_study_date FROM user_stats WHERE user_id = $1`,
      [userId]
    )

    const today = new Date().toISOString().split('T')[0]
    let newStreak = 1

    if (streakResult.rows.length > 0) {
      const { current_streak, last_study_date } = streakResult.rows[0]
      const lastDate = last_study_date ? new Date(last_study_date).toISOString().split('T')[0] : null

      if (lastDate === today) {
        // Already studied today, keep streak
        newStreak = current_streak
      } else {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (lastDate === yesterdayStr) {
          // Studied yesterday, increment streak
          newStreak = current_streak + 1
        }
        // Otherwise, streak resets to 1
      }
    }

    // Upsert user stats
    await query(
      `INSERT INTO user_stats (user_id, total_study_minutes, total_sessions, avg_focus_score, current_streak, longest_streak, last_study_date)
       VALUES ($1, $2, 1, $3, $4, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         total_study_minutes = user_stats.total_study_minutes + $2,
         total_sessions = user_stats.total_sessions + 1,
         avg_focus_score = (user_stats.avg_focus_score * user_stats.total_sessions + $3) / (user_stats.total_sessions + 1),
         current_streak = $4,
         longest_streak = GREATEST(user_stats.longest_streak, $4),
         last_study_date = $5,
         updated_at = NOW()`,
      [userId, durationMinutes, focusScore || 0, newStreak, today]
    )

    // Award points
    const pointsEarned = Math.floor(durationMinutes * 2 + (focusScore || 0) * 0.5)
    await query(
      `UPDATE user_stats SET total_points = total_points + $1 WHERE user_id = $2`,
      [pointsEarned, userId]
    )
  } catch (error) {
    console.error('Update user stats error:', error)
  }
}
