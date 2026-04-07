'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, Clock } from 'lucide-react'

interface EarlyExitWarningProps {
  isOpen: boolean
  onResume: () => void
  onContinueLater: () => void
  sessionMinutes: number
  elapsedMinutes: number
}

export function EarlyExitWarning({
  isOpen,
  onResume,
  onContinueLater,
  sessionMinutes,
  elapsedMinutes,
}: EarlyExitWarningProps) {
  const remainingMinutes = sessionMinutes - elapsedMinutes

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Early Exit Warning
          </DialogTitle>
          <DialogDescription>
            You're trying to end the session before completing it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Attendance Not Marked Yet</AlertTitle>
            <AlertDescription>
              You must complete at least 2 minutes to mark attendance automatically. Resume your session to complete it properly.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Session Duration:</span>
              <span className="text-sm font-medium">{sessionMinutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Time Elapsed:</span>
              <span className="text-sm font-medium">{elapsedMinutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Time Remaining:</span>
              <span className="text-sm font-medium text-primary">{remainingMinutes} minutes</span>
            </div>
          </div>

          <Alert>
            <AlertTitle>What happens if you continue later?</AlertTitle>
            <AlertDescription>
              Attendance will only be marked once you resume and complete the full session duration.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onContinueLater}>
            Continue Later
          </Button>
          <Button onClick={onResume} className="gap-2">
            <Clock className="w-4 h-4" />
            Resume Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
