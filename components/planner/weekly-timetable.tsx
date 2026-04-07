'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Plus, Calendar, ChevronLeft, ChevronRight, Play, CheckCircle2 } from 'lucide-react'
import { useSubjects } from '@/hooks/use-subjects'

interface ScheduledBlock {
  id: string
  title: string
  subject: string
  subjectColor: string
  dayOfWeek: number
  startTime: string
  endTime: string
  repeatMode: 'daily' | 'weekly' | 'custom'
  repeatLabel: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 10 PM

export function WeeklyTimetable() {
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<ScheduledBlock | null>(null)
  const [selectedDay, setSelectedDay] = useState(1) // Monday
  const { subjects } = useSubjects()

  const [newBlock, setNewBlock] = useState({
    title: '',
    subjectId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    repeatMode: 'weekly' as 'daily' | 'weekly' | 'custom',
  })

  const getDayLabel = (day: number) => DAYS[day].slice(0, 3)

  const getRepeatLabel = (subject: string, dayOfWeek: number, repeatMode: ScheduledBlock['repeatMode']) => {
    if (repeatMode === 'daily') return `${subject} → Daily`
    if (repeatMode === 'weekly') return `${subject} → ${getDayLabel(dayOfWeek)}`
    return `${subject} → Mon Wed Fri`
  }

  const handleAddBlock = () => {
    const subject = subjects.find(s => s.id === newBlock.subjectId)
    if (!subject) return

    const repeatLabel = getRepeatLabel(subject.name, newBlock.dayOfWeek, newBlock.repeatMode)

    const block: ScheduledBlock = {
      id: Date.now().toString(),
      title: newBlock.title || subject.name,
      subject: subject.name,
      subjectColor: subject.color,
      dayOfWeek: newBlock.dayOfWeek,
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
      repeatMode: newBlock.repeatMode,
      repeatLabel,
    }

    setBlocks(prev => [...prev, block])
    setIsDialogOpen(false)
    setNewBlock({
      title: '',
      subjectId: '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      repeatMode: 'weekly',
    })
  }

  const openBlockDetails = (block: ScheduledBlock) => {
    setSelectedBlock(block)
    setIsDetailsOpen(true)
  }

  const getBlocksForDay = (day: number) => {
    return blocks.filter(b => b.dayOfWeek === day)
  }

  const todaysBlocks = getBlocksForDay(selectedDay).sort((a, b) => a.startTime.localeCompare(b.startTime))

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getBlockPosition = (block: ScheduledBlock) => {
    const [startHour, startMin] = block.startTime.split(':').map(Number)
    const [endHour, endMin] = block.endTime.split(':').map(Number)
    
    const startOffset = (startHour - 6) * 60 + startMin
    const duration = (endHour - 6) * 60 + endMin - startOffset
    
    return {
      top: `${(startOffset / 60) * 4}rem`,
      height: `${(duration / 60) * 4}rem`,
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Weekly Schedule
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Block
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Study Block</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <Label>Subject</Label>
                {subjects.length === 0 ? (
                  <Alert>
                    <AlertTitle>No subjects added yet</AlertTitle>
                    <AlertDescription>
                      Add a subject in the Subjects tab first. This timetable will use your entered subjects instead of default Math or Physics entries.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={newBlock.subjectId}
                    onValueChange={(v) => setNewBlock(prev => ({ ...prev, subjectId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                            {subject.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Title (optional)</Label>
                <Input
                  value={newBlock.title}
                  onChange={(e) => setNewBlock(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Chapter 5 Review"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Day</Label>
                <Select
                  value={newBlock.dayOfWeek.toString()}
                  onValueChange={(v) => setNewBlock(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Repeat Schedule</Label>
                <Select
                  value={newBlock.repeatMode}
                  onValueChange={(v) => setNewBlock(prev => ({ ...prev, repeatMode: v as 'daily' | 'weekly' | 'custom' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose repeat schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Repeat daily</SelectItem>
                    <SelectItem value="weekly">Repeat weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Example: DSA → Mon Wed Fri
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={newBlock.startTime}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={newBlock.endTime}
                    onChange={(e) => setNewBlock(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={handleAddBlock} className="mt-2" disabled={subjects.length === 0}>
                Add to Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        {/* Desktop View - Full Week */}
        <Card className="bg-card border-border hidden lg:block">
          <CardContent className="p-0">
            <div className="grid grid-cols-8">
              {/* Time Column */}
              <div className="border-r border-border">
                <div className="h-12 border-b border-border" />
                {HOURS.map(hour => (
                  <div key={hour} className="h-16 border-b border-border px-2 py-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(`${hour.toString().padStart(2, '0')}:00`)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="border-r border-border last:border-r-0 relative">
                  <div className="h-12 border-b border-border flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">{day.slice(0, 3)}</span>
                  </div>
                  <div className="relative" style={{ height: `${16 * 4}rem` }}>
                    {/* Hour grid lines */}
                    {HOURS.map(hour => (
                      <div key={hour} className="h-16 border-b border-border" />
                    ))}
                    {/* Blocks */}
                    {getBlocksForDay(dayIndex).map(block => {
                      const pos = getBlockPosition(block)
                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => openBlockDetails(block)}
                          className="absolute left-1 right-1 rounded-md p-2 overflow-hidden text-left hover:opacity-90 transition-opacity"
                          style={{
                            ...pos,
                            backgroundColor: `${block.subjectColor}20`,
                            borderLeft: `3px solid ${block.subjectColor}`,
                          }}
                        >
                          <p className="text-xs font-medium text-foreground truncate">{block.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(block.startTime)} - {formatTime(block.endTime)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Side Summary Panel */}
        <Card className="bg-card border-border hidden lg:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
                <p className="text-lg font-bold text-foreground">{todaysBlocks.length}</p>
                <p className="text-[11px] text-muted-foreground">Sessions</p>
              </div>
              <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 text-center">
                <p className="text-lg font-bold text-foreground">
                  {todaysBlocks.length > 0 ? todaysBlocks[0].subject : '--'}
                </p>
                <p className="text-[11px] text-muted-foreground">Next Subject</p>
              </div>
              <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-center">
                <p className="text-lg font-bold text-foreground">
                  {todaysBlocks.length > 0 ? getDayLabel(selectedDay) : '--'}
                </p>
                <p className="text-[11px] text-muted-foreground">Day</p>
              </div>
            </div>

            {todaysBlocks.length === 0 ? (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">No study blocks scheduled for today.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add a block to your timetable to see it here.
                </p>
              </div>
            ) : (
              todaysBlocks.map(block => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => openBlockDetails(block)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
                >
                  <div className="w-1 h-12 rounded-full" style={{ backgroundColor: block.subjectColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{block.title}</p>
                      <Badge variant="outline" className="shrink-0">{block.repeatMode}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">{block.repeatLabel}</p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile View - Single Day */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedDay(d => (d - 1 + 7) % 7)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-medium text-foreground">{DAYS[selectedDay]}</span>
          <Button variant="outline" size="icon" onClick={() => setSelectedDay(d => (d + 1) % 7)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            {getBlocksForDay(selectedDay).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No scheduled blocks for {DAYS[selectedDay]}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {getBlocksForDay(selectedDay)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(block => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => openBlockDetails(block)}
                      className="flex items-center gap-3 p-3 rounded-lg text-left w-full"
                      style={{ backgroundColor: `${block.subjectColor}15` }}
                    >
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: block.subjectColor }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{block.title}</p>
                        <p className="text-xs text-muted-foreground">{block.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(block.startTime)} - {formatTime(block.endTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">{block.repeatLabel}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>

          {selectedBlock && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium text-foreground">{selectedBlock.subject}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatTime(selectedBlock.startTime)} - {formatTime(selectedBlock.endTime)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Goal</p>
                  <p className="text-sm font-medium text-foreground">{selectedBlock.title}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button asChild className="gap-2">
                  <Link href="/study">
                    <Play className="w-4 h-4" />
                    Start Session
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/study">
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Attendance
                  </Link>
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Repeat Schedule</p>
                <p className="text-sm font-medium text-foreground mt-1">{selectedBlock.repeatLabel}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
