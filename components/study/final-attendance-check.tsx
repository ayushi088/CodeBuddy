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
import { Clock, Camera } from 'lucide-react'

interface FinalAttendanceCheckProps {
  isOpen: boolean
  onRecheck: () => void
  onSkip: () => void
  minutesRemaining: number
}

export function FinalAttendanceCheck({
  isOpen,
  onRecheck,
  onSkip,
  minutesRemaining,
}: FinalAttendanceCheckProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Final Attendance Check
          </DialogTitle>
          <DialogDescription>
            5 minutes before session end - please verify your presence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>Final Check Required</AlertTitle>
            <AlertDescription>
              Session ends in {minutesRemaining} minutes. We'll verify your attendance one final time to confirm you've completed the session.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">What happens next:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Camera will detect your face for 3 seconds</li>
              <li>✓ Emotion snapshot will be captured</li>
              <li>✓ Attendance will be finalized</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
          <Button onClick={onRecheck} className="gap-2">
            <Camera className="w-4 h-4" />
            Start Final Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
