'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Brain, Camera } from 'lucide-react'
import { detectEmotionFromImage } from '@/lib/emotion-detection'
import type { EmotionData } from '@/lib/emotion-detection'

interface StartupEmotionDetectionProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  isActive: boolean
  onComplete: (emotionData: EmotionData | null) => void
  duration?: number // seconds
}

export function StartupEmotionDetection({
  videoRef,
  canvasRef,
  isActive,
  onComplete,
  duration = 5,
}: StartupEmotionDetectionProps) {
  const [progress, setProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [message, setMessage] = useState('Analyzing your emotions...')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isActive) return

    let elapsedTime = 0
    const analysisInterval = 1000 // Analyze every 1 second

    setIsAnalyzing(true)
    setMessage('Analyzing your emotions...')

    const analyzeFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return

      try {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          )
        }

        const imageData = canvasRef.current.toDataURL('image/jpeg')
        const emotionData = await detectEmotionFromImage(imageData)

        if (emotionData) {
          setMessage(
            `Detected: ${emotionData.dominant_emotion.charAt(0).toUpperCase() + emotionData.dominant_emotion.slice(1)} (${Math.round(emotionData.confidence * 100)}%)`
          )
        }
      } catch (error) {
        console.error('Startup emotion detection error:', error)
      }
    }

    // Run analysis every second for the duration
    intervalRef.current = setInterval(() => {
      elapsedTime += analysisInterval
      setProgress((elapsedTime / (duration * 1000)) * 100)

      analyzeFrame()

      if (elapsedTime >= duration * 1000) {
        clearInterval(intervalRef.current!)
        setIsAnalyzing(false)
        setMessage('Emotion detection complete!')
        
        // Get final emotion after analysis
        setTimeout(async () => {
          if (!videoRef.current || !canvasRef.current) {
            onComplete(null)
            return
          }

          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            )
          }

          const imageData = canvasRef.current.toDataURL('image/jpeg')
          const finalData = await detectEmotionFromImage(imageData)
          onComplete(finalData)
        }, 500)
      }
    }, analysisInterval)

    analyzeFrame() // Initial analysis

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isActive, videoRef, canvasRef, duration, onComplete])

  if (!isActive) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary animate-pulse" />
          Emotion Detection Startup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {isAnalyzing ? 'Analyzing...' : 'Analysis complete'}
            </span>
            <span className="text-xs font-medium text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm font-medium text-foreground">{message}</p>
        </div>

        {!isAnalyzing && (
          <p className="text-xs text-muted-foreground text-center">
            Ready to start! Your emotion baseline has been captured.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
