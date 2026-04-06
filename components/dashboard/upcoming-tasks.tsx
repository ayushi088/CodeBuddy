'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ListTodo, ArrowRight, Plus, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: number
  title: string
  subject: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
}

export function UpcomingTasks() {
  // Placeholder - will be replaced with real data from API
  const tasks: Task[] = []

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-destructive'
      case 'medium':
        return 'text-warning'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-accent" />
          Upcoming Tasks
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/planner?tab=tasks">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ListTodo className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No upcoming tasks</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add tasks to stay organized
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/planner?tab=tasks">
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <Checkbox
                  checked={task.completed}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{task.subject}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                  </div>
                </div>
                {task.priority === 'high' && (
                  <AlertCircle className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
