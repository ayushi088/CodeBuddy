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
import { CheckCircle2, Clock } from 'lucide-react'

interface AttendanceConfirmationProps {
  isOpen: boolean
  onConfirm: () => void
  sessionMinutes: number
}

export function AttendanceConfirmation({
  isOpen,
  onConfirm,
  sessionMinutes,
}: AttendanceConfirmationProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Session Complete!
          </DialogTitle>
          <DialogDescription>
            Your attendance has been successfully marked
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Attendance Marked</AlertTitle>
            <AlertDescription>
              You have successfully completed your study session and attendance has been recorded.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Session Duration:</span>
              <span className="text-sm font-medium">{sessionMinutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className="text-sm font-medium text-green-600">Present</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Attendance marked automatically</p>
            <p>✓ Session analytics captured</p>
            <p>✓ Session data saved</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onConfirm} className="w-full">
            Finish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
