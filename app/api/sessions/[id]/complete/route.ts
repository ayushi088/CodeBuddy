import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  clampFocusScore,
  finalizeStudySession,
  updateUserStatsAfterCompletion,
} from '@/lib/session-completion'

export async function POST(
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

    const actualDurationMinutes = Number(body.actualDurationMinutes)
    const avgFocusScore = clampFocusScore(body.avgFocusScore)
    const totalAlerts = body.totalAlerts
    const totalDistractions = body.totalDistractions
    const notes = typeof body.notes === 'string' ? body.notes : null
    const endTime = typeof body.endTime === 'string' ? body.endTime : null

    if (!Number.isFinite(actualDurationMinutes) || actualDurationMinutes <= 0) {
      return NextResponse.json(
        { error: 'actualDurationMinutes must be a positive number' },
        { status: 400 }
      )
    }

    if (totalAlerts !== undefined && (!Number.isInteger(totalAlerts) || totalAlerts < 0)) {
      return NextResponse.json(
        { error: 'totalAlerts must be a non-negative integer' },
        { status: 400 }
      )
    }

    if (
      totalDistractions !== undefined &&
      (!Number.isInteger(totalDistractions) || totalDistractions < 0)
    ) {
      return NextResponse.json(
        { error: 'totalDistractions must be a non-negative integer' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const session = await finalizeStudySession(client, {
        sessionId: id,
        userId: user.id,
        payload: {
          endTime,
          actualDurationMinutes,
          avgFocusScore,
          totalAlerts,
          totalDistractions,
          notes,
        },
      })

      if (!session) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      await updateUserStatsAfterCompletion(
        client,
        user.id,
        actualDurationMinutes,
        avgFocusScore,
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        session,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Complete session error:', error)
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    )
  }
}
