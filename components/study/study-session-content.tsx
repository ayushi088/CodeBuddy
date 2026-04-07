'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
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
  Smile,
  Brain,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'
import { WebcamMonitor } from './webcam-monitor'
import { FocusMeter } from './focus-meter'
import { AlertsPanel } from './alerts-panel'
import { SessionTimer } from './session-timer'

type SessionStatus = 'setup' | 'active' | 'paused' | 'completed'
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

export function StudySessionContent() {
  const [status, setStatus] = useState<SessionStatus>('setup')
  const [plannedDuration, setPlannedDuration] = useState(60)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [emotionDetectionEnabled, setEmotionDetectionEnabled] = useState(false)
  const [focusScore, setFocusScore] = useState(100)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lastEmotion, setLastEmotion] = useState('N/A')

  const [now, setNow] = useState(new Date())
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [todaySessions, setTodaySessions] = useState<ScheduledSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('pending')
  const [attendanceMessage, setAttendanceMessage] = useState('Select a scheduled session to begin.')
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [attendanceInProgress, setAttendanceInProgress] = useState(false)

  const selectedSession = useMemo(
    () => todaySessions.find((session) => session.id === selectedSessionId) || null,
    [todaySessions, selectedSessionId]
  )

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

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 30000)

    return () => clearInterval(interval)
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
          const active = sessions.find(session => getSessionTimingStateAt(session, nowAtLoad) === 'active')
          const firstUpcoming = sessions.find(session => getSessionTimingStateAt(session, nowAtLoad) === 'upcoming')
          const defaultSelection = active || firstUpcoming || sessions[0]
          setSelectedSessionId(defaultSelection.id)
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

  const handleStartSession = useCallback(() => {
    if (!selectedSession) {
      setAttendanceMessage('Please select a scheduled session before starting.')
      return
    }

    if (!(attendanceStatus === 'present' || attendanceStatus === 'late')) {
      setAttendanceMessage('Mark attendance first to unlock session start.')
      return
    }

    setStatus('active')
    setPlannedDuration(selectedSession.duration || 60)
    setCameraEnabled(true)
    setEmotionDetectionEnabled(true)
    setSessionSeconds(0)
    setAlerts([])
  }, [attendanceStatus, selectedSession])

  const handlePauseSession = useCallback(() => {
    setStatus('paused')
  }, [])

  const handleResumeSession = useCallback(() => {
    setStatus('active')
  }, [])

  const handleEndSession = useCallback(() => {
    setStatus('completed')
    // TODO: Save session to database
  }, [])

  const handleNewSession = useCallback(() => {
    setStatus('setup')
    setSessionSeconds(0)
    setFocusScore(100)
    setAlerts([])
    setAttendanceMarked(false)
    setAttendanceInProgress(false)
    setAttendanceStatus('pending')
    setAttendanceMessage('Select a scheduled session to begin.')
  }, [])

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId)
    setStatus('setup')
    setSessionSeconds(0)
    setAlerts([])
    setFocusScore(100)
    setAttendanceMarked(false)
    setAttendanceInProgress(false)
    setAttendanceStatus('pending')
    setAttendanceMessage('Click Mark Attendance to open webcam and verify your presence.')
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

  const addAlert = useCallback((type: Alert['type'], message: string) => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
    }
    setAlerts(prev => [newAlert, ...prev].slice(0, 10))
  }, [])

  const handleFocusUpdate = useCallback((newScore: number, metrics: {
    faceDetected: boolean
    eyesOpen: boolean
    lookingAtScreen: boolean
    emotion?: string
  }) => {
    setFocusScore(newScore)
    if (emotionDetectionEnabled) {
      setLastEmotion(metrics.emotion || 'Neutral')
    }

    if (
      status === 'setup' &&
      selectedSession &&
      attendanceInProgress &&
      !attendanceMarked &&
      getSessionTimingState(selectedSession) === 'active'
    ) {
      if (metrics.faceDetected) {
        const { start } = getSessionBounds(selectedSession)
        const joinedLate = now.getTime() > start.getTime() + 5 * 60 * 1000
        setAttendanceStatus(joinedLate ? 'late' : 'present')
        setAttendanceMarked(true)
        setAttendanceInProgress(false)
        setAttendanceMessage('Attendance Marked Successfully')
      } else {
        setAttendanceMessage('Face not detected yet. Please stay visible to the webcam.')
      }
      return
    }
    
    // Generate alerts based on metrics
    if (!metrics.faceDetected) {
      addAlert('warning', 'Face not detected - Please stay in frame')
    } else if (!metrics.eyesOpen) {
      addAlert('info', 'Eyes appear closed - Taking a break?')
    } else if (!metrics.lookingAtScreen) {
      addAlert('warning', 'Looking away from screen')
    }
  }, [addAlert, attendanceInProgress, attendanceMarked, emotionDetectionEnabled, getSessionBounds, getSessionTimingState, now, selectedSession, status])

  const activeSessionId = useMemo(() => {
    const activeSession = todaySessions.find(session => getSessionTimingState(session) === 'active')
    return activeSession?.id || null
  }, [getSessionTimingState, todaySessions])

  const attendanceBadgeVariant =
    attendanceStatus === 'present'
      ? 'default'
      : attendanceStatus === 'late'
      ? 'secondary'
      : attendanceStatus === 'absent'
      ? 'destructive'
      : 'outline'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
          <p className="text-muted-foreground mt-1">
            {status === 'setup' && 'Select today\'s session, mark attendance, then start studying'}
            {status === 'active' && 'Focus on your studies - AI monitoring active'}
            {status === 'paused' && 'Session paused - Take a break'}
            {status === 'completed' && 'Great work! Session completed'}
          </p>
        </div>
      </div>

      {status === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                Today's Study Schedule
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

              {!isLoadingSessions && !sessionsError && todaySessions.length === 0 && (
                <Alert>
                  <AlertTitle>No Sessions Scheduled Today</AlertTitle>
                  <AlertDescription>
                    Add blocks in Planner to see sessions here.
                  </AlertDescription>
                </Alert>
              )}

              {todaySessions.map((session) => {
                const isSelected = selectedSessionId === session.id
                const isActive = activeSessionId === session.id
                const [startTime, endTime] = session.time.split(' - ')

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    } ${isActive ? 'ring-1 ring-primary/50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{startTime} – {endTime}</span>
                      {isActive && <Badge>Active Now</Badge>}
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
                    </div>

                    {attendanceMarked && (attendanceStatus === 'present' || attendanceStatus === 'late') && (
                      <Button onClick={handleStartSession} className="w-full mt-2 gap-2" size="lg">
                        <Play className="w-5 h-5" />
                        Join Session
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

      {(status === 'active' || status === 'paused') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Area - Webcam & Focus */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Session Timer & Controls */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <SessionTimer
                    isRunning={status === 'active'}
                    seconds={sessionSeconds}
                    onTick={() => setSessionSeconds(s => s + 1)}
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
            <Card className="bg-card border-border">
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
                    value="Open"
                    color="success"
                  />
                  <MetricCard
                    icon={Camera}
                    label="Face Detection"
                    value="Detected"
                    color="success"
                  />
                  <MetricCard
                    icon={Smile}
                    label="Emotion"
                    value={emotionDetectionEnabled ? lastEmotion : 'Disabled'}
                    color="primary"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Focus Meter & Alerts */}
          <div className="flex flex-col gap-6">
            <FocusMeter score={focusScore} />
            <AlertsPanel alerts={alerts} />
          </div>
        </div>
      )}

      {status === 'completed' && (
        <Card className="bg-card border-border max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Session Complete!</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground font-medium">
                  {Math.floor(sessionSeconds / 60)} minutes
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Focus</span>
                <span className="text-foreground font-medium">{focusScore}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Alerts Triggered</span>
                <span className="text-foreground font-medium">{alerts.length}</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleNewSession} className="flex-1 gap-2">
                <Play className="w-4 h-4" />
                New Session
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href="/reports">View Reports</a>
              </Button>
            </div>
          </CardContent>
        </Card>
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
