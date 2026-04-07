'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/components/theme-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  User,
  Bell,
  Shield,
  Mail,
  Clock,
  Save,
  Camera,
  FileText,
  Flame,
  Award,
  Brain,
  Target,
  Sun,
  Moon,
} from 'lucide-react'

type SubjectOption = {
  id: number
  name: string
}

type AchievementSummary = {
  studyStreak: number
  weeklyGoalsCompleted: number
  productivityBadges: number
  focusChampion: boolean
}

type ThemeMode = 'light' | 'dark'

export function ProfileContent() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingTimetable, setIsUploadingTimetable] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme === 'light' ? 'light' : 'dark')
  
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    timezone: user?.timezone || 'UTC',
    courseName: user?.course_name || '',
    branch: user?.branch || '',
    semesterYear: user?.semester_year || '',
    institutionName: user?.institution_name || '',
    courseStartDate: user?.course_start_date ? user.course_start_date.split('T')[0] : '',
    courseEndDate: user?.course_end_date ? user.course_end_date.split('T')[0] : '',
    timetableUrl: user?.timetable_url || '',
    preferredStudyTime: user?.study_preferences?.preferred_study_time || 'Evening',
    preferredSubjectIds: user?.study_preferences?.preferred_subject_ids || [],
    dailyStudyGoalMinutes: user?.study_preferences?.daily_study_goal_minutes || 120,
    difficultyLevel: user?.study_preferences?.difficulty_level || 'Intermediate',
    breakPreference: user?.study_preferences?.break_preference || 'Pomodoro (25/5)',
  })
  
  const [notifications, setNotifications] = useState({
    emailDailySummary: user?.notification_preferences?.email_daily_summary ?? true,
    emailAlerts: user?.notification_preferences?.email_alerts ?? true,
    pushNotifications: user?.notification_preferences?.push_notifications ?? true,
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [achievements, setAchievements] = useState<AchievementSummary>({
    studyStreak: 0,
    weeklyGoalsCompleted: 0,
    productivityBadges: 0,
    focusChampion: false,
  })
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  useEffect(() => {
    const loadProfileInsights = async () => {
      try {
        const res = await fetch('/api/profile/insights')
        if (!res.ok) return

        const data = await res.json()
        setSubjects(Array.isArray(data.subjects) ? data.subjects : [])
        setAchievements(data.achievements || {
          studyStreak: 0,
          weeklyGoalsCompleted: 0,
          productivityBadges: 0,
          focusChampion: false,
        })
        setAiSuggestions(Array.isArray(data.aiSuggestions) ? data.aiSuggestions : [])
      } catch {
        setSubjects([])
      }
    }

    void loadProfileInsights()
  }, [])

  useEffect(() => {
    if (theme) {
      setThemeMode(theme)
    }
  }, [theme])

  const computedSuggestions = useMemo(() => {
    if (aiSuggestions.length > 0) return aiSuggestions

    const fallback: string[] = []
    if (achievements.studyStreak < 3) {
      fallback.push('Start with two short focus sessions today to build your streak.')
    }
    if (!achievements.focusChampion) {
      fallback.push('Reduce multitasking and try timed sessions to improve focus quality.')
    }
    if (fallback.length === 0) {
      fallback.push('Great consistency. Increase your study goal by 15 minutes this week.')
    }
    return fallback
  }, [aiSuggestions, achievements])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileData.fullName,
          timezone: profileData.timezone,
          course_name: profileData.courseName || null,
          branch: profileData.branch || null,
          semester_year: profileData.semesterYear || null,
          institution_name: profileData.institutionName || null,
          course_start_date: profileData.courseStartDate || null,
          course_end_date: profileData.courseEndDate || null,
          timetable_url: profileData.timetableUrl || null,
          study_preferences: {
            preferred_study_time: profileData.preferredStudyTime,
            preferred_subject_ids: profileData.preferredSubjectIds,
            daily_study_goal_minutes: profileData.dailyStudyGoalMinutes,
            difficulty_level: profileData.difficultyLevel,
            break_preference: profileData.breakPreference,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      await refreshUser()
      alert('Profile updated successfully')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePreferredSubject = (subjectId: number, checked: boolean) => {
    setProfileData((prev) => {
      const exists = prev.preferredSubjectIds.includes(subjectId)
      if (checked && !exists) {
        return { ...prev, preferredSubjectIds: [...prev.preferredSubjectIds, subjectId] }
      }
      if (!checked && exists) {
        return {
          ...prev,
          preferredSubjectIds: prev.preferredSubjectIds.filter((id) => id !== subjectId),
        }
      }
      return prev
    })
  }

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_preferences: {
            email_daily_summary: notifications.emailDailySummary,
            email_alerts: notifications.emailAlerts,
            push_notifications: notifications.pushNotifications,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update notifications')
      }

      await refreshUser()
      alert('Notification preferences updated')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update notifications')
    } finally {
      setIsSaving(false)
    }
  }

  const handleThemeChange = async (nextTheme: ThemeMode) => {
    setThemeMode(nextTheme)
    setTheme(nextTheme)

    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            theme: nextTheme,
          },
        }),
      })
    } catch {
      // Theme still changes locally even if persistence fails.
    }
  }

  const handleThemeToggle = async () => {
    await handleThemeChange(themeMode === 'dark' ? 'light' : 'dark')
  }

  const handleUploadTimetable = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      alert('Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.')
      event.target.value = ''
      return
    }

    setIsUploadingTimetable(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'studybuddy/timetables')

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.secure_url) {
        throw new Error(uploadData.error?.message || 'Failed to upload timetable')
      }

      setProfileData(prev => ({ ...prev, timetableUrl: uploadData.secure_url }))
      alert('Timetable uploaded. Click Save Changes to persist it.')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload timetable')
    } finally {
      setIsUploadingTimetable(false)
      event.target.value = ''
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match')
      return
    }
    
    setIsSaving(true)
    try {
      // TODO: Call API to change password
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setIsSaving(false)
    }
  }

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleThemeToggle}
          className="gap-2 rounded-full border-border bg-card px-4 shadow-sm"
          aria-label={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{themeMode === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Change Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max 2MB.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Form Fields */}
              <div>
                <h3 className="text-sm font-semibold text-foreground">1. User Basic Information</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Name, email, profile photo, course, branch, semester/year, and institution details.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-input border-border opacity-50"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="branch">Course / Branch</Label>
                  <Input
                    id="branch"
                    placeholder="e.g., CSE"
                    value={profileData.branch}
                    onChange={(e) => setProfileData(prev => ({ ...prev, branch: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="semesterYear">Semester / Year</Label>
                  <Input
                    id="semesterYear"
                    placeholder="e.g., Semester 4"
                    value={profileData.semesterYear}
                    onChange={(e) => setProfileData(prev => ({ ...prev, semesterYear: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="institutionName">Institution Name</Label>
                  <Input
                    id="institutionName"
                    placeholder="College / University"
                    value={profileData.institutionName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, institutionName: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="courseName">Course</Label>
                  <Input
                    id="courseName"
                    placeholder="Enter your course"
                    value={profileData.courseName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, courseName: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="courseStartDate">Course Start Date</Label>
                  <Input
                    id="courseStartDate"
                    type="date"
                    value={profileData.courseStartDate}
                    onChange={(e) => setProfileData(prev => ({ ...prev, courseStartDate: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="courseEndDate">Course End Date</Label>
                  <Input
                    id="courseEndDate"
                    type="date"
                    value={profileData.courseEndDate}
                    onChange={(e) => setProfileData(prev => ({ ...prev, courseEndDate: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="timetableUpload">Timetable Upload (Cloudinary)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="timetableUpload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleUploadTimetable}
                      disabled={isUploadingTimetable}
                      className="bg-input border-border"
                    />
                    {isUploadingTimetable && <Spinner className="w-4 h-4" />}
                  </div>
                  {profileData.timetableUrl && (
                    <a
                      href={profileData.timetableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      View uploaded timetable
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={profileData.timezone}
                  onValueChange={(v) => setProfileData(prev => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground">2. Study Preferences</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Preferred study time, subjects, daily study goal, difficulty level, and break preference.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Preferred Study Time</Label>
                  <Select
                    value={profileData.preferredStudyTime}
                    onValueChange={(v) => setProfileData((prev) => ({ ...prev, preferredStudyTime: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning">Morning</SelectItem>
                      <SelectItem value="Afternoon">Afternoon</SelectItem>
                      <SelectItem value="Evening">Evening</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="dailyGoal">Daily Study Goal (minutes)</Label>
                  <Input
                    id="dailyGoal"
                    type="number"
                    min={15}
                    max={720}
                    value={profileData.dailyStudyGoalMinutes}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value || '120', 10)
                      setProfileData((prev) => ({
                        ...prev,
                        dailyStudyGoalMinutes: Number.isFinite(parsed) ? parsed : 120,
                      }))
                    }}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={profileData.difficultyLevel}
                    onValueChange={(v) => setProfileData((prev) => ({ ...prev, difficultyLevel: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Break Preference</Label>
                  <Select
                    value={profileData.breakPreference}
                    onValueChange={(v) => setProfileData((prev) => ({ ...prev, breakPreference: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pomodoro (25/5)">Pomodoro (25/5)</SelectItem>
                      <SelectItem value="Deep Work (50/10)">Deep Work (50/10)</SelectItem>
                      <SelectItem value="Sprint (90/20)">Sprint (90/20)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Subjects</Label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No subjects found. Add subjects from Planner to personalize recommendations.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border border-border p-3">
                    {subjects.map((subject) => (
                      <label key={subject.id} className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={profileData.preferredSubjectIds.includes(subject.id)}
                          onCheckedChange={(checked) => togglePreferredSubject(subject.id, checked === true)}
                        />
                        {subject.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-warning" />
                3. Achievements / Badges
              </CardTitle>
              <CardDescription>
                Study streak, weekly goals completed, productivity badges, and focus champion status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Flame className="w-4 h-4 text-warning" />
                    Study streak
                  </div>
                  <p className="text-2xl font-bold text-foreground">{achievements.studyStreak}</p>
                  <p className="text-xs text-muted-foreground">days</p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    Weekly goals completed
                  </div>
                  <p className="text-2xl font-bold text-foreground">{achievements.weeklyGoalsCompleted}/7</p>
                  <p className="text-xs text-muted-foreground">days met goal</p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Award className="w-4 h-4 text-success" />
                    Productivity badges
                  </div>
                  <p className="text-2xl font-bold text-foreground">{achievements.productivityBadges}</p>
                  <p className="text-xs text-muted-foreground">unlocked</p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Target className="w-4 h-4 text-accent" />
                    Focus champion
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {achievements.focusChampion ? 'Unlocked' : 'In progress'}
                  </p>
                  <p className="text-xs text-muted-foreground">average focus milestone</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                4. AI Suggestions
              </CardTitle>
              <CardDescription>
                Personalized improvements based on your study profile and recent activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {computedSuggestions.map((suggestion, index) => (
                  <div key={index} className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground">
                    {suggestion}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-warning" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Daily Summary Email</p>
                    <p className="text-xs text-muted-foreground">
                      Receive a daily email with your study progress
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailDailySummary}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, emailDailySummary: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Focus Alerts via Email</p>
                    <p className="text-xs text-muted-foreground">
                      Get email alerts when focus drops significantly
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailAlerts}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, emailAlerts: v }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Browser notifications during study sessions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, pushNotifications: v }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSaving} className="gap-2">
                  {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your password and account security
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 max-w-md">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword}
                  className="gap-2"
                >
                  {isSaving ? <Spinner className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
