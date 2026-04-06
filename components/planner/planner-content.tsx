'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, ListTodo, BookOpen, Clock } from 'lucide-react'
import { WeeklyTimetable } from './weekly-timetable'
import { TasksList } from './tasks-list'
import { SubjectsManager } from './subjects-manager'

export function PlannerContent() {
  const [activeTab, setActiveTab] = useState('timetable')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planner</h1>
          <p className="text-muted-foreground mt-1">
            Organize your study schedule, tasks, and subjects
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted mb-6">
          <TabsTrigger value="timetable" className="gap-2">
            <Calendar className="w-4 h-4" />
            Timetable
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="w-4 h-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timetable">
          <WeeklyTimetable />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksList />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
