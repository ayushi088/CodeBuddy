import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

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
      [payload.userId, limit, offset]
    )

    return NextResponse.json({ sessions: sessions.rows })
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
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { subject_id, planned_duration_minutes } = body

    const result = await query(
      `INSERT INTO study_sessions (user_id, subject_id, planned_duration_minutes, start_time)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [payload.userId, subject_id || null, planned_duration_minutes || 60]
    )

    return NextResponse.json({ session: result.rows[0] })
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
