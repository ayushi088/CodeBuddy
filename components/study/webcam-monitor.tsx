'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react'

interface WebcamMonitorProps {
  isActive: boolean
  onFocusUpdate: (score: number, metrics: {
    faceDetected: boolean
    eyesOpen: boolean
    lookingAtScreen: boolean
    emotion?: string
  }) => void
}

export function WebcamMonitor({ isActive, onFocusUpdate }: WebcamMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const getCameraSupportError = useCallback(() => {
    if (typeof window === 'undefined') {
      return 'Camera is only available in the browser.'
    }

    if (!window.isSecureContext) {
      return 'Camera access requires HTTPS or localhost. Open this app on localhost to use the webcam.'
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return 'Your browser does not support webcam access.'
    }

    return null
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)

      const supportError = getCameraSupportError()
      if (supportError) {
        setHasPermission(false)
        setError(supportError)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        try {
          await videoRef.current.play()
        } catch {
          // The stream is active even if autoplay is rejected; keep it visible.
        }
        setHasPermission(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setHasPermission(false)
      setError(err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Camera permission was denied in the browser.'
        : 'Unable to access camera. Please check browser permissions and reload the page.')
    }
  }, [getCameraSupportError])

  const stopCamera = useCallback(() => {
    const stream = streamRef.current ?? (videoRef.current?.srcObject as MediaStream | null)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }

    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Simulated AI analysis (will be replaced with Python backend calls)
  useEffect(() => {
    if (!isActive || !hasPermission) return

    const analyzeFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return

      setIsAnalyzing(true)
      
      // Capture frame to canvas
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
      }

      // TODO: Send frame to Python AI backend for analysis
      // For now, simulate with random values
      const simulatedMetrics = {
        faceDetected: Math.random() > 0.1,
        eyesOpen: Math.random() > 0.15,
        lookingAtScreen: Math.random() > 0.2,
        emotion: ['focused', 'neutral', 'tired', 'distracted'][Math.floor(Math.random() * 4)],
      }

      // Calculate focus score based on metrics
      let score = 100
      if (!simulatedMetrics.faceDetected) score -= 50
      if (!simulatedMetrics.eyesOpen) score -= 30
      if (!simulatedMetrics.lookingAtScreen) score -= 20
      if (simulatedMetrics.emotion === 'distracted') score -= 10
      if (simulatedMetrics.emotion === 'tired') score -= 5

      score = Math.max(0, Math.min(100, score))

      onFocusUpdate(score, simulatedMetrics)
      setIsAnalyzing(false)
    }

    // Analyze every 2 seconds
    const interval = setInterval(analyzeFrame, 2000)
    return () => clearInterval(interval)
  }, [isActive, hasPermission, onFocusUpdate])

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Webcam Monitor
          {isAnalyzing && (
            <span className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Analyzing...
            </span>
          )}
        </CardTitle>
        {hasPermission === false && (
          <Button variant="outline" size="sm" onClick={startCamera} className="gap-1">
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative aspect-video bg-muted">
          {hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Requesting camera access...</p>
              </div>
            </div>
          )}
          
          {hasPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-xs">
                <CameraOff className="w-12 h-12 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive font-medium">Camera Access Denied</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error || 'Please allow camera access to enable focus monitoring.'}
                </p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${hasPermission ? '' : 'hidden'}`}
            muted
            playsInline
            crossOrigin="anonymous"
          />
          
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="hidden"
          />

          {/* Overlay indicators */}
          {hasPermission && isActive && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-xs font-medium text-foreground">LIVE</span>
              </div>
            </div>
          )}

          {hasPermission && !isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-warning mx-auto mb-2" />
                <p className="text-sm text-foreground">Session Paused</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
