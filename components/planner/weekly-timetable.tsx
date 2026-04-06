'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface ScheduledBlock {
  id: string
  title: string
  subject: string
  subjectColor: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 10 PM

export function WeeklyTimetable() {
  const [blocks, setBlocks] = useState<ScheduledBlock[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1) // Monday

  // Placeholder subjects
  const subjects = [
    { id: '1', name: 'Mathematics', color: '#3B82F6' },
    { id: '2', name: 'Physics', color: '#10B981' },
    { id: '3', name: 'Computer Science', color: '#8B5CF6' },
    { id: '4', name: 'Chemistry', color: '#F59E0B' },
  ]

  const [newBlock, setNewBlock] = useState({
    title: '',
    subjectId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
  })

  const handleAddBlock = () => {
    const subject = subjects.find(s => s.id === newBlock.subjectId)
    if (!subject) return

    const block: ScheduledBlock = {
      id: Date.now().toString(),
      title: newBlock.title || subject.name,
      subject: subject.name,
      subjectColor: subject.color,
      dayOfWeek: newBlock.dayOfWeek,
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
    }

    setBlocks(prev => [...prev, block])
    setIsDialogOpen(false)
    setNewBlock({
      title: '',
      subjectId: '',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    })
  }

  const getBlocksForDay = (day: number) => {
    return blocks.filter(b => b.dayOfWeek === day)
  }

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

              <Button onClick={handleAddBlock} className="mt-2">
                Add to Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                      <div
                        key={block.id}
                        className="absolute left-1 right-1 rounded-md p-2 overflow-hidden"
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
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                    <div
                      key={block.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
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
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
