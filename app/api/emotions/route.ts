import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool from '@/lib/db'
import {
  clampFocusScore,
  finalizeStudySession,
  isUndefinedColumnError,
  updateUserStatsAfterCompletion,
} from '@/lib/session-completion'

type EmotionPoint = {
  dominant_emotion: string
  confidence: number
  all_emotions: Record<string, number>
  timestamp?: string | Date
}

type PgErrorWithCode = Error & { code?: string }

function normalizeEmotionPoint(item: unknown): EmotionPoint | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const candidate = item as {
    dominant_emotion?: unknown
    confidence?: unknown
    all_emotions?: unknown
    timestamp?: unknown
  }

  const dominantEmotion = typeof candidate.dominant_emotion === 'string'
    ? candidate.dominant_emotion.trim().toLowerCase()
    : ''
  if (!dominantEmotion) {
    return null
  }

  const confidenceRaw = typeof candidate.confidence === 'number' && Number.isFinite(candidate.confidence)
    ? candidate.confidence
    : null
  if (confidenceRaw === null) {
    return null
  }

  const confidence = Math.max(0, Math.min(1, Number(confidenceRaw.toFixed(4))))

  const allEmotions =
    candidate.all_emotions && typeof candidate.all_emotions === 'object'
      ? (candidate.all_emotions as Record<string, number>)
      : {}

  return {
    dominant_emotion: dominantEmotion,
    confidence,
    all_emotions: allEmotions,
    timestamp:
      typeof candidate.timestamp === 'string' || candidate.timestamp instanceof Date
        ? candidate.timestamp
        : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const user = await getCurrentUser()
    const fallbackUserId = Number(body.userId)
    const userId = user?.id ?? (Number.isFinite(fallbackUserId) ? fallbackUserId : null)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const averageFocusScore = clampFocusScore(body.averageFocusScore)

    const sessionSeconds =
      typeof body.sessionSeconds === 'number' && Number.isFinite(body.sessionSeconds)
        ? Math.max(0, Math.round(body.sessionSeconds))
        : null

    const plannedDuration =
      typeof body.plannedDuration === 'number' && Number.isFinite(body.plannedDuration)
        ? Math.max(0, Math.round(body.plannedDuration))
        : null

    const computedDurationMinutes =
      sessionSeconds !== null
        ? Math.max(1, Math.round(sessionSeconds / 60))
        : plannedDuration

    const emotionPointsRaw = Array.isArray(body.emotionData)
      ? body.emotionData
      : body.emotionData
      ? [body.emotionData]
      : []

    const emotionPoints = emotionPointsRaw
      .map(normalizeEmotionPoint)
      .filter((point: EmotionPoint | null): point is EmotionPoint => point !== null)

    if (emotionPointsRaw.length > 0 && emotionPoints.length === 0) {
      return NextResponse.json(
        { error: 'emotionData format is invalid' },
        { status: 400 }
      )
    }

    const shouldFinalizeSession =
      computedDurationMinutes !== null ||
      averageFocusScore !== null ||
      typeof body.notes === 'string' ||
      typeof body.totalAlerts === 'number' ||
      typeof body.totalDistractions === 'number'

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const results = []

      for (const emotion of emotionPoints) {
        const result = await client.query(
          `INSERT INTO session_emotions (session_id, emotion, confidence, emotions_json, detected_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            sessionId,
            emotion.dominant_emotion,
            emotion.confidence,
            JSON.stringify(emotion.all_emotions || {}),
            emotion.timestamp || new Date(),
          ]
        )
        results.push(result.rows[0])
      }

      if (emotionPoints.length > 0) {
        const emotionCounts: Record<string, number> = {}
        let totalConfidence = 0

        for (const item of emotionPoints) {
          const emotion = item.dominant_emotion
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
          totalConfidence += item.confidence
        }

        const averageConfidence = totalConfidence / emotionPoints.length

        await client.query(
          `INSERT INTO emotion_statistics
           (user_id, session_id, average_emotion, emotion_distribution, average_confidence, session_date, duration)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (session_id) DO UPDATE SET
           average_emotion = EXCLUDED.average_emotion,
           emotion_distribution = EXCLUDED.emotion_distribution,
           average_confidence = EXCLUDED.average_confidence,
           duration = EXCLUDED.duration`,
          [
            userId,
            sessionId,
            emotionPoints[0]?.dominant_emotion || 'neutral',
            JSON.stringify(emotionCounts),
            averageConfidence,
            new Date(),
            sessionSeconds ?? (plannedDuration ? plannedDuration * 60 : 0),
          ]
        )
      }

      if (averageFocusScore !== null) {
        try {
          const result = await client.query(
            `UPDATE study_sessions
             SET avg_focus_score = $1,
                 updated_at = NOW()
             WHERE id = $2 AND user_id = $3`,
            [averageFocusScore, sessionId, userId]
          )
          if (result.rowCount === 0 && shouldFinalizeSession) {
            // Keep request successful even when the session row does not exist.
          }
        } catch (scoreError) {
          if (!isUndefinedColumnError(scoreError)) {
            throw scoreError
          }

          await client.query(
            `UPDATE study_sessions
             SET average_focus_score = $1
             WHERE id = $2 AND user_id = $3`,
            [averageFocusScore, sessionId, userId]
          )
        }
      }

      if (shouldFinalizeSession && computedDurationMinutes !== null) {
        const finalizedSession = await finalizeStudySession(client, {
          sessionId,
          userId,
          payload: {
            endTime: typeof body.endTime === 'string' ? body.endTime : new Date().toISOString(),
            actualDurationMinutes: computedDurationMinutes,
            avgFocusScore: averageFocusScore,
            totalAlerts:
              typeof body.totalAlerts === 'number' && Number.isInteger(body.totalAlerts) && body.totalAlerts >= 0
                ? body.totalAlerts
                : null,
            totalDistractions:
              typeof body.totalDistractions === 'number' && Number.isInteger(body.totalDistractions) && body.totalDistractions >= 0
                ? body.totalDistractions
                : null,
            notes: typeof body.notes === 'string' ? body.notes : null,
          },
        })

        if (finalizedSession) {
          await updateUserStatsAfterCompletion(
            client,
            userId,
            computedDurationMinutes,
            averageFocusScore,
          )
        }
      }

      await client.query('COMMIT')

      return NextResponse.json(
        {
          success: true,
          savedCount: results.length,
          message:
            results.length > 0
              ? `Saved ${results.length} emotion data points`
              : 'Session analytics saved successfully',
        },
        { status: 201 }
      )
    } catch (error) {
      await client.query('ROLLBACK')

      const err = error as PgErrorWithCode
      if (err?.code === '23503') {
        return NextResponse.json(
          {
            error: 'Invalid sessionId for emotion tracking',
            details: 'The provided session does not exist in the related table.',
          },
          { status: 400 }
        )
      }

      throw error
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
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        emotions_json:
          typeof row.emotions_json === 'string'
            ? JSON.parse(row.emotions_json)
            : row.emotions_json,
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
