'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Play,
  Pause,
  Square,
  Camera,
  CameraOff,
  Target,
  Clock,
  AlertTriangle,
  Eye,
  Smile,
  Brain,
} from 'lucide-react'
import { WebcamMonitor } from './webcam-monitor'
import { FocusMeter } from './focus-meter'
import { AlertsPanel } from './alerts-panel'
import { SessionTimer } from './session-timer'

type SessionStatus = 'setup' | 'active' | 'paused' | 'completed'

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
}

export function StudySessionContent() {
  const [status, setStatus] = useState<SessionStatus>('setup')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [plannedDuration, setPlannedDuration] = useState(60)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [focusScore, setFocusScore] = useState(100)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Placeholder subjects - will be replaced with API data
  const subjects = [
    { id: '1', name: 'Mathematics', color: '#3B82F6' },
    { id: '2', name: 'Physics', color: '#10B981' },
    { id: '3', name: 'Computer Science', color: '#8B5CF6' },
  ]

  const handleStartSession = useCallback(() => {
    if (!selectedSubject) {
      alert('Please select a subject')
      return
    }
    setStatus('active')
    setSessionSeconds(0)
    setAlerts([])
  }, [selectedSubject])

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
  }, [])

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
    
    // Generate alerts based on metrics
    if (!metrics.faceDetected) {
      addAlert('warning', 'Face not detected - Please stay in frame')
    } else if (!metrics.eyesOpen) {
      addAlert('info', 'Eyes appear closed - Taking a break?')
    } else if (!metrics.lookingAtScreen) {
      addAlert('warning', 'Looking away from screen')
    }
  }, [addAlert])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Session</h1>
          <p className="text-muted-foreground mt-1">
            {status === 'setup' && 'Configure your study session below'}
            {status === 'active' && 'Focus on your studies - AI monitoring active'}
            {status === 'paused' && 'Session paused - Take a break'}
            {status === 'completed' && 'Great work! Session completed'}
          </p>
        </div>
      </div>

      {status === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border lg:col-span-1 max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Start a New Session</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger id="subject" className="bg-input border-border">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: subject.color }}
                          />
                          {subject.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="duration">Planned Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={240}
                  value={plannedDuration}
                  onChange={(e) => setPlannedDuration(Number(e.target.value))}
                  className="bg-input border-border"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Enable webcam monitoring</span>
                </div>
                <Button
                  variant={cameraEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                >
                  {cameraEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <Button onClick={handleStartSession} className="w-full mt-2 gap-2" size="lg">
                <Play className="w-5 h-5" />
                Start Session
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            {cameraEnabled && (
              <WebcamMonitor
                isActive={false}
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
                    value="Focused"
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
