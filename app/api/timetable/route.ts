import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
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

    const result = await query(
      `SELECT te.*, s.name as subject_name, s.color as subject_color
       FROM timetable_entries te
       LEFT JOIN subjects s ON te.subject_id = s.id
       WHERE te.user_id = $1
       ORDER BY te.day_of_week, te.start_time`,
      [payload.userId]
    )

    return NextResponse.json({ entries: result.rows })
  } catch (error) {
    console.error('Get timetable error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timetable' },
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
    const { subject_id, day_of_week, start_time, end_time, title, location } = body

    if (day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Day, start time, and end time are required' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO timetable_entries (user_id, subject_id, day_of_week, start_time, end_time, title, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [payload.userId, subject_id, day_of_week, start_time, end_time, title, location]
    )

    return NextResponse.json({ entry: result.rows[0] })
  } catch (error) {
    console.error('Create timetable entry error:', error)
    return NextResponse.json(
      { error: 'Failed to create timetable entry' },
      { status: 500 }
    )
  }
}
