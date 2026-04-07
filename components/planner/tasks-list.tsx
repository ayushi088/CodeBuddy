'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Plus,
  ListTodo,
  AlertCircle,
  Calendar,
  Clock,
  Trash2,
  Filter,
} from 'lucide-react'
import { useSubjects } from '@/hooks/use-subjects'

interface Task {
  id: string
  title: string
  description: string
  subject: string
  subjectColor: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  estimatedMinutes: number
}

export function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const { subjects } = useSubjects()

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    subjectId: '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    estimatedMinutes: 30,
  })

  const handleAddTask = () => {
    const subject = subjects.find(s => s.id === newTask.subjectId)
    if (!newTask.title || !subject) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      subject: subject.name,
      subjectColor: subject.color,
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      status: 'pending',
      estimatedMinutes: newTask.estimatedMinutes,
    }

    setTasks(prev => [...prev, task])
    setIsDialogOpen(false)
    setNewTask({
      title: '',
      description: '',
      subjectId: '',
      dueDate: '',
      priority: 'medium',
      estimatedMinutes: 30,
    })
  }

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: t.status === 'completed' ? 'pending' : 'completed',
        }
      }
      return t
    }))
  }

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    return true
  })

  const priorityConfig = {
    low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
    medium: { label: 'Medium', color: 'bg-warning/10 text-warning' },
    high: { label: 'High', color: 'bg-destructive/10 text-destructive' },
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-accent" />
          Tasks
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col gap-2">
                  <Label>Title</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Complete Chapter 5 exercises"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add more details..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Subject</Label>
                  {subjects.length === 0 ? (
                    <Alert>
                      <AlertTitle>No subjects added yet</AlertTitle>
                      <AlertDescription>
                        Add subjects in the Subjects tab before creating tasks.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select
                      value={newTask.subjectId}
                      onValueChange={(v) => setNewTask(prev => ({ ...prev, subjectId: v }))}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v as Task['priority'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Estimated Time (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={newTask.estimatedMinutes}
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimatedMinutes: parseInt(e.target.value) }))}
                  />
                </div>

                <Button onClick={handleAddTask} className="mt-2" disabled={subjects.length === 0}>
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ListTodo className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No tasks found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a task to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${
                    task.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTaskStatus(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${
                          task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                        }`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: task.subjectColor }}
                            />
                            <span className="text-xs text-muted-foreground">{task.subject}</span>
                          </div>
                          <div className={`flex items-center gap-1 text-xs ${
                            isOverdue(task.dueDate) && task.status !== 'completed'
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {task.estimatedMinutes}m
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={priorityConfig[task.priority].color}>
                          {task.priority === 'high' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {priorityConfig[task.priority].label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
