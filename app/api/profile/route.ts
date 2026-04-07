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

    // Get user settings
    const settingsResult = await query(
      `SELECT * FROM user_settings WHERE user_id = $1`,
      [currentUser.id]
    )

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
      settings: settingsResult.rows[0] || defaultSettings,
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
    const { name, avatar_url, settings } = body

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

    // Update settings
    if (settings) {
      await query(
        `INSERT INTO user_settings (
           user_id, theme, email_daily_summary, email_focus_alerts,
           alert_sound_enabled, focus_reminder_interval, break_reminder_interval,
           default_session_duration
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id) DO UPDATE SET
           theme = COALESCE($2, user_settings.theme),
           email_daily_summary = COALESCE($3, user_settings.email_daily_summary),
           email_focus_alerts = COALESCE($4, user_settings.email_focus_alerts),
           alert_sound_enabled = COALESCE($5, user_settings.alert_sound_enabled),
           focus_reminder_interval = COALESCE($6, user_settings.focus_reminder_interval),
           break_reminder_interval = COALESCE($7, user_settings.break_reminder_interval),
           default_session_duration = COALESCE($8, user_settings.default_session_duration),
           updated_at = NOW()`,
        [
          currentUser.id,
          settings.theme,
          settings.email_daily_summary,
          settings.email_focus_alerts,
          settings.alert_sound_enabled,
          settings.focus_reminder_interval,
          settings.break_reminder_interval,
          settings.default_session_duration,
        ]
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
