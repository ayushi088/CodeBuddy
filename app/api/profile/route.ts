import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const result = await query(
      `SELECT id, email, full_name AS name, avatar_url, created_at FROM users WHERE id = $1`,
      [currentUser.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const defaultSettings = {
      theme: 'dark',
      email_daily_summary: true,
      email_focus_alerts: true,
      alert_sound_enabled: true,
      focus_reminder_interval: 30,
      break_reminder_interval: 60,
      default_session_duration: 60,
    }

    return NextResponse.json({
      user: result.rows[0],
      settings: defaultSettings,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { name, avatar_url } = body

    // Update user profile
    if (name || avatar_url) {
      await query(
        `UPDATE users 
         SET full_name = COALESCE($1, full_name),
             avatar_url = COALESCE($2, avatar_url),
             updated_at = NOW()
         WHERE id = $3`,
        [name, avatar_url, currentUser.id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
