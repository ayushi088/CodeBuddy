import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect()
    try {
      const { sessionId, userId, emotionData, plannedDuration, sessionSeconds, subject } = await request.json()

      if (!sessionId || !emotionData) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const results = []

      // Insert all emotion data points from array
      if (Array.isArray(emotionData)) {
        for (const emotion of emotionData) {
          const result = await client.query(
            `INSERT INTO session_emotions (session_id, emotion, confidence, emotions_json, detected_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
              sessionId,
              emotion.dominant_emotion,
              emotion.confidence,
              JSON.stringify(emotion.all_emotions),
              emotion.timestamp || new Date(),
            ]
          )
          results.push(result.rows[0])
        }
      } else {
        // Handle single emotion data object
        const result = await client.query(
          `INSERT INTO session_emotions (session_id, emotion, confidence, emotions_json, detected_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            sessionId,
            emotionData.dominant_emotion,
            emotionData.confidence,
            JSON.stringify(emotionData.all_emotions),
            emotionData.timestamp || new Date(),
          ]
        )
        results.push(result.rows[0])
      }

      // Calculate emotion statistics for this session
      if (Array.isArray(emotionData) && emotionData.length > 0) {
        // Calculate average emotion and distribution
        const emotionCounts: Record<string, number> = {}
        let totalConfidence = 0

        emotionData.forEach((ed: any) => {
          const emotion = ed.dominant_emotion.toLowerCase()
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
          totalConfidence += ed.confidence
        })

        const averageConfidence = totalConfidence / emotionData.length
        const emotionDistribution = emotionCounts

        // Insert or update emotion statistics
        await client.query(
          `INSERT INTO emotion_statistics 
           (user_id, session_id, average_emotion, emotion_distribution, average_confidence, session_date, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (session_id) DO UPDATE SET
           average_emotion = EXCLUDED.average_emotion,
           emotion_distribution = EXCLUDED.emotion_distribution,
           average_confidence = EXCLUDED.average_confidence`,
          [
            userId || '1',
            sessionId,
            emotionData[0]?.dominant_emotion || 'neutral',
            JSON.stringify(emotionDistribution),
            averageConfidence,
            new Date(),
            sessionSeconds || plannedDuration * 60,
          ]
        )
      }

      return NextResponse.json(
        { 
          success: true, 
          savedCount: results.length,
          message: `Saved ${results.length} emotion data points`
        }, 
        { status: 201 }
      )
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error storing emotion data:', error)
    return NextResponse.json(
      { error: 'Failed to store emotion data', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT * FROM session_emotions 
         WHERE session_id = $1 
         ORDER BY detected_at DESC 
         LIMIT 100`,
        [sessionId]
      )

      // Parse emotion data
      const emotionRecords = result.rows.map((row: any) => ({
        ...row,
        emotions_json: JSON.parse(row.emotions_json),
      }))

      return NextResponse.json(emotionRecords, { status: 200 })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error fetching emotion data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch emotion data' },
      { status: 500 }
    )
  }
}
