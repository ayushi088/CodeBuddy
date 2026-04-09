import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  clampFocusScore,
  finalizeStudySession,
  updateUserStatsAfterCompletion,
} from '@/lib/session-completion'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    if (
      actual_duration_minutes !== undefined &&
      (!Number.isFinite(actual_duration_minutes) || actual_duration_minutes < 0)
    ) {
      return NextResponse.json(
        { error: 'actual_duration_minutes must be a non-negative number' },
        { status: 400 }
      )
    }

    if (
      total_alerts !== undefined &&
      (!Number.isInteger(total_alerts) || total_alerts < 0)
    ) {
      return NextResponse.json(
        { error: 'total_alerts must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (
      total_distractions !== undefined &&
      (!Number.isInteger(total_distractions) || total_distractions < 0)
    ) {
      return NextResponse.json(
        { error: 'total_distractions must be a non-negative integer' },
        { status: 400 }
      )
    }

    const normalizedFocus = clampFocusScore(avg_focus_score)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const session = await finalizeStudySession(client, {
        sessionId: id,
        userId: user.id,
        payload: {
          endTime: end_time || null,
          actualDurationMinutes: Number(actual_duration_minutes ?? 0),
          avgFocusScore: normalizedFocus,
          totalAlerts: total_alerts,
          totalDistractions: total_distractions,
          notes: typeof notes === 'string' ? notes : null,
        },
      })

      if (!session) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (end_time && Number(actual_duration_minutes) > 0) {
        await updateUserStatsAfterCompletion(
          client,
          user.id,
          Number(actual_duration_minutes),
          normalizedFocus,
        )
      }

      await client.query('COMMIT')
      return NextResponse.json({ session })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
