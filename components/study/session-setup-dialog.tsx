'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { useSubjects } from '@/hooks/use-subjects'

interface SessionSetupDialogProps {
  isOpen: boolean
  onClose: () => void
  onStart: (subject: string, duration: number) => void
}

export function SessionSetupDialog({ isOpen, onClose, onStart }: SessionSetupDialogProps) {
  const { subjects } = useSubjects()
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [duration, setDuration] = useState('45')
  const [error, setError] = useState('')
  const customOptionValue = '__custom__'

  const selectedSubjectName = useMemo(
    () => subjects.find((item) => item.id === selectedSubjectId)?.name || '',
    [selectedSubjectId, subjects]
  )

  const resolvedSubject = useMemo(() => {
    if (subjects.length === 0) return customSubject.trim()
    if (selectedSubjectId === customOptionValue) return customSubject.trim()
    return selectedSubjectName.trim()
  }, [customSubject, selectedSubjectId, selectedSubjectName, subjects.length])

  useEffect(() => {
    if (!isOpen) return

    if (subjects.length === 0) {
      setSelectedSubjectId('')
      return
    }

    const selectedExists = subjects.some((item) => item.id === selectedSubjectId)
    if (!selectedSubjectId || (!selectedExists && selectedSubjectId !== customOptionValue)) {
      setSelectedSubjectId(subjects[0].id)
    }
  }, [isOpen, selectedSubjectId, subjects])

  const handleStart = useCallback(() => {
    setError('')

    if (!resolvedSubject) {
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

    onStart(resolvedSubject, finalDuration)
    setSelectedSubjectId(subjects[0]?.id || '')
    setCustomSubject('')
    setDuration('45')
    setError('')
  }, [duration, onStart, resolvedSubject, subjects])

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
            {subjects.length === 0 ? (
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Programming, History"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              />
            ) : (
              <div className="space-y-2">
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value={customOptionValue}>Custom subject</SelectItem>
                  </SelectContent>
                </Select>

                {selectedSubjectId === customOptionValue && (
                  <Input
                    placeholder="Type custom subject"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                )}
              </div>
            )}
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
