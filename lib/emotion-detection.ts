interface AnalyzeApiResponse {
  emotion?: string
  emotion_confidence?: number
}

interface EmotionStats {
  sad: number
  happy: number
  neutral: number
  angry: number
  fear: number
  disgust: number
  surprise: number
}

export interface EmotionData {
  dominant_emotion: string
  all_emotions: EmotionStats
  confidence: number
  timestamp: Date
}

// Kept for backward compatibility; detection now runs through server API.
export const initializeEmotionDetection = () => {
  return true
}

/**
 * Detect emotion from image data (base64 or blob)
 */
export const detectEmotionFromImage = async (imageData: string | Blob): Promise<EmotionData | null> => {
  try {
    // Always analyze through backend so browser does not require a public HF token.
    const base64Image =
      typeof imageData === 'string' ? imageData : await blobToDataUrl(imageData)

    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    })

    if (!response.ok) {
      return generateMockEmotionData()
    }

    const result = (await response.json()) as AnalyzeApiResponse

    const emotionMap: { [key: string]: number } = {
      sad: 0,
      happy: 0,
      neutral: 0,
      angry: 0,
      fear: 0,
      disgust: 0,
      surprise: 0,
    }

    const dominantEmotion = (result.emotion || 'neutral').toLowerCase()
    const maxScore = Math.round((result.emotion_confidence ?? 0.75) * 100)

    if (dominantEmotion in emotionMap) {
      emotionMap[dominantEmotion] = maxScore
    } else {
      emotionMap.neutral = maxScore
    }

    return {
      dominant_emotion: dominantEmotion,
      all_emotions: emotionMap as unknown as EmotionStats,
      confidence: maxScore / 100,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Error detecting emotion:', error)
    return generateMockEmotionData()
  }
}

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to convert blob to data URL'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate mock emotion data for testing (when API key not available)
 */
export const generateMockEmotionData = (): EmotionData => {
  const emotions = ['sad', 'happy', 'neutral', 'angry', 'fear', 'disgust', 'surprise']
  const dominant = emotions[Math.floor(Math.random() * emotions.length)]

  const emotionStats: EmotionStats = {
    sad: Math.floor(Math.random() * 100),
    happy: Math.floor(Math.random() * 100),
    neutral: Math.floor(Math.random() * 100),
    angry: Math.floor(Math.random() * 100),
    fear: Math.floor(Math.random() * 100),
    disgust: Math.floor(Math.random() * 100),
    surprise: Math.floor(Math.random() * 100),
  }

  // Normalize so they sum to 100
  const sum = Object.values(emotionStats).reduce((a, b) => a + b, 0)
  Object.keys(emotionStats).forEach((key) => {
    emotionStats[key as keyof EmotionStats] = Math.round(
      (emotionStats[key as keyof EmotionStats] / sum) * 100
    )
  })

  return {
    dominant_emotion: dominant,
    all_emotions: emotionStats,
    confidence: Math.random() * 0.5 + 0.5,
    timestamp: new Date(),
  }
}

/**
 * Get emotion level (low, medium, high) for dashboard display
 */
export const getEmotionLevel = (emotion: string): 'low' | 'medium' | 'high' => {
  switch (emotion.toLowerCase()) {
    case 'happy':
    case 'surprise':
      return 'high'
    case 'sad':
    case 'angry':
    case 'fear':
    case 'disgust':
      return 'low'
    case 'neutral':
    default:
      return 'medium'
  }
}

/**
 * Get emotion color for UI
 */
export const getEmotionColor = (emotion: string): string => {
  switch (emotion.toLowerCase()) {
    case 'happy':
    case 'surprise':
      return '#10b981' // green
    case 'sad':
    case 'angry':
    case 'fear':
      return '#ef4444' // red
    case 'disgust':
      return '#f59e0b' // amber
    case 'neutral':
    default:
      return '#6b7280' // gray
  }
}
