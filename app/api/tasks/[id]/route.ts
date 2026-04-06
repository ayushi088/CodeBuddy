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
    const { title, description, subject_id, due_date, priority, status, estimated_minutes } = body

    const result = await query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           subject_id = COALESCE($3, subject_id),
           due_date = COALESCE($4, due_date),
           priority = COALESCE($5, priority),
           status = COALESCE($6, status),
           estimated_minutes = COALESCE($7, estimated_minutes),
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [title, description, subject_id, due_date, priority, status, estimated_minutes, id, payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task: result.rows[0] })
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const result = await query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, payload.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
