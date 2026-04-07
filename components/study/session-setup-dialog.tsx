'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Brain } from 'lucide-react'

interface SessionSetupDialogProps {
  isOpen: boolean
  onClose: () => void
  onStart: (subject: string, duration: number) => void
}

export function SessionSetupDialog({ isOpen, onClose, onStart }: SessionSetupDialogProps) {
  const [subject, setSubject] = useState('')
  const [duration, setDuration] = useState('45')
  const [error, setError] = useState('')

  const handleStart = useCallback(() => {
    setError('')

    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    const durationNum = Number.parseInt(duration)
    if (Number.isNaN(durationNum) || durationNum < 1) {
      setError('Please enter a valid duration')
      return
    }

    // Auto-set to 45 if less than 45
    const finalDuration = Math.max(durationNum, 45)

    onStart(subject.trim(), finalDuration)
    setSubject('')
    setDuration('45')
    setError('')
  }, [subject, duration, onStart])

  const handleDurationChange = (value: string) => {
    setDuration(value)
    const num = Number.parseInt(value)
    if (!Number.isNaN(num) && num < 45) {
      setError(`Minimum duration is 45 minutes (auto-adjusted)`)
    } else {
      setError('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Study Session</DialogTitle>
          <DialogDescription>
            Set up your study session with a subject and duration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Mathematics, Programming, History"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="duration"
                type="number"
                min="45"
                placeholder="45"
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                min 45 min
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleStart} className="gap-2">
            <Brain className="w-4 h-4" />
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
