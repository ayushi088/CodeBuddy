import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect()
    try {
      // Create a test session for today
      const now = new Date()
      const dayOfWeek = now.getDay()
      const currentHour = now.getHours()
      
      // Get user ID
      const userResult = await client.query('SELECT id FROM users LIMIT 1')
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'No user found' }, { status: 400 })
      }
      
      const userId = userResult.rows[0].id
      
      // Try to get a subject, if not create a default one
      let subjectId: string | null = null
      let subjectName = 'Focus Study'
      
      const subjectResult = await client.query('SELECT id, name FROM subjects LIMIT 1')
      if (subjectResult.rows.length > 0) {
        subjectId = subjectResult.rows[0].id
        subjectName = subjectResult.rows[0].name
      } else {
        // Create a default subject if none exists
        try {
          const newSubjectResult = await client.query(
            `INSERT INTO subjects (user_id, name, color, icon) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name`,
            [userId, 'Focus Study', '#3b82f6', '📚']
          )
          subjectId = newSubjectResult.rows[0].id
          subjectName = newSubjectResult.rows[0].name
        } catch (e) {
          console.log('Could not create subject:', e)
        }
      }
      
      // Calculate start and end times
      // Use current time or next hour if past 9 AM
      let startHour = Math.max(currentHour + 1, 9)
      let endHour = startHour + 1
      
      if (startHour > 23) {
        startHour = 9
        endHour = 10
      }
      if (endHour > 23) {
        endHour = 23
      }
      
      const startTime = `${String(startHour).padStart(2, '0')}:00`
      const endTime = `${String(endHour).padStart(2, '0')}:00`
      
      // Check if session already exists for this time
      const existingResult = await client.query(
        `SELECT id FROM scheduled_blocks 
         WHERE user_id = $1 AND day_of_week = $2 AND start_time = $3`,
        [userId, dayOfWeek, startTime]
      )
      
      if (existingResult.rows.length > 0) {
        return NextResponse.json({ 
          success: true, 
          session: existingResult.rows[0],
          message: 'Test session already exists'
        })
      }
      
      // Insert test session
      const result = await client.query(
        `INSERT INTO scheduled_blocks (user_id, day_of_week, start_time, end_time, subject_id, title)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, dayOfWeek, startTime, endTime, subjectId, `${subjectName} - Emotion Detection Test`]
      )
      
      return NextResponse.json({ 
        success: true, 
        session: result.rows[0],
        message: 'Test session created successfully'
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error creating test session:', error)
    return NextResponse.json({ 
      error: 'Failed to create test session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
