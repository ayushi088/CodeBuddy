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
    const status = searchParams.get('status')
    const subjectId = searchParams.get('subject_id')

    let queryStr = `SELECT t.*, s.name as subject_name, s.color as subject_color
                    FROM tasks t
                    LEFT JOIN subjects s ON t.subject_id = s.id
                    WHERE t.user_id = $1`
    const params: (string | number)[] = [payload.userId]

    if (status) {
      params.push(status)
      queryStr += ` AND t.status = $${params.length}`
    }

    if (subjectId) {
      params.push(subjectId)
      queryStr += ` AND t.subject_id = $${params.length}`
    }

    queryStr += ' ORDER BY t.due_date ASC, t.priority DESC'

    const result = await query(queryStr, params)

    return NextResponse.json({ tasks: result.rows })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
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
    const { title, description, subject_id, due_date, priority, estimated_minutes } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO tasks (user_id, title, description, subject_id, due_date, priority, estimated_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [payload.userId, title, description, subject_id, due_date, priority || 'medium', estimated_minutes]
    )

    return NextResponse.json({ task: result.rows[0] })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
