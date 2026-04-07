import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

type PgErrorWithCode = Error & { code?: string }

async function getTimetableEntries(userId: number) {
  try {
    const entries = await query<{
      id: number
      user_id: number
      subject_id: number | null
      day_of_week: number
      start_time: string
      end_time: string
      title: string | null
      location: string | null
      subject_name: string | null
      subject_color: string | null
    }>(
      `SELECT te.*, s.name as subject_name, s.color as subject_color
       FROM timetable_entries te
       LEFT JOIN subjects s ON te.subject_id = s.id
       WHERE te.user_id = $1
       ORDER BY te.day_of_week, te.start_time`,
      [userId]
    )

    return entries
  } catch (error) {
    const err = error as PgErrorWithCode
    if (err.code !== '42P01') {
      throw error
    }

    // Fallback for deployments using the scheduled_blocks table name.
    return query<{
      id: number
      user_id: number
      subject_id: number | null
      day_of_week: number
      start_time: string
      end_time: string
      title: string | null
      location: string | null
      subject_name: string | null
      subject_color: string | null
    }>(
      `SELECT sb.id, sb.user_id, sb.subject_id, sb.day_of_week, sb.start_time, sb.end_time,
              sb.title, NULL::text as location, s.name as subject_name, s.color as subject_color
       FROM scheduled_blocks sb
       LEFT JOIN subjects s ON sb.subject_id = s.id
       WHERE sb.user_id = $1
       ORDER BY sb.day_of_week, sb.start_time`,
      [userId]
    )
  }
}

async function createTimetableEntry(
  userId: number,
  subjectId: number | null,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  title?: string,
  location?: string,
) {
  try {
    const rows = await query(
      `INSERT INTO timetable_entries (user_id, subject_id, day_of_week, start_time, end_time, title, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, subjectId, dayOfWeek, startTime, endTime, title || null, location || null]
    )
    return rows[0]
  } catch (error) {
    const err = error as PgErrorWithCode
    if (err.code !== '42P01') {
      throw error
    }

    const rows = await query(
      `INSERT INTO scheduled_blocks (user_id, subject_id, title, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        subjectId,
        title?.trim() || 'Study Session',
        dayOfWeek,
        startTime,
        endTime,
      ]
    )
    return rows[0]
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      // Return an empty timetable for unauthenticated requests to avoid noisy client retries.
      return NextResponse.json({ entries: [] })
    }

    const entries = await getTimetableEntries(user.id)

    return NextResponse.json({ entries })
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subject_id, day_of_week, start_time, end_time, title, location } = body

    if (day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Day, start time, and end time are required' },
        { status: 400 }
      )
    }

    const entry = await createTimetableEntry(
      user.id,
      subject_id ?? null,
      day_of_week,
      start_time,
      end_time,
      title,
      location,
    )

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Create timetable entry error:', error)
    return NextResponse.json(
      { error: 'Failed to create timetable entry' },
      { status: 500 }
    )
  }
}
