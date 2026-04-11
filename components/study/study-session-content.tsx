'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  Square,
  Camera,
  CheckCircle2,
  Target,
  Eye,
  Brain,
  CalendarClock,
  AlertTriangle,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { WebcamMonitor } from './webcam-monitor'
import { AlertsPanel } from './alerts-panel'
import { SessionTimer } from './session-timer'
import { SessionSetupDialog } from './session-setup-dialog'
import { StartupEmotionDetection } from './startup-emotion-detection'
import { EarlyExitWarning } from './early-exit-warning'
import { AttendanceConfirmation } from './attendance-confirmation'
import { FinalAttendanceCheck } from './final-attendance-check'
import { SessionCompletionSummary } from './session-completion-summary'
import { audioNotifications } from '@/lib/audio-notifications'
import type { EmotionData } from '@/lib/emotion-detection'

type SessionStatus = 'setup' | 'startup-detection' | 'active' | 'paused' | 'final-check' | 'completed'
type AttendanceStatus = 'pending' | 'present' | 'late' | 'absent'

interface ScheduledSession {
  id: string
  subjectId?: string
  subject: string
  time: string
  duration: number
  goal: string
  subjectColor?: string
}

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
}

const EYES_CLOSED_ALERT_SECONDS = 10

export function StudySessionContent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<SessionStatus>('setup')
  const [plannedDuration, setPlannedDuration] = useState(60)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState(false)
  const [focusScore, setFocusScore] = useState(100)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [liveMetrics, setLiveMetrics] = useState({
    faceDetected: false,
    eyesOpen: false,
    eyeLandmarksDetected: false,
    lookingAtScreen: false,
  })
  
  // Emotion tracking
  const [emotionHistory, setEmotionHistory] = useState<EmotionData[]>([])
  const emotionHistoryRef = useRef<EmotionData[]>([])
  
  // New workflow state
  const [showSetupDialog, setShowSetupDialog] = useState(false)
  const [sessionSubject, setSessionSubject] = useState('')
  const [showEarlyExitWarning, setShowEarlyExitWarning] = useState(false)
  const [showAttendanceConfirmation, setShowAttendanceConfirmation] = useState(false)
  const [showFinalCheck, setShowFinalCheck] = useState(false)
  const [attendanceMarkedAt, setAttendanceMarkedAt] = useState<number | null>(null)
  const [finalCheckTriggered, setFinalCheckTriggered] = useState(false)
  const lastAlertTimestampRef = useRef<Map<string, number>>(new Map())
  const faceMissingStreakRef = useRef(0)
  const eyesClosedStreakRef = useRef(0)
  const lookingAwayStreakRef = useRef(0)
  const faceMissingAlertActiveRef = useRef(false)
  const eyesClosedAlertActiveRef = useRef(false)
  const lookingAwayAlertActiveRef = useRef(false)
  const spoofAlertActiveRef = useRef(false)
  const livenessSuspiciousStreakRef = useRef(0)
  const focusScoreRef = useRef(100)
  const focusScoreTotalRef = useRef(0)
  const focusScoreSamplesRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [now, setNow] = useState(new Date())
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [todaySessions, setTodaySessions] = useState<ScheduledSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('pending')
  const [attendanceMessage, setAttendanceMessage] = useState('Select a scheduled session to begin.')
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [attendanceInProgress, setAttendanceInProgress] = useState(false)
  const [isVoiceMuted, setIsVoiceMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const parseTime = useCallback((timeValue: string) => {
    const [hours, minutes] = timeValue.split(':').map(Number)
    return { hours, minutes }
  }, [])

  const getSessionBounds = useCallback((session: ScheduledSession) => {
    const [startRaw, endRaw] = session.time.split('-').map(part => part.trim())
    const start = new Date(now)
    const end = new Date(now)
    const { hours: startHours, minutes: startMinutes } = parseTime(startRaw)
    const { hours: endHours, minutes: endMinutes } = parseTime(endRaw)

    start.setHours(startHours, startMinutes, 0, 0)
    end.setHours(endHours, endMinutes, 0, 0)

    return { start, end }
  }, [now, parseTime])

  const getSessionTimingStateAt = useCallback((session: ScheduledSession, referenceDate: Date) => {
    const [startRaw, endRaw] = session.time.split('-').map(part => part.trim())
    const start = new Date(referenceDate)
    const end = new Date(referenceDate)
    const { hours: startHours, minutes: startMinutes } = parseTime(startRaw)
    const { hours: endHours, minutes: endMinutes } = parseTime(endRaw)

    start.setHours(startHours, startMinutes, 0, 0)
    end.setHours(endHours, endMinutes, 0, 0)

    if (referenceDate < start) return 'upcoming'
    if (referenceDate > end) return 'ended'
    return 'active'
  }, [parseTime])

  const getSessionTimingState = useCallback((session: ScheduledSession) => {
    return getSessionTimingStateAt(session, now)
  }, [getSessionTimingStateAt, now])

  const upcomingSessions = useMemo(
    () => todaySessions.filter((session) => getSessionTimingState(session) === 'upcoming'),
    [getSessionTimingState, todaySessions]
  )

  const selectedSession = useMemo(
    () => upcomingSessions.find((session) => session.id === selectedSessionId) || null,
    [upcomingSessions, selectedSessionId]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setIsVoiceMuted(audioNotifications.isMuted())
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    const loadTodaySessions = async () => {
      try {
        setIsLoadingSessions(true)
        setSessionsError(null)

        const response = await fetch('/api/timetable')
        if (!response.ok) {
          if (response.status === 401) {
            setTodaySessions([])
            setSessionsError('Please log in to view your scheduled sessions.')
            return
          }

          setTodaySessions([])
          setSessionsError('Failed to fetch timetable. Please try again in a moment.')
          return
        }

        const data = await response.json()
        const day = new Date().getDay()
        const sessions: ScheduledSession[] = (data.entries || [])
          .filter((entry: {
            id: string
            day_of_week: number
            subject_id?: number
            subject_name?: string
            subject_color?: string
            start_time: string
            end_time: string
            title?: string
          }) => entry.day_of_week === day)
          .map((entry: {
            id: string
            subject_id?: number
            subject_name?: string
            subject_color?: string
            start_time: string
            end_time: string
            title?: string
          }) => {
            const [startHour, startMinute] = entry.start_time.split(':').map(Number)
            const [endHour, endMinute] = entry.end_time.split(':').map(Number)
            const duration = Math.max((endHour * 60 + endMinute) - (startHour * 60 + startMinute), 0)

            return {
              id: String(entry.id),
              subjectId: entry.subject_id ? String(entry.subject_id) : undefined,
              subject: entry.subject_name || 'General Study',
              time: `${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}`,
              duration,
              goal: entry.title || `Study ${entry.subject_name || 'session'}`,
              subjectColor: entry.subject_color,
            }
          })
          .sort((a: ScheduledSession, b: ScheduledSession) => a.time.localeCompare(b.time))

        setTodaySessions(sessions)

        if (sessions.length > 0) {
          const nowAtLoad = new Date()
          const firstUpcoming = sessions.find(session => getSessionTimingStateAt(session, nowAtLoad) === 'upcoming')
          setSelectedSessionId(firstUpcoming ? firstUpcoming.id : '')
        }
      } catch (error) {
        console.warn('Error loading today sessions:', error)
        setSessionsError('Unable to load today\'s sessions. Please refresh and try again.')
      } finally {
        setIsLoadingSessions(false)
      }
    }

    loadTodaySessions()
  }, [getSessionTimingStateAt])

  useEffect(() => {
    if (!selectedSession || status !== 'setup') return

    const timing = getSessionTimingState(selectedSession)

    if (timing === 'upcoming') {
      setAttendanceStatus('pending')
      setAttendanceMarked(false)
      setAttendanceMessage('Session will start at scheduled time')
      return
    }

    if (timing === 'ended' && !attendanceMarked) {
      setAttendanceStatus('absent')
      setAttendanceMessage('Attendance status: Absent. You missed this session.')
      return
    }

    if (timing === 'active' && !attendanceMarked) {
      setAttendanceStatus('pending')
      setAttendanceMessage('Click Mark Attendance to open webcam and verify your presence.')
    }
  }, [attendanceMarked, getSessionTimingState, selectedSession, status])

  useEffect(() => {
    if (upcomingSessions.length === 0) {
      if (selectedSessionId !== '') {
        setSelectedSessionId('')
      }
      return
    }

    const selectedIsUpcoming = upcomingSessions.some((session) => session.id === selectedSessionId)
    if (!selectedIsUpcoming) {
      setSelectedSessionId(upcomingSessions[0].id)
    }
  }, [upcomingSessions, selectedSessionId])

  // New workflow: Handle "Start Study Session" button click
  const handleStartStudyClick = useCallback(() => {
    // Show setup dialog if no active session
    if (todaySessions.length === 0 || !selectedSession) {
      setShowSetupDialog(true)
    } else {
      // If there's an active session, start directly
      handleStartSessionWithSetup(selectedSession.subject, selectedSession.duration)
    }
  }, [todaySessions, selectedSession])

  // Handle form submission from setup dialog
  const handleStartSessionWithSetup = useCallback((subject: string, duration: number) => {
    setSessionSubject(subject)
    setPlannedDuration(duration)
    setShowSetupDialog(false)
    
    // Enable camera and start emotion detection startup
    setCameraEnabled(true)
    setEmotionDetectionEnabled(true)
    setStatus('startup-detection')
    setSessionSeconds(0)
    setAttendanceMarkedAt(null)
    setFinalCheckTriggered(false)
    setFocusScore(100)
    focusScoreRef.current = 100
    focusScoreTotalRef.current = 0
    focusScoreSamplesRef.current = 0
    emotionHistoryRef.current = []
  }, [])

  const handleSessionTick = useCallback(() => {
    setSessionSeconds((currentSeconds) => currentSeconds + 1)
  }, [])

  // Handle completion of startup emotion detection
  const handleStartupEmotionComplete = useCallback((emotionData: EmotionData | null) => {
    void emotionData
    
    // Start the actual session
    setStatus('active')
    setSessionSeconds(0)
  }, [])

  // Auto-mark attendance after 2 minutes
  useEffect(() => {
    if (status !== 'active') return
    
    // Check if 2 minutes (120 seconds) have passed
    if (sessionSeconds === 120 && attendanceMarkedAt === null) {
      setAttendanceMarkedAt(sessionSeconds)
      audioNotifications.attendanceMarked()
      addAlert('info', '✓ Attendance marked automatically after 2 minutes')
    }
  }, [sessionSeconds, status, attendanceMarkedAt])

  // Final check 5 minutes before session end
  useEffect(() => {
    if (status !== 'active' || plannedDuration === 0) return
    
    const sessionEndAt = plannedDuration * 60
    const checkAt = sessionEndAt - 300 // 5 minutes before
    
    if (sessionSeconds === checkAt && !finalCheckTriggered && attendanceMarkedAt !== null) {
      setFinalCheckTriggered(true)
      setShowFinalCheck(true)
    }
  }, [sessionSeconds, status, plannedDuration, finalCheckTriggered, attendanceMarkedAt])

  // End session - show warning if attendance not marked
  const handleEndSession = useCallback(() => {
    if (attendanceMarkedAt === null && sessionSeconds < 120) {
      setShowEarlyExitWarning(true)
      return
    }

    // Session can end
    setStatus('final-check')
    setShowAttendanceConfirmation(true)
  }, [sessionSeconds, attendanceMarkedAt])

  // Resume from early exit
  const handleResumeFromWarning = useCallback(() => {
    setShowEarlyExitWarning(false)
    setStatus('active')
  }, [])

  // Continue later from early exit
  const handleContinueLater = useCallback(() => {
    setShowEarlyExitWarning(false)
    setStatus('paused')
  }, [])

  // Handle final check recheck
  const handleFinalCheckRecheck = useCallback(() => {
    setShowFinalCheck(false)
    setCameraEnabled(true)
    // Quick 3-second recheck - mark completed after
    setTimeout(() => {
      setAttendanceMarkedAt(sessionSeconds)
      addAlert('info', '✓ Final attendance verified')
    }, 3000)
  }, [sessionSeconds])

  // Handle session completion confirmation
  const handleCompleteSession = useCallback(async () => {
    setShowAttendanceConfirmation(false)
    
    // Save emotion data and session to database
    if (selectedSession && attendanceMarkedAt !== null) {
      try {
        const averageFocusScore =
          focusScoreSamplesRef.current > 0
            ? Number((focusScoreTotalRef.current / focusScoreSamplesRef.current).toFixed(2))
            : focusScoreRef.current

        const response = await fetch('/api/emotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedSession.id,
            userId: '1', // Get from context/auth in real app
            emotionData: emotionHistoryRef.current,
            averageFocusScore,
            attendanceMarkedAt,
            plannedDuration,
            sessionSeconds,
            subject: sessionSubject,
          }),
        })
        
        if (!response.ok) {
          console.error('Failed to save session data:', response.statusText)
        }
      } catch (error) {
        console.error('Error saving session data:', error)
      }
    }
    
    setStatus('completed')
  }, [selectedSession, attendanceMarkedAt, plannedDuration, sessionSeconds, sessionSubject])

  const handleStartSession = useCallback(() => {
    handleStartStudyClick()
  }, [handleStartStudyClick])

  const handlePauseSession = useCallback(() => {
    setStatus('paused')
  }, [])

  const handleResumeSession = useCallback(() => {
    setStatus('active')
  }, [])

  const handleToggleVoiceMute = useCallback(() => {
    const nextMuted = audioNotifications.toggleMuted()
    setIsVoiceMuted(nextMuted)
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }

      await (containerRef.current || document.documentElement).requestFullscreen()
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error)
    }
  }, [])

  const handleNewSession = useCallback(() => {
    setStatus('setup')
    setSessionSeconds(0)
    setFocusScore(100)
    focusScoreRef.current = 100
    focusScoreTotalRef.current = 0
    focusScoreSamplesRef.current = 0
    setAlerts([])
    setAttendanceMarked(false)
    setAttendanceInProgress(false)
    setAttendanceStatus('pending')
    setAttendanceMessage('Select a scheduled session to begin.')
    faceMissingStreakRef.current = 0
    eyesClosedStreakRef.current = 0
    lookingAwayStreakRef.current = 0
    faceMissingAlertActiveRef.current = false
    eyesClosedAlertActiveRef.current = false
    lookingAwayAlertActiveRef.current = false
    spoofAlertActiveRef.current = false
    livenessSuspiciousStreakRef.current = 0
  }, [])

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId)
    setStatus('setup')
    setSessionSeconds(0)
    setAlerts([])
    setFocusScore(100)
    focusScoreRef.current = 100
    focusScoreTotalRef.current = 0
    focusScoreSamplesRef.current = 0
    setAttendanceMarked(false)
    setAttendanceInProgress(false)
    setAttendanceStatus('pending')
    setAttendanceMessage('Click Mark Attendance to open webcam and verify your presence.')
    faceMissingStreakRef.current = 0
    eyesClosedStreakRef.current = 0
    lookingAwayStreakRef.current = 0
    faceMissingAlertActiveRef.current = false
    eyesClosedAlertActiveRef.current = false
    lookingAwayAlertActiveRef.current = false
    spoofAlertActiveRef.current = false
    livenessSuspiciousStreakRef.current = 0
  }, [])

  const handleMarkAttendance = useCallback(() => {
    if (!selectedSession) return

    const timing = getSessionTimingState(selectedSession)

    if (timing === 'upcoming') {
      setAttendanceStatus('pending')
      setAttendanceMarked(false)
      setAttendanceInProgress(false)
      setAttendanceMessage('Session will start at scheduled time')
      return
    }

    if (timing === 'ended') {
      setAttendanceStatus('absent')
      setAttendanceMarked(false)
      setAttendanceInProgress(false)
      setAttendanceMessage('Attendance status: Absent. You missed this session.')
      return
    }

    setCameraEnabled(true)
    setAttendanceInProgress(true)
    setAttendanceMessage('Webcam opened. Stay in frame while we verify attendance...')
  }, [getSessionTimingState, selectedSession])

  const handleCreateTestSession = useCallback(async () => {
    try {
      setIsLoadingSessions(true)
      const response = await fetch('/api/test-session', { method: 'POST' })
      if (response.ok) {
        // Reload sessions
        const timetableResponse = await fetch('/api/timetable')
        if (timetableResponse.ok) {
          const data = await timetableResponse.json()
          const day = new Date().getDay()
          const sessions: ScheduledSession[] = (data.entries || [])
            .filter((entry: any) => entry.day_of_week === day)
            .map((entry: any) => {
              const [startHour, startMinute] = entry.start_time.split(':').map(Number)
              const [endHour, endMinute] = entry.end_time.split(':').map(Number)
              const duration = Math.max((endHour * 60 + endMinute) - (startHour * 60 + startMinute), 0)

              return {
                id: String(entry.id),
                subjectId: entry.subject_id ? String(entry.subject_id) : undefined,
                subject: entry.subject_name || 'General Study',
                time: `${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}`,
                duration,
                goal: entry.title || `Study ${entry.subject_name || 'session'}`,
                subjectColor: entry.subject_color,
              }
            })
            .sort((a: ScheduledSession, b: ScheduledSession) => a.time.localeCompare(b.time))
          
          setTodaySessions(sessions)

          const nowAtLoad = new Date()
          const firstUpcoming = sessions.find(session => getSessionTimingStateAt(session, nowAtLoad) === 'upcoming')
          setSelectedSessionId(firstUpcoming ? firstUpcoming.id : '')
        }
      }
    } catch (error) {
      console.error('Error creating test session:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  const addAlert = useCallback((type: Alert['type'], message: string) => {
    const nowMs = Date.now()
    const alertKey = `${type}:${message}`
    const lastTimestamp = lastAlertTimestampRef.current.get(alertKey) ?? 0
    const duplicateCooldownMs = 8000

    // Drop identical alerts during cooldown to avoid per-second spam.
    if (nowMs - lastTimestamp < duplicateCooldownMs) {
      return
    }

    lastAlertTimestampRef.current.set(alertKey, nowMs)

    const newAlert: Alert = {
      id: nowMs.toString(),
      type,
      message,
      timestamp: new Date(),
    }
    setAlerts(prev => [newAlert, ...prev].slice(0, 10))
  }, [])

  const handleFocusUpdate = useCallback((newScore: number, metrics: {
    faceDetected: boolean
    eyesOpen: boolean
    eyeLandmarksDetected?: boolean
    lookingAtScreen: boolean
    livenessSuspicious?: boolean
    motionScore?: number
    emotion?: string
    emotionConfidence?: number
    allEmotions?: Record<string, number>
  }) => {
    if (metrics.livenessSuspicious) {
      livenessSuspiciousStreakRef.current += 1
    } else {
      livenessSuspiciousStreakRef.current = 0
      audioNotifications.stopAll()
      spoofAlertActiveRef.current = false
    }

    const shouldBlockAsSpoof =
      livenessSuspiciousStreakRef.current >= 4 &&
      (metrics.motionScore ?? Number.POSITIVE_INFINITY) < 1.15

    if (shouldBlockAsSpoof) {
      focusScoreRef.current = 0
      setFocusScore(0)
      setLiveMetrics({
        faceDetected: false,
        eyesOpen: false,
        eyeLandmarksDetected: false,
        lookingAtScreen: false,
      })

      faceMissingStreakRef.current = 0
      eyesClosedStreakRef.current = 0
      lookingAwayStreakRef.current = 0
      faceMissingAlertActiveRef.current = false
      eyesClosedAlertActiveRef.current = false
      lookingAwayAlertActiveRef.current = false

      if (!spoofAlertActiveRef.current) {
        spoofAlertActiveRef.current = true
        addAlert('error', 'Replay/photo attack detected - show your real face directly to the webcam.')
      }

      return
    }

    // Smooth score updates to avoid distracting jumps during active study.
    const currentScore = focusScoreRef.current
    const delta = newScore - currentScore
    let nextScore = currentScore

    if (Math.abs(delta) >= 1) {
      const weightedDelta = delta * 0.35
      const cappedStep = Math.max(-6, Math.min(6, weightedDelta))
      nextScore = Math.round(Math.max(0, Math.min(100, currentScore + cappedStep)))
    }

    focusScoreRef.current = nextScore
    setFocusScore(nextScore)

    if (status === 'active') {
      focusScoreTotalRef.current += nextScore
      focusScoreSamplesRef.current += 1
    }

    setLiveMetrics({
      faceDetected: metrics.faceDetected,
      eyesOpen: metrics.eyesOpen,
      eyeLandmarksDetected: metrics.eyeLandmarksDetected !== false,
      lookingAtScreen: metrics.lookingAtScreen,
    })
    if (emotionDetectionEnabled) {
      // Track emotion data
      if (metrics.emotionConfidence !== undefined && metrics.allEmotions) {
        const emotionData: EmotionData = {
          dominant_emotion: metrics.emotion || 'neutral',
          all_emotions: metrics.allEmotions as any,
          confidence: metrics.emotionConfidence,
          timestamp: new Date(),
        }

        emotionHistoryRef.current.push(emotionData)
        
        // Keep only last 60 emotions in state (for performance)
        setEmotionHistory(prev => [...prev, emotionData].slice(-60))
      }
    }

    if (
      status === 'setup' &&
      selectedSession &&
      attendanceInProgress &&
      !attendanceMarked &&
      getSessionTimingState(selectedSession) === 'active'
    ) {
      if (metrics.faceDetected && metrics.eyesOpen) {
        const { start } = getSessionBounds(selectedSession)
        const joinedLate = now.getTime() > start.getTime() + 5 * 60 * 1000
        setAttendanceStatus(joinedLate ? 'late' : 'present')
        setAttendanceMarked(true)
        setAttendanceInProgress(false)
        setAttendanceMessage('Attendance Marked Successfully')
      } else {
        setAttendanceMessage(
          metrics.faceDetected
            ? 'Face detected but eyes are closed. Please keep your eyes open for attendance capture.'
            : 'Face not detected yet. Please stay visible to the webcam.'
        )
      }
      return
    }
    
    // Generate alerts only for sustained conditions and once per continuous event.
    const missingFaceThreshold = 2
    const eyesClosedThreshold = EYES_CLOSED_ALERT_SECONDS
    const lookingAwayThreshold = 2

    if (!metrics.faceDetected) {
      faceMissingStreakRef.current += 1
      eyesClosedStreakRef.current = 0
      lookingAwayStreakRef.current = 0
      eyesClosedAlertActiveRef.current = false
      lookingAwayAlertActiveRef.current = false

      if (
        faceMissingStreakRef.current >= missingFaceThreshold &&
        !faceMissingAlertActiveRef.current
      ) {
        faceMissingAlertActiveRef.current = true
        addAlert('warning', 'Face not detected - Please stay in frame')
      }
    } else {
      faceMissingStreakRef.current = 0
      faceMissingAlertActiveRef.current = false

      if ((metrics.eyeLandmarksDetected !== false) && !metrics.eyesOpen) {
        eyesClosedStreakRef.current += 1
        if (
          eyesClosedStreakRef.current >= eyesClosedThreshold &&
          !eyesClosedAlertActiveRef.current
        ) {
          eyesClosedAlertActiveRef.current = true
          addAlert('warning', 'Sleeping alert: eyes closed for 10 seconds. Please wake up and refocus.')
        }
      } else {
        eyesClosedStreakRef.current = 0
        eyesClosedAlertActiveRef.current = false
      }

      if (!metrics.lookingAtScreen) {
        lookingAwayStreakRef.current += 1
        if (
          lookingAwayStreakRef.current >= lookingAwayThreshold &&
          !lookingAwayAlertActiveRef.current
        ) {
          lookingAwayAlertActiveRef.current = true
          addAlert('warning', 'Looking away from screen')
        }
      } else {
        lookingAwayStreakRef.current = 0
        lookingAwayAlertActiveRef.current = false
      }
    }
  }, [addAlert, attendanceInProgress, attendanceMarked, emotionDetectionEnabled, getSessionBounds, getSessionTimingState, now, selectedSession, status])

  const attendanceBadgeVariant =
    attendanceStatus === 'present'
      ? 'default'
      : attendanceStatus === 'late'
      ? 'secondary'
      : attendanceStatus === 'absent'
      ? 'destructive'
      : 'outline'

  const isSessionRunningView = status === 'active' || status === 'paused'

  return (
    <div
      ref={containerRef}
      className={`max-w-[1400px] mx-auto ${
        isSessionRunningView ? 'px-4 pt-2 pb-4 space-y-4' : 'p-6 space-y-6'
      }`}
    >
      {/* Dialogs for new workflow */}
      <SessionSetupDialog
        isOpen={showSetupDialog}
        onClose={() => setShowSetupDialog(false)}
        onStart={handleStartSessionWithSetup}
      />

      <StartupEmotionDetection
        videoRef={videoRef}
        canvasRef={canvasRef}
        isActive={status === 'startup-detection'}
        onComplete={handleStartupEmotionComplete}
      />

      <EarlyExitWarning
        isOpen={showEarlyExitWarning}
        onResume={handleResumeFromWarning}
        onContinueLater={handleContinueLater}
        sessionMinutes={plannedDuration}
        elapsedMinutes={Math.floor(sessionSeconds / 60)}
      />

      <FinalAttendanceCheck
        isOpen={showFinalCheck}
        onRecheck={handleFinalCheckRecheck}
        onSkip={() => setShowFinalCheck(false)}
        minutesRemaining={Math.ceil((plannedDuration * 60 - sessionSeconds) / 60)}
      />

      <AttendanceConfirmation
        isOpen={showAttendanceConfirmation}
        onConfirm={handleCompleteSession}
        sessionMinutes={plannedDuration}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Study Planner</h1>
          <p className="text-muted-foreground mt-1">
            {status === 'setup' && 'Click "Start Study Session" to begin'}
            {status === 'startup-detection' && 'Preparing your session... (5 seconds)'}
            {status === 'active' && 'Focus on your studies - AI monitoring active'}
            {status === 'paused' && 'Session paused - Take a break'}
            {(status === 'final-check' || status === 'completed') && 'Session completing - attendancecheck'}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-1.5 backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleToggleVoiceMute}
            aria-label={isVoiceMuted ? 'Unmute voice alerts' : 'Mute voice alerts'}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isVoiceMuted ? 'Voice Muted' : 'Mute Voice'}
          </Button>
        </div>
      </div>

      {status === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                Upcoming Study Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {isLoadingSessions && (
                <p className="text-sm text-muted-foreground">Loading today's sessions...</p>
              )}

              {sessionsError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Unable to Load Sessions</AlertTitle>
                  <AlertDescription>{sessionsError}</AlertDescription>
                </Alert>
              )}

              {!isLoadingSessions && !sessionsError && upcomingSessions.length === 0 && (
                <div className="flex flex-col gap-3">
                  <Alert>
                    <AlertTitle>No Upcoming Sessions Today</AlertTitle>
                    <AlertDescription>
                      Add upcoming blocks in Planner to see sessions here, or start a quick study session below.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={() => setShowSetupDialog(true)}
                    className="w-full gap-2"
                  >
                    <Brain className="w-4 h-4" />
                    Quick Start Study Session
                  </Button>
                  <Button 
                    onClick={handleCreateTestSession}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Create Test Session
                  </Button>
                </div>
              )}

              {upcomingSessions.map((session) => {
                const isSelected = selectedSessionId === session.id
                const [startTime, endTime] = session.time.split(' - ')

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{startTime} – {endTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">→ {session.subject}</p>
                    <p className="text-xs text-muted-foreground">{session.goal}</p>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground">Selected Session Details</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {!selectedSession ? (
                  <p className="text-sm text-muted-foreground">Select a session to view details.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Subject</p>
                        <p className="text-sm font-medium text-foreground">{selectedSession.subject}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="text-sm font-medium text-foreground">{selectedSession.time}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium text-foreground">{selectedSession.duration} minutes</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Goal</p>
                        <p className="text-sm font-medium text-foreground">{selectedSession.goal}</p>
                      </div>
                    </div>

                    <Alert>
                      <AlertTitle>Attendance Guidance</AlertTitle>
                      <AlertDescription>
                        {attendanceMessage}
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={attendanceBadgeVariant}>Attendance: {attendanceStatus}</Badge>

                      <Button
                        onClick={handleMarkAttendance}
                        disabled={!selectedSession || attendanceInProgress}
                        variant="outline"
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {attendanceInProgress ? 'Detecting Presence...' : 'Mark Attendance'}
                      </Button>
                      
                      <Button
                        onClick={() => {
                          setAttendanceStatus('present')
                          setAttendanceMarked(true)
                          setCameraEnabled(true)
                          setEmotionDetectionEnabled(true)
                        }}
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                      >
                        <Brain className="w-4 h-4" />
                        Quick Start (Test)
                      </Button>
                    </div>

                    {attendanceMarked && (attendanceStatus === 'present' || attendanceStatus === 'late') && (
                      <Button onClick={handleStartSession} className="w-full mt-2 gap-2" size="lg">
                        <Play className="w-5 h-5" />
                        Join Session
                      </Button>
                    )}
                    
                    {!attendanceMarked && (
                      <Button 
                        onClick={() => handleStartSessionWithSetup(selectedSession?.subject || 'Focus Study', selectedSession?.duration || 60)}
                        className="w-full mt-2 gap-2" 
                        size="lg"
                      >
                        <Brain className="w-4 h-4" />
                        Start Study Session
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {cameraEnabled && selectedSession && (
              <WebcamMonitor
                isActive={!attendanceMarked}
                onFocusUpdate={handleFocusUpdate}
              />
            )}
          </div>
        </div>
      )}

      {status === 'startup-detection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary animate-pulse" />
                  Session Starting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Initializing camera checks. Please stay visible to the camera.
                </p>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  {cameraEnabled && <div className="text-muted-foreground">Camera Feed</div>}
                </div>
              </CardContent>
            </Card>

            <StartupEmotionDetection
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={true}
              onComplete={handleStartupEmotionComplete}
              duration={5}
            />
          </div>

          <div className="flex flex-col gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{sessionSubject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{plannedDuration} minutes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {(status === 'active' || status === 'paused') && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.35fr)_minmax(280px,0.9fr)] gap-5 items-stretch">
          {/* Main Area - Webcam & Focus */}
          <div className="flex flex-col gap-5 min-h-[72vh]">
            {/* Session Timer & Controls */}
            <Card className="bg-card/90 border-border/70 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <SessionTimer
                    isRunning={status === 'active'}
                    seconds={sessionSeconds}
                    onTick={handleSessionTick}
                    plannedMinutes={plannedDuration}
                  />
                  <div className="flex items-center gap-2">
                    {status === 'active' ? (
                      <Button onClick={handlePauseSession} variant="outline" className="gap-2">
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    ) : (
                      <Button onClick={handleResumeSession} className="gap-2">
                        <Play className="w-4 h-4" />
                        Resume
                      </Button>
                    )}
                    <Button onClick={handleEndSession} variant="destructive" className="gap-2">
                      <Square className="w-4 h-4" />
                      End Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webcam Monitor */}
            {cameraEnabled && (
              <WebcamMonitor
                isActive={status === 'active'}
                onFocusUpdate={handleFocusUpdate}
              />
            )}

            {/* Focus Metrics */}
            <Card className="bg-card/90 border-border/70 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Live Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    icon={Target}
                    label="Focus Score"
                    value={`${focusScore}%`}
                    color={focusScore >= 70 ? 'success' : focusScore >= 40 ? 'warning' : 'destructive'}
                  />
                  <MetricCard
                    icon={Eye}
                    label="Eyes Status"
                    value={
                      liveMetrics.faceDetected
                        ? (liveMetrics.eyeLandmarksDetected
                          ? (liveMetrics.eyesOpen ? 'Open' : 'Closed')
                          : 'Detecting')
                        : 'No face'
                    }
                    color={
                      liveMetrics.faceDetected
                        ? (liveMetrics.eyeLandmarksDetected
                          ? (liveMetrics.eyesOpen ? 'success' : 'warning')
                          : 'primary')
                        : 'destructive'
                    }
                  />
                  <MetricCard
                    icon={Camera}
                    label="Face Detection"
                    value={liveMetrics.faceDetected ? 'Detected' : 'Missing'}
                    color={liveMetrics.faceDetected ? 'success' : 'destructive'}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Focus Meter & Alerts */}
          <div className="flex flex-col gap-6 min-h-[72vh]">
            <AlertsPanel alerts={alerts} className="h-full" />
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="w-full">
          <SessionCompletionSummary
            subject={sessionSubject}
            duration={sessionSeconds}
            emotionHistory={emotionHistory}
            focusScore={focusScore}
            onClose={() => {
              handleNewSession()
            }}
          />
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'primary' | 'success' | 'warning' | 'destructive'
}) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }

  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
      <Icon className={`w-5 h-5 ${colorClasses[color]} mb-2`} />
      <span className={`text-lg font-bold ${colorClasses[color]}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
