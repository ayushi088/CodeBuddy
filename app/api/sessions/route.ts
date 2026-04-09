import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const sessions = await query(
      `SELECT ss.*, s.name as subject_name, s.color as subject_color
       FROM study_sessions ss
       LEFT JOIN subjects s ON ss.subject_id = s.id
       WHERE ss.user_id = $1
       ORDER BY ss.start_time DESC
       LIMIT $2 OFFSET $3`,
      [user.id, limit, offset]
    )

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject_id, planned_duration_minutes } = body

    if (
      planned_duration_minutes !== undefined &&
      (!Number.isFinite(planned_duration_minutes) || planned_duration_minutes <= 0)
    ) {
      return NextResponse.json(
        { error: 'planned_duration_minutes must be a positive number' },
        { status: 400 }
      )
    }

    const sessions = await query(
      `INSERT INTO study_sessions (user_id, subject_id, planned_duration_minutes, start_time)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [user.id, subject_id || null, planned_duration_minutes || 60]
    )

    return NextResponse.json({ session: sessions[0] })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
