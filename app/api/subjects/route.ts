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
      `SELECT s.*, 
         COALESCE(SUM(ss.actual_duration_minutes), 0) as total_minutes,
         COUNT(ss.id) as session_count
       FROM subjects s
       LEFT JOIN study_sessions ss ON s.id = ss.subject_id
       WHERE s.user_id = $1
       GROUP BY s.id
       ORDER BY s.name`,
      [payload.userId]
    )

    return NextResponse.json({ subjects: result.rows })
  } catch (error) {
    console.error('Get subjects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
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
    const { name, color, target_hours_per_week } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO subjects (user_id, name, color, target_hours_per_week)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [payload.userId, name, color || '#3b82f6', target_hours_per_week || 0]
    )

    return NextResponse.json({ subject: result.rows[0] })
  } catch (error) {
    console.error('Create subject error:', error)
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    )
  }
}
