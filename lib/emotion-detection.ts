import { HfInference } from '@huggingface/inference'

interface EmotionResult {
  emotion: string
  score: number
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

let hf: HfInference | null = null

// Initialize Hugging Face client (requires API key in env)
export const initializeEmotionDetection = () => {
  const apiKey = process.env.NEXT_PUBLIC_HF_API_KEY
  if (!apiKey) {
    console.warn('Hugging Face API key not set. Emotion detection will use mock data.')
    return null
  }
  hf = new HfInference(apiKey)
  return hf
}

/**
 * Detect emotion from image data (base64 or blob)
 */
export const detectEmotionFromImage = async (imageData: string | Blob): Promise<EmotionData | null> => {
  try {
    if (!hf) {
      initializeEmotionDetection()
    }

    if (!hf) {
      // Return mock emotion data for testing
      return generateMockEmotionData()
    }

    // Convert image to blob if needed
    let blobData = imageData
    if (typeof imageData === 'string') {
      const response = await fetch(imageData)
      blobData = await response.blob()
    }

    // Use Hugging Face image classification for emotion detection
    const result = await hf.imageClassification({
      model: 'trpakov/vit-face-expression',
      data: blobData as Blob,
    }) as Array<{ label: string; score: number }>

    // Process results
    const emotionMap: { [key: string]: number } = {
      sad: 0,
      happy: 0,
      neutral: 0,
      angry: 0,
      fear: 0,
      disgust: 0,
      surprise: 0,
    }

    let dominantEmotion = 'neutral'
    let maxScore = 0

    result.forEach((item) => {
      const label = item.label.toLowerCase()
      const score = Math.round(item.score * 100)

      if (label in emotionMap) {
        emotionMap[label] = score
        if (score > maxScore) {
          maxScore = score
          dominantEmotion = label
        }
      }
    })

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
