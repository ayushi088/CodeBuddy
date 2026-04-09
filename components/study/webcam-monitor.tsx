'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, CameraOff, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import { detectEmotionFromImage } from '@/lib/emotion-detection'
import { audioNotifications, preloadVoices } from '@/lib/audio-notifications'

interface WebcamMonitorProps {
  className?: string
  isActive: boolean
  onFocusUpdate: (score: number, metrics: {
    faceDetected: boolean
    eyesOpen: boolean
    lookingAtScreen: boolean
    livenessSuspicious?: boolean
    motionScore?: number
    emotion?: string
    emotionConfidence?: number
    allEmotions?: Record<string, number>
  }) => void
}

export function WebcamMonitor({ className, isActive, onFocusUpdate }: WebcamMonitorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const facePatchCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  // Track consecutive failures for alerts
  const faceMissingCountRef = useRef(0)
  const faceMissingAlertTriggeredRef = useRef(false)
  const eyesClosedCountRef = useRef(0)
  const awayFromScreenCountRef = useRef(0)
  const eyesAlertTriggeredRef = useRef(false)
  const awayAlertTriggeredRef = useRef(false)
  const photoStaticCountRef = useRef(0)
  const faceTextureStaticCountRef = useRef(0)
  const tinyFaceCountRef = useRef(0)
  const photoAlertTriggeredRef = useRef(false)
  const previousMotionFrameRef = useRef<Uint8Array | null>(null)
  const previousFacePatchRef = useRef<Uint8Array | null>(null)
  const livenessWindowRef = useRef<Array<{ motion: number; blink: boolean; eyeContact: boolean }>>([])

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

  useEffect(() => {
    if (typeof document === 'undefined' || motionCanvasRef.current) {
      return
    }

    const motionCanvas = document.createElement('canvas')
    motionCanvas.width = 32
    motionCanvas.height = 24
    motionCanvasRef.current = motionCanvas

    const facePatchCanvas = document.createElement('canvas')
    facePatchCanvas.width = 24
    facePatchCanvas.height = 24
    facePatchCanvasRef.current = facePatchCanvas
  }, [])

  const computeMotionScore = useCallback(() => {
    const motionCanvas = motionCanvasRef.current
    const video = videoRef.current
    if (!motionCanvas || !video) {
      return 0
    }

    const context = motionCanvas.getContext('2d')
    if (!context) {
      return 0
    }

    context.drawImage(video, 0, 0, motionCanvas.width, motionCanvas.height)
    const frame = context.getImageData(0, 0, motionCanvas.width, motionCanvas.height).data
    const samples = new Uint8Array((frame.length / 4) | 0)

    for (let frameIndex = 0, sampleIndex = 0; frameIndex < frame.length; frameIndex += 4, sampleIndex += 1) {
      samples[sampleIndex] = Math.round((frame[frameIndex] + frame[frameIndex + 1] + frame[frameIndex + 2]) / 3)
    }

    let motionScore = 0
    const previousSamples = previousMotionFrameRef.current
    if (previousSamples && previousSamples.length === samples.length) {
      let totalDifference = 0
      for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
        totalDifference += Math.abs(samples[sampleIndex] - previousSamples[sampleIndex])
      }
      motionScore = totalDifference / samples.length
    }

    previousMotionFrameRef.current = samples
    return motionScore
  }, [])

  const computeFacePatchMotion = useCallback((bbox?: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!bbox) {
      return null
    }

    const sourceCanvas = canvasRef.current
    const facePatchCanvas = facePatchCanvasRef.current
    if (!sourceCanvas || !facePatchCanvas) {
      return null
    }

    const sourceCtx = sourceCanvas.getContext('2d')
    const patchCtx = facePatchCanvas.getContext('2d')
    if (!sourceCtx || !patchCtx) {
      return null
    }

    const cropX = Math.max(0, Math.floor(bbox.x1))
    const cropY = Math.max(0, Math.floor(bbox.y1))
    const cropW = Math.max(1, Math.floor(bbox.x2 - bbox.x1))
    const cropH = Math.max(1, Math.floor(bbox.y2 - bbox.y1))

    const boundedW = Math.min(cropW, sourceCanvas.width - cropX)
    const boundedH = Math.min(cropH, sourceCanvas.height - cropY)
    if (boundedW <= 1 || boundedH <= 1) {
      return null
    }

    patchCtx.clearRect(0, 0, facePatchCanvas.width, facePatchCanvas.height)
    patchCtx.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      boundedW,
      boundedH,
      0,
      0,
      facePatchCanvas.width,
      facePatchCanvas.height,
    )

    const patch = patchCtx.getImageData(0, 0, facePatchCanvas.width, facePatchCanvas.height).data
    const samples = new Uint8Array((patch.length / 4) | 0)

    for (let patchIndex = 0, sampleIndex = 0; patchIndex < patch.length; patchIndex += 4, sampleIndex += 1) {
      samples[sampleIndex] = Math.round((patch[patchIndex] + patch[patchIndex + 1] + patch[patchIndex + 2]) / 3)
    }

    let patchMotion = 0
    const previousPatch = previousFacePatchRef.current
    if (previousPatch && previousPatch.length === samples.length) {
      let totalDifference = 0
      for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
        totalDifference += Math.abs(samples[sampleIndex] - previousPatch[sampleIndex])
      }
      patchMotion = totalDifference / samples.length
    }

    previousFacePatchRef.current = samples
    return patchMotion
  }, [])

  const updateLivenessWindow = useCallback((sample: { motion: number; blink: boolean; eyeContact: boolean }) => {
    const nextWindow = [...livenessWindowRef.current, sample].slice(-5)
    livenessWindowRef.current = nextWindow

    const enoughSamples = nextWindow.length >= 4
    const blinkSeen = nextWindow.some((item) => item.blink)
    const motionAvg = nextWindow.reduce((sum, item) => sum + item.motion, 0) / nextWindow.length
    const eyeContactVariations = nextWindow.reduce((sum, item, index, array) => {
      if (index === 0) return sum
      return sum + Number(item.eyeContact !== array[index - 1].eyeContact)
    }, 0)

    const staticFace = motionAvg < 1.6 && eyeContactVariations === 0 && !blinkSeen
    const suspicious = enoughSamples && staticFace

    return {
      suspicious,
      motionAvg,
      blinkSeen,
    }
  }, [])

  // Emotion detection and focus analysis - every 1 second
  useEffect(() => {
    if (!isActive || !hasPermission) return

    // Preload voices on first use
    preloadVoices()

    const analyzeFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return

      setIsAnalyzing(true)
      
      try {
        // Capture frame to canvas
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height)
        }

        // Get image data and detect emotion
        const imageData = canvasRef.current.toDataURL('image/jpeg')
        const emotionData = await detectEmotionFromImage(imageData)

        if (emotionData) {
          setError(null)

          // Prefer explicit backend signal, but accept bbox presence as detected face.
          const faceDetected = emotionData.face_detected === true || Boolean(emotionData.face_bbox)
          const backendIndicatesUnknownUser =
            emotionData.status === 'Unknown User' ||
            Boolean(emotionData.alerts?.some((alert) => alert.code === 'UNKNOWN_USER'))
          const backendLivenessFailed = faceDetected && emotionData.liveness_check === false
          const eyesOpen = emotionData.blink_detected !== true
          const motionScore = computeMotionScore()
          const facePatchMotion = computeFacePatchMotion(emotionData.face_bbox)
          const tinyFaceRatio =
            typeof emotionData.face_area_ratio === 'number' && emotionData.face_area_ratio > 0
              // Avoid false positives from normal laptop distance while still flagging very small face boxes.
              ? emotionData.face_area_ratio < 0.06
              : false

          if (tinyFaceRatio) {
            tinyFaceCountRef.current += 1
          } else {
            tinyFaceCountRef.current = 0
          }

          const tinyFacePersistent = tinyFaceCountRef.current >= 3
          const photoAlertCandidate = faceDetected && motionScore < 1.8 && !emotionData.blink_detected
          if (photoAlertCandidate) {
            photoStaticCountRef.current += 1
          } else {
            photoStaticCountRef.current = 0
            photoAlertTriggeredRef.current = false
          }

          if (faceDetected && facePatchMotion !== null && facePatchMotion < 1.2) {
            faceTextureStaticCountRef.current += 1
          } else {
            faceTextureStaticCountRef.current = 0
          }

          const textureStaticSuspicious = faceTextureStaticCountRef.current >= 10

          const lookingAwayByAlert = Boolean(
            emotionData.alerts?.some((alert) => alert.code === 'LOOKING_AWAY')
          )
          const lookingAwayByScore =
            typeof emotionData.eye_contact_score === 'number'
              ? emotionData.eye_contact_score < 0.55
              : false
          const lookingAtScreen =
            lookingAwayByAlert
              ? false
              : emotionData.eye_contact !== undefined
              ? emotionData.eye_contact
              : emotionData.is_looking_away !== undefined
              ? !emotionData.is_looking_away
              : !lookingAwayByScore

          const liveness = updateLivenessWindow({
            motion: motionScore,
            blink: Boolean(emotionData.blink_detected),
            eyeContact: lookingAtScreen,
          })

          const spoofHeuristic =
            tinyFacePersistent &&
            (photoStaticCountRef.current >= 4 || textureStaticSuspicious || liveness.suspicious)

          const livenessSuspicious =
            backendIndicatesUnknownUser ||
            backendLivenessFailed ||
            spoofHeuristic

          if (tinyFacePersistent) {
            setError('Face appears too small or far. Move closer to the webcam for live verification.')
          }
          if (livenessSuspicious && !photoAlertTriggeredRef.current) {
            photoAlertTriggeredRef.current = true
            audioNotifications.spoofDetected()
          }

          // Map emotions to metrics
          const metrics = {
            faceDetected,
            eyesOpen,
            lookingAtScreen,
            livenessSuspicious,
            motionScore,
            emotion: emotionData.dominant_emotion,
            emotionConfidence: emotionData.confidence,
            allEmotions: emotionData.all_emotions,
          }

          // Reset static-photo counters when strong spoof heuristic is not present.
          if (!spoofHeuristic) {
            photoStaticCountRef.current = 0
            photoAlertTriggeredRef.current = false
          }

          // Track no-human detection and alert only after consecutive misses.
          if (!faceDetected) {
            faceMissingCountRef.current += 1
            if (faceMissingCountRef.current >= 2 && !faceMissingAlertTriggeredRef.current) {
              faceMissingAlertTriggeredRef.current = true
              audioNotifications.noHumanDetected()
            }
          } else {
            faceMissingCountRef.current = 0
            faceMissingAlertTriggeredRef.current = false
          }

          // Track eyes closed consecutive failures
          if (faceDetected && !eyesOpen) {
            eyesClosedCountRef.current += 1
            // Alert after ~30 seconds (1-2 checks at 20-second intervals)
            if (eyesClosedCountRef.current >= 2 && !eyesAlertTriggeredRef.current) {
              eyesAlertTriggeredRef.current = true
              audioNotifications.eyesClosed()
            }
          } else {
            eyesClosedCountRef.current = 0
            eyesAlertTriggeredRef.current = false
          }

          // Track away from screen consecutive failures
          if (faceDetected && !lookingAtScreen) {
            awayFromScreenCountRef.current += 1
            // Alert after ~30 seconds
            if (awayFromScreenCountRef.current >= 2 && !awayAlertTriggeredRef.current) {
              awayAlertTriggeredRef.current = true
              audioNotifications.faceMissing()
            }
          } else {
            awayFromScreenCountRef.current = 0
            awayAlertTriggeredRef.current = false
          }

          // Calculate focus score based on emotion and metrics
          let score = 100
          
          // Adjust score based on emotion
          switch (emotionData.dominant_emotion.toLowerCase()) {
            case 'happy':
            case 'surprise':
            case 'shocked':
            case 'shock':
              score = 95 // Good emotions for studying
              break
            case 'neutral':
              score = 85 // Neutral is acceptable
              break
            case 'confused':
              score = 65 // Needs re-focus
              break
            case 'sad':
              score = 60 // Low concentration
              break
            case 'angry':
              score = 50 // Distracted
              break
            case 'fear':
              score = 40 // Very distracted
              break
            case 'disgust':
              score = 55 // Low focus
              break
          }

          if (!faceDetected) {
            score = 0
          } else {
            if (!eyesOpen) score -= 25
            if (!lookingAtScreen) score -= 15
          }

          score = Math.max(0, Math.min(100, score))

          onFocusUpdate(score, metrics)
        } else {
          setError('Emotion model is unavailable. Start the Python AI API on port 8000.')
        }
      } catch (error) {
        console.error('Frame analysis error:', error)
      } finally {
        setIsAnalyzing(false)
      }
    }

    // Analyze every 1 second for near real-time mood updates
    const interval = setInterval(analyzeFrame, 1000)
    
    // Initial analysis after 1 second
    const timeout = setTimeout(analyzeFrame, 1000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isActive, hasPermission, onFocusUpdate])

  return (
    <Card className={`bg-card border-border overflow-hidden ${className || ''}`}>
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
        <div className="relative aspect-video bg-muted flex items-center justify-center">
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

        {hasPermission && error && (
          <div className="px-4 pb-4">
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <p>{error}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
