import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, updateUser } from '@/lib/auth'
import { z } from 'zod'

const updateMeSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  avatar_url: z.string().url().nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
  course_name: z.string().max(255).nullable().optional(),
  branch: z.string().max(255).nullable().optional(),
  semester_year: z.string().max(100).nullable().optional(),
  institution_name: z.string().max(255).nullable().optional(),
  course_start_date: z.string().nullable().optional(),
  course_end_date: z.string().nullable().optional(),
  timetable_url: z.string().url().nullable().optional(),
  study_preferences: z.object({
    preferred_study_time: z.string().min(1),
    preferred_subject_ids: z.array(z.number().int().positive()),
    daily_study_goal_minutes: z.number().int().min(15).max(720),
    difficulty_level: z.string().min(1),
    break_preference: z.string().min(1),
  }).optional(),
  notification_preferences: z.object({
    email_daily_summary: z.boolean(),
    email_alerts: z.boolean(),
    push_notifications: z.boolean(),
  }).optional(),
})

function normalizeDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  return value
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = updateMeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid profile data' },
        { status: 400 }
      )
    }

    const data = validation.data

    if (
      data.course_start_date &&
      data.course_end_date &&
      new Date(data.course_start_date) > new Date(data.course_end_date)
    ) {
      return NextResponse.json(
        { error: 'Course start date cannot be after end date' },
        { status: 400 }
      )
    }

    const updated = await updateUser(currentUser.id, {
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      timezone: data.timezone,
      course_name: data.course_name,
      branch: data.branch,
      semester_year: data.semester_year,
      institution_name: data.institution_name,
      course_start_date: normalizeDate(data.course_start_date),
      course_end_date: normalizeDate(data.course_end_date),
      timetable_url: data.timetable_url,
      study_preferences: data.study_preferences,
      notification_preferences: data.notification_preferences,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'No changes submitted' },
        { status: 400 }
      )
    }

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
