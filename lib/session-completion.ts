import type { PoolClient } from 'pg'

type PgErrorWithCode = Error & { code?: string; message?: string }

export type SessionCompletionPayload = {
  endTime?: string | null
  actualDurationMinutes: number
  avgFocusScore?: number | null
  totalAlerts?: number | null
  totalDistractions?: number | null
  notes?: string | null
}

export function isUndefinedColumnError(error: unknown, columnName?: string): boolean {
  const err = error as PgErrorWithCode
  if (err?.code !== '42703') return false
  if (!columnName) return true
  return (err.message || '').includes(columnName)
}

export function clampFocusScore(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return Math.max(0, Math.min(100, Number(value.toFixed(2))))
}

export async function finalizeStudySession(client: PoolClient, args: {
  sessionId: string
  userId: number
  payload: SessionCompletionPayload
}) {
  const { sessionId, userId, payload } = args
  const normalizedFocus = clampFocusScore(payload.avgFocusScore)

  try {
    const result = await client.query(
      `UPDATE study_sessions
       SET end_time = COALESCE($1, end_time),
           actual_duration_minutes = COALESCE($2, actual_duration_minutes),
           avg_focus_score = COALESCE($3, avg_focus_score),
           total_alerts = COALESCE($4, total_alerts),
           total_distractions = COALESCE($5, total_distractions),
           notes = COALESCE($6, notes),
           status = 'completed',
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        payload.endTime || null,
        payload.actualDurationMinutes,
        normalizedFocus,
        payload.totalAlerts ?? null,
        payload.totalDistractions ?? null,
        payload.notes?.trim() || null,
        sessionId,
        userId,
      ]
    )

    return result.rows[0] || null
  } catch (error) {
    if (!isUndefinedColumnError(error)) {
      throw error
    }

    // Legacy schema fallback with average_focus_score and fewer tracking columns.
    try {
      const fallback = await client.query(
        `UPDATE study_sessions
         SET end_time = COALESCE($1, end_time),
             actual_duration_minutes = COALESCE($2, actual_duration_minutes),
             average_focus_score = COALESCE($3, average_focus_score),
             notes = COALESCE($4, notes)
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [
          payload.endTime || null,
          payload.actualDurationMinutes,
          normalizedFocus,
          payload.notes?.trim() || null,
          sessionId,
          userId,
        ]
      )
      return fallback.rows[0] || null
    } catch (fallbackError) {
      if (!isUndefinedColumnError(fallbackError, 'average_focus_score')) {
        throw fallbackError
      }

      const minimal = await client.query(
        `UPDATE study_sessions
         SET end_time = COALESCE($1, end_time),
             actual_duration_minutes = COALESCE($2, actual_duration_minutes),
             notes = COALESCE($3, notes)
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [
          payload.endTime || null,
          payload.actualDurationMinutes,
          payload.notes?.trim() || null,
          sessionId,
          userId,
        ]
      )
      return minimal.rows[0] || null
    }
  }
}

export async function updateUserStatsAfterCompletion(
  client: PoolClient,
  userId: number,
  durationMinutes: number,
  focusScore: number | null,
) {
  const safeDuration = Math.max(0, Math.round(durationMinutes))
  if (safeDuration <= 0) {
    return
  }

  const safeFocus = focusScore ?? 0
  const today = new Date().toISOString().split('T')[0]

  try {
    const streakResult = await client.query(
      `SELECT current_streak, last_study_date
       FROM user_stats
       WHERE user_id = $1`,
      [userId]
    )

    let newStreak = 1
    if (streakResult.rows.length > 0) {
      const { current_streak, last_study_date } = streakResult.rows[0]
      const lastDate = last_study_date
        ? new Date(last_study_date).toISOString().split('T')[0]
        : null

      if (lastDate === today) {
        newStreak = current_streak
      } else {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        if (lastDate === yesterdayStr) {
          newStreak = current_streak + 1
        }
      }
    }

    try {
      await client.query(
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
        [userId, safeDuration, safeFocus, newStreak, today]
      )
    } catch (statsError) {
      if (!isUndefinedColumnError(statsError)) {
        throw statsError
      }

      // Legacy fallback when avg_focus_score or updated_at columns are unavailable.
      await client.query(
        `INSERT INTO user_stats (user_id, total_study_minutes, total_sessions, current_streak, longest_streak, last_study_date)
         VALUES ($1, $2, 1, $3, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           total_study_minutes = user_stats.total_study_minutes + $2,
           total_sessions = user_stats.total_sessions + 1,
           current_streak = $3,
           longest_streak = GREATEST(user_stats.longest_streak, $3),
           last_study_date = $4`,
        [userId, safeDuration, newStreak, today]
      )
    }

    const pointsEarned = Math.max(0, Math.floor(safeDuration * 2 + safeFocus * 0.5))
    if (pointsEarned > 0) {
      try {
        await client.query(
          `UPDATE user_stats
           SET total_points = COALESCE(total_points, 0) + $1
           WHERE user_id = $2`,
          [pointsEarned, userId]
        )
      } catch (pointsError) {
        if (!isUndefinedColumnError(pointsError, 'total_points')) {
          throw pointsError
        }
      }
    }
  } catch (error) {
    const err = error as PgErrorWithCode
    // Gracefully skip stats update for deployments without user_stats table.
    if (err?.code === '42P01') {
      return
    }
    throw error
  }
}