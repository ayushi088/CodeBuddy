import { NextRequest, NextResponse } from 'next/server'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000'

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
    const response = await fetch(`${AI_ENGINE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image,
        user_id: userId,
      }),
    })

    if (!response.ok) {
      // If AI engine is not available, return simulated data for demo
      if (response.status === 502 || response.status === 503) {
        return NextResponse.json(getSimulatedAnalysis())
      }
      throw new Error(`AI Engine error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('AI Analysis error:', error)
    // Return simulated data if AI engine is unavailable
    return NextResponse.json(getSimulatedAnalysis())
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
  }
}
