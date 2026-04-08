import { NextRequest, NextResponse } from 'next/server'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000'
const ENABLE_SIMULATION_FALLBACK = process.env.ENABLE_SIMULATION_FALLBACK === 'true'
let hasLoggedAiEngineUnavailable = false

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, userId } = body

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Forward request to Python AI engine
    let response: Response
    try {
      response = await fetch(`${AI_ENGINE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image,
          user_id: userId,
        }),
      })
    } catch {
      if (ENABLE_SIMULATION_FALLBACK) {
        if (!hasLoggedAiEngineUnavailable) {
          console.warn(
            `AI engine unavailable at ${AI_ENGINE_URL}. Using simulated emotion analysis.`
          )
          hasLoggedAiEngineUnavailable = true
        }
        return NextResponse.json(getSimulatedAnalysis())
      }

      return NextResponse.json(
        {
          error: 'AI engine unavailable',
          ai_source: 'unavailable',
        },
        { status: 503 }
      )
    }

    if (!response.ok) {
      if (ENABLE_SIMULATION_FALLBACK && (response.status === 502 || response.status === 503 || response.status === 504)) {
        return NextResponse.json(getSimulatedAnalysis())
      }

      const detail = await response.text().catch(() => '')
      return NextResponse.json(
        {
          error: 'AI engine returned an error',
          ai_source: 'model',
          status: response.status,
          detail,
        },
        { status: response.status }
      )
    }

    hasLoggedAiEngineUnavailable = false

    const data = await response.json()
    return NextResponse.json({ ...data, simulated: false, ai_source: 'model' })
  } catch (error) {
    console.error('AI Analysis unexpected error:', error)
    if (ENABLE_SIMULATION_FALLBACK) {
      return NextResponse.json(getSimulatedAnalysis())
    }

    return NextResponse.json(
      {
        error: 'Unexpected AI analysis error',
        ai_source: 'error',
      },
      { status: 500 }
    )
  }
}

// Simulated analysis for when Python AI engine is not running
function getSimulatedAnalysis() {
  const baseScore = 70 + Math.random() * 20
  const isLookingAway = Math.random() < 0.1
  
  return {
    face_detected: true,
    eye_contact: !isLookingAway,
    eye_contact_score: isLookingAway ? 0.3 : 0.7 + Math.random() * 0.25,
    emotion: ['focused', 'neutral', 'happy'][Math.floor(Math.random() * 3)],
    emotion_confidence: 0.7 + Math.random() * 0.2,
    focus_score: isLookingAway ? baseScore - 30 : baseScore,
    is_looking_away: isLookingAway,
    head_pose: {
      yaw: (Math.random() - 0.5) * 20,
      pitch: (Math.random() - 0.5) * 15,
      roll: (Math.random() - 0.5) * 10,
    },
    alerts: isLookingAway ? [{
      type: 'warning',
      message: 'Looking away from screen detected',
      code: 'LOOKING_AWAY'
    }] : [],
    liveness_check: true,
    blink_detected: Math.random() < 0.15,
    simulated: true,
    ai_source: 'simulated',
  }
}
