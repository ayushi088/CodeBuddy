'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Plus, BookOpen, Clock, Target, Trash2, Pencil } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useSubjects } from '@/hooks/use-subjects'

interface Subject {
  id: string
  name: string
  color: string
  targetHoursPerWeek: number
  studiedHoursThisWeek: number
}

const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

export function SubjectsManager() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjects()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    color: COLORS[0],
    targetHoursPerWeek: 10,
  })

  const handleSubmit = () => {
    if (!formData.name.trim()) return

    if (editingSubject) {
      updateSubject(editingSubject.id, {
        name: formData.name,
        color: formData.color,
        targetHoursPerWeek: formData.targetHoursPerWeek,
      })
    } else {
      addSubject({
        name: formData.name,
        color: formData.color,
        targetHoursPerWeek: formData.targetHoursPerWeek,
      })
    }

    setIsDialogOpen(false)
    setEditingSubject(null)
    setFormData({ name: '', color: COLORS[0], targetHoursPerWeek: 10 })
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setFormData({
      name: subject.name,
      color: subject.color,
      targetHoursPerWeek: subject.targetHoursPerWeek,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteSubject(id)
  }

  const totalTargetHours = subjects.reduce((sum, s) => sum + s.targetHoursPerWeek, 0)
  const totalStudiedHours = subjects.reduce((sum, s) => sum + s.studiedHoursThisWeek, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Subjects
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingSubject(null)
            setFormData({ name: '', color: COLORS[0], targetHoursPerWeek: 10 })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-2">
                <Label>Subject Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Weekly Target (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={formData.targetHoursPerWeek}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetHoursPerWeek: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <Button onClick={handleSubmit} className="mt-2">
                {editingSubject ? 'Save Changes' : 'Add Subject'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-card border-border mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{subjects.length}</p>
                <p className="text-sm text-muted-foreground">Subjects</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTargetHours}h</p>
                <p className="text-sm text-muted-foreground">Weekly Target</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalStudiedHours}h</p>
                <p className="text-sm text-muted-foreground">Studied This Week</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {subjects.length === 0 && (
        <Alert className="mb-6">
          <AlertTitle>No subjects added yet</AlertTitle>
          <AlertDescription>
            Add your own subjects first. The planner, tasks, and reports will use these instead of default Math or Physics entries.
          </AlertDescription>
        </Alert>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map(subject => {
          const progress = subject.targetHoursPerWeek > 0
            ? Math.min((subject.studiedHoursThisWeek / subject.targetHoursPerWeek) * 100, 100)
            : 0

          return (
            <Card key={subject.id} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.studiedHoursThisWeek}h / {subject.targetHoursPerWeek}h weekly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      onClick={() => handleEdit(subject)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(subject.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weekly Progress</span>
                    <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-2"
                    style={{
                      // Override progress bar color
                      ['--progress-color' as string]: subject.color,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
        {subjects.length === 0 && (
          <Card className="bg-card border-border md:col-span-2 lg:col-span-3">
            <CardContent className="py-10 text-center">
              <p className="text-sm font-medium text-foreground">No subjects yet</p>
              <p className="text-xs text-muted-foreground mt-1">Click Add Subject to enter your course list.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
