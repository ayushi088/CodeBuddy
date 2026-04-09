'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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
  HelpCircle,
  Target,
  Sun,
  Moon,
  CalendarClock,
  GraduationCap,
  Building2,
  School,
  Upload,
  Pencil,
  Check,
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
type InstitutionType = 'University' | 'School'
type EditMode = 'profile' | 'details'

const COURSE_OPTIONS = [
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.Com',
  'B.A',
  'BBA',
  'BCA',
  'B.Arch',
  'B.Des',
  'B.Pharm',
  'MBBS',
  'BDS',
  'BPT',
  'B.Ed',
  'LLB',
  'M.Tech',
  'M.E.',
  'M.Sc',
  'M.Com',
  'M.A',
  'MBA',
  'MCA',
  'M.Des',
  'M.Pharm',
  'MD/MS',
  'LLM',
  'Diploma',
  'Integrated Program',
]

const SEMESTER_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1))

const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024

export function ProfileContent() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingTimetable, setIsUploadingTimetable] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme === 'light' ? 'light' : 'dark')
  const [isProfileSubmitted, setIsProfileSubmitted] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(true)
  const [editMode, setEditMode] = useState<EditMode>('details')
  const [lastEditedAt, setLastEditedAt] = useState<string | null>(null)
  const [institutionType, setInstitutionType] = useState<InstitutionType>('University')

  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const timetableInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    avatarUrl: user?.avatar_url || '',
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

  useEffect(() => {
    if (!user) return

    const savedSettingsRaw = localStorage.getItem(`profile-settings-data-${user.id}`)
    let savedSettings: Partial<typeof profileData> | null = null
    if (savedSettingsRaw) {
      try {
        savedSettings = JSON.parse(savedSettingsRaw) as Partial<typeof profileData>
      } catch {
        savedSettings = null
      }
    }

    setProfileData((prev) => ({
      ...prev,
      fullName: user.full_name || savedSettings?.fullName || prev.fullName || '',
      email: user.email || prev.email || '',
      avatarUrl: user.avatar_url ?? savedSettings?.avatarUrl ?? prev.avatarUrl ?? '',
      timezone: user.timezone || savedSettings?.timezone || prev.timezone || 'UTC',
      courseName: user.course_name ?? savedSettings?.courseName ?? prev.courseName ?? '',
      branch: user.branch ?? savedSettings?.branch ?? prev.branch ?? '',
      semesterYear: user.semester_year ?? savedSettings?.semesterYear ?? prev.semesterYear ?? '',
      institutionName: user.institution_name ?? savedSettings?.institutionName ?? prev.institutionName ?? '',
      courseStartDate:
        (user.course_start_date ? user.course_start_date.split('T')[0] : null) ??
        savedSettings?.courseStartDate ??
        prev.courseStartDate ??
        '',
      courseEndDate:
        (user.course_end_date ? user.course_end_date.split('T')[0] : null) ??
        savedSettings?.courseEndDate ??
        prev.courseEndDate ??
        '',
      timetableUrl: user.timetable_url ?? savedSettings?.timetableUrl ?? prev.timetableUrl ?? '',
      preferredStudyTime:
        user.study_preferences?.preferred_study_time ??
        savedSettings?.preferredStudyTime ??
        prev.preferredStudyTime,
      preferredSubjectIds:
        user.study_preferences?.preferred_subject_ids ??
        savedSettings?.preferredSubjectIds ??
        prev.preferredSubjectIds,
      dailyStudyGoalMinutes:
        user.study_preferences?.daily_study_goal_minutes ??
        savedSettings?.dailyStudyGoalMinutes ??
        prev.dailyStudyGoalMinutes,
      difficultyLevel:
        user.study_preferences?.difficulty_level ??
        savedSettings?.difficultyLevel ??
        prev.difficultyLevel,
      breakPreference:
        user.study_preferences?.break_preference ??
        savedSettings?.breakPreference ??
        prev.breakPreference,
    }))
  }, [user])

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

  useEffect(() => {
    if (!user) return

    const draft = localStorage.getItem(`profile-settings-${user.id}`)
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as {
          institutionType?: InstitutionType
          isProfileSubmitted?: boolean
          lastEditedAt?: string | null
        }
        if (parsed.institutionType) setInstitutionType(parsed.institutionType)
        if (typeof parsed.isProfileSubmitted === 'boolean') setIsProfileSubmitted(parsed.isProfileSubmitted)
        if (parsed.lastEditedAt) {
          setLastEditedAt(parsed.lastEditedAt)
          setIsProfileSubmitted(true)
          setIsEditingProfile(false)
        }
      } catch {
        // Ignore malformed local profile draft.
      }
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    localStorage.setItem(
      `profile-settings-${user.id}`,
      JSON.stringify({ institutionType, isProfileSubmitted, lastEditedAt })
    )
  }, [institutionType, isProfileSubmitted, lastEditedAt, user])

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const achievementProgress = useMemo(() => {
    const streakProgress = Math.min(100, Math.round((achievements.studyStreak / 30) * 100))
    const badgesProgress = Math.min(100, Math.round((achievements.studyStreak / 400) * 100))

    return {
      streakProgress,
      badgesProgress,
    }
  }, [achievements])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const remainingDuration = useMemo(() => {
    if (!profileData.courseStartDate || !profileData.courseEndDate) return null

    const start = new Date(profileData.courseStartDate)
    const end = new Date(profileData.courseEndDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
    if (end < start) {
      return { valid: false, message: 'End date cannot be earlier than start date.' }
    }

    const now = new Date()
    const msLeft = end.getTime() - now.getTime()
    if (msLeft <= 0) {
      return { valid: false, message: 'The selected course end date has already passed.' }
    }

    const days = Math.floor(msLeft / (1000 * 60 * 60 * 24))
    const years = Math.floor(days / 365)
    const remDays = days % 365

    return {
      valid: true,
      message: `Remaining duration: ${years} year${years === 1 ? '' : 's'} ${remDays} day${remDays === 1 ? '' : 's'}.`,
    }
  }, [profileData.courseStartDate, profileData.courseEndDate])

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'Not available'
    const parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) return 'Not available'
    return parsed.toLocaleString()
  }

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    setIsCameraOpen(false)
    setIsCameraReady(false)
    setCameraError('')
  }

  const attachCameraStreamToVideo = async () => {
    const stream = cameraStreamRef.current
    const video = videoRef.current

    if (!stream || !video) return

    video.srcObject = stream
    video.onloadedmetadata = () => {
      void video.play().catch(() => {
        setCameraError('Unable to autoplay camera preview. Tap Take Picture again after allowing permissions.')
      })
    }

    video.oncanplay = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setIsCameraReady(true)
      }
    }

    try {
      await video.play()
    } catch {
      // onloadedmetadata/oncanplay handlers above will continue recovery.
    }
  }

  const startCameraStream = async () => {
    try {
      stopCameraStream()
      setCameraError('')

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      cameraStreamRef.current = stream
      setIsCameraOpen(true)
      setIsCameraReady(false)
      await attachCameraStreamToVideo()
    } catch (error) {
      setIsCameraOpen(false)
      setIsCameraReady(false)

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in browser settings.')
        return
      }

      setCameraError('Unable to access camera. Please allow camera permission and try again.')
    }
  }

  useEffect(() => {
    if (!isCameraOpen) return

    let isCancelled = false
    const readyTimeout = window.setTimeout(() => {
      if (!isCancelled && !isCameraReady) {
        setCameraError('Camera preview is taking too long. Check camera permission or close other camera apps.')
      }
    }, 5000)

    void attachCameraStreamToVideo()

    return () => {
      isCancelled = true
      window.clearTimeout(readyTimeout)
    }
  }, [isCameraOpen])

  const persistAvatar = async (avatarUrl: string) => {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update avatar')
    }

    setLastEditedAt(new Date().toISOString())
  }

  const uploadAvatarFile = async (file: File) => {
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert('Avatar must be 2MB or smaller.')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/profile/avatar-upload', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Failed to upload avatar')
      }

      setProfileData((prev) => ({ ...prev, avatarUrl: uploadData.url }))
      await persistAvatar(uploadData.url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleAvatarGallerySelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await uploadAvatarFile(file)
    event.target.value = ''
  }

  const handleCaptureAvatar = async () => {
    if (!videoRef.current || !canvasRef.current) return
    if (!isCameraReady) {
      setCameraError('Camera is initializing. Wait a moment and capture again.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setCameraError('Camera feed is not ready yet. Please wait for preview to appear.')
      return
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92)
    })

    if (!blob) {
      alert('Unable to capture image from camera.')
      return
    }

    const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await uploadAvatarFile(file)
    stopCameraStream()
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileData.fullName,
          avatar_url: profileData.avatarUrl || null,
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
      if (user) {
        localStorage.setItem(
          `profile-settings-data-${user.id}`,
          JSON.stringify({
            fullName: profileData.fullName,
            email: profileData.email,
            avatarUrl: profileData.avatarUrl,
            timezone: profileData.timezone,
            courseName: profileData.courseName,
            branch: profileData.branch,
            semesterYear: profileData.semesterYear,
            institutionName: profileData.institutionName,
            courseStartDate: profileData.courseStartDate,
            courseEndDate: profileData.courseEndDate,
            timetableUrl: profileData.timetableUrl,
            preferredStudyTime: profileData.preferredStudyTime,
            preferredSubjectIds: profileData.preferredSubjectIds,
            dailyStudyGoalMinutes: profileData.dailyStudyGoalMinutes,
            difficultyLevel: profileData.difficultyLevel,
            breakPreference: profileData.breakPreference,
          })
        )
      }
      const nowIso = new Date().toISOString()
      setLastEditedAt(nowIso)
      setIsProfileSubmitted(true)
      setIsEditingProfile(false)
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

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert('Timetable file must be 2MB or smaller.')
      event.target.value = ''
      return
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    setIsUploadingTimetable(true)
    try {
      let uploadedUrl = ''

      if (cloudName && uploadPreset) {
        const cloudinaryData = new FormData()
        cloudinaryData.append('file', file)
        cloudinaryData.append('upload_preset', uploadPreset)
        cloudinaryData.append('folder', 'studybuddy/timetables')

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: cloudinaryData,
        })

        const uploadData = await uploadRes.json()
        if (!uploadRes.ok || !uploadData.secure_url) {
          throw new Error(uploadData.error?.message || 'Failed to upload timetable')
        }

        uploadedUrl = uploadData.secure_url
      } else {
        const localUploadData = new FormData()
        localUploadData.append('file', file)

        const uploadRes = await fetch('/api/profile/timetable-upload', {
          method: 'POST',
          body: localUploadData,
        })

        const uploadData = await uploadRes.json()
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Failed to upload timetable')
        }

        uploadedUrl = uploadData.url
      }

      setProfileData(prev => ({ ...prev, timetableUrl: uploadedUrl }))
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

  const countryTimezones = [
    { label: 'India', value: 'Asia/Kolkata' },
    { label: 'United States (Eastern)', value: 'America/New_York' },
    { label: 'United States (Pacific)', value: 'America/Los_Angeles' },
    { label: 'United Kingdom', value: 'Europe/London' },
    { label: 'France', value: 'Europe/Paris' },
    { label: 'Germany', value: 'Europe/Berlin' },
    { label: 'United Arab Emirates', value: 'Asia/Dubai' },
    { label: 'Saudi Arabia', value: 'Asia/Riyadh' },
    { label: 'Singapore', value: 'Asia/Singapore' },
    { label: 'China', value: 'Asia/Shanghai' },
    { label: 'Japan', value: 'Asia/Tokyo' },
    { label: 'South Korea', value: 'Asia/Seoul' },
    { label: 'Australia', value: 'Australia/Sydney' },
    { label: 'Canada (Toronto)', value: 'America/Toronto' },
    { label: 'UTC (Global)', value: 'UTC' },
  ]

  const faqItems = [
    {
      id: 'why-chose',
      question: 'Why did we choose this website?',
      answer:
        'This platform was designed to keep study planning, sessions, focus tracking, and reports in one place, so students can avoid switching between multiple apps.',
    },
    {
      id: 'what-use',
      question: 'What is the use of this website?',
      answer:
        'It helps you manage your study timetable, start guided study sessions, monitor consistency, and review progress with data-backed insights and achievements.',
    },
    {
      id: 'how-use',
      question: 'How do I use this website?',
      answer:
        'Set up your profile details, add your course and timetable, start a study session from dashboard, and then track your focus, streaks, badges, and reports regularly.',
    },
    {
      id: 'is-helpful',
      question: 'Is this website helpful for students?',
      answer:
        'Yes. It is built for practical daily use: better planning, consistent sessions, clear progress visibility, and motivational tracking that supports better academic outcomes.',
    },
  ]

  const badgeMilestones = [
    { days: 50, name: 'Silver', medalClass: 'from-[#f6f7fa] via-[#c8cdd8] to-[#9ea5b2]' },
    { days: 100, name: 'Gold', medalClass: 'from-[#fbe9a8] via-[#f2c94c] to-[#c89d2d]' },
    { days: 200, name: 'Platinum', medalClass: 'from-[#eef6ff] via-[#b8c4d8] to-[#8d9ab0]' },
    { days: 300, name: 'Diamond', medalClass: 'from-[#e7f5ff] via-[#9ed6ff] to-[#5aa9df]' },
    { days: 400, name: 'Crown', medalClass: 'from-[#ffd7ef] via-[#ff8cc6] to-[#d45aa0]' },
  ]

  const unlockedBadgeCount = badgeMilestones.filter((item) => achievements.studyStreak >= item.days).length
  const nextBadge = badgeMilestones.find((item) => achievements.studyStreak < item.days)

  return (
    <div
      className="w-full p-6"
      style={{ fontFamily: 'Inter, Roboto, sans-serif' }}
    >
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
        <TabsList className="mb-6 rounded-xl border border-[#e8e6de] bg-[#fffdf7] p-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
          <Card className="overflow-hidden rounded-2xl border border-[#e8e6de] bg-[#fbfaf5] shadow-sm transition-all duration-300 hover:border-[#d8d4c8] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl text-[#1f2937] dark:text-slate-100">
                      <User className="h-5 w-5 text-[#274c77] dark:text-sky-300" />
                      Project Settings
                    </CardTitle>
                    <CardDescription>
                      Keep your profile, institution details, and timetable professionally organized.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode('profile')
                      setIsEditingProfile(true)
                    }}
                    className="gap-2 border-[#d7d2c5] bg-white text-[#25364d] transition-all duration-200 hover:border-[#c8b27c] hover:bg-[#fff8e1] dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="rounded-2xl border border-[#e5e1d6] bg-gradient-to-r from-[#fffef9] via-[#fbf8ef] to-[#f5f1e4] p-4 shadow-sm transition-all duration-200 hover:border-[#d8ceb6] dark:border-zinc-700 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-[#d5dce6] shadow-sm dark:border-sky-700">
                    <AvatarImage src={profileData.avatarUrl || undefined} />
                    <AvatarFallback className="bg-[#274c77] text-white">
                      {profileData.fullName ? getInitials(profileData.fullName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{profileData.fullName || 'Not provided'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{profileData.email || 'Not provided'}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Last edited on {formatDateTime(lastEditedAt)}</p>
              </div>

              {isEditingProfile ? (
                <>
                  {editMode === 'profile' && (
                  <div className="rounded-2xl border border-[#e5e1d6] bg-[#fffef9] p-5 shadow-sm transition-all duration-300 hover:border-[#d8ceb6] dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-2 border-[#d5dce6] shadow-sm dark:border-sky-700">
                          <AvatarImage src={profileData.avatarUrl || undefined} />
                          <AvatarFallback className="bg-[#274c77] text-xl font-semibold text-white">
                            {profileData.fullName ? getInitials(profileData.fullName) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Profile Avatar</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Upload a clear image. Max size 2MB.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatarGallerySelect}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          className="gap-2 border-[#d7d2c5] bg-white text-[#25364d] hover:border-[#c8b27c] hover:bg-[#fff8e1]"
                          onClick={() => void startCameraStream()}
                          disabled={isUploadingAvatar}
                        >
                          <Camera className="w-4 h-4" />
                          Take Picture
                        </Button>
                        <Button
                          variant="secondary"
                          className="gap-2 border border-[#e6c85a] bg-[#f6d74f] text-[#2d2a22] hover:bg-[#f3cf31]"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                        >
                          <Upload className="w-4 h-4" />
                          Choose from Gallery
                        </Button>
                        {isUploadingAvatar && <Spinner className="w-4 h-4 self-center" />}
                      </div>
                    </div>

                    {isCameraOpen && (
                      <div className="mt-4 rounded-lg border border-[#e4dfd2] bg-[#faf8ef] p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
                        <video ref={videoRef} className="w-full max-h-64 rounded-md object-cover" muted playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                        {!isCameraReady && !cameraError && (
                          <p className="mt-2 text-xs text-muted-foreground">Starting camera preview...</p>
                        )}
                        {cameraError && (
                          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                            {cameraError}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            className="gap-2 bg-[#274c77] text-white hover:bg-[#1f3a5a]"
                            onClick={() => void handleCaptureAvatar()}
                            disabled={isUploadingAvatar || !isCameraReady}
                          >
                            <Check className="w-4 h-4" />
                            Capture & Use
                          </Button>
                          <Button variant="outline" className="border-[#d7d2c5] bg-white hover:bg-[#f8f5ea]" onClick={stopCameraStream}>Cancel Camera</Button>
                        </div>
                      </div>
                    )}
                    {!isCameraOpen && cameraError && (
                      <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {cameraError}
                      </p>
                    )}

                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        className="border-[#d7d2c5] bg-white text-[#25364d] hover:border-[#c8b27c] hover:bg-[#fff8e1]"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                  )}

                  {editMode === 'details' && (
                    <>
                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="fullName">Name</Label>
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
                      <p className="text-xs text-muted-foreground">Email is read-only.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Course</Label>
                      <Select
                        value={profileData.courseName || undefined}
                        onValueChange={(value) => setProfileData((prev) => ({ ...prev, courseName: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Select your course" />
                        </SelectTrigger>
                        <SelectContent>
                          {COURSE_OPTIONS.map((course) => (
                            <SelectItem key={course} value={course}>{course}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Semester</Label>
                      <Select
                        value={profileData.semesterYear || undefined}
                        onValueChange={(value) => setProfileData((prev) => ({ ...prev, semesterYear: value }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {SEMESTER_OPTIONS.map((semester) => (
                            <SelectItem key={semester} value={semester}>Semester {semester}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e5e1d6] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#d8ceb6] dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-[#274c77] dark:text-sky-300" />
                      Institution
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Institution Type</Label>
                        <Select value={institutionType} onValueChange={(value: InstitutionType) => setInstitutionType(value)}>
                          <SelectTrigger className="w-full">
                            {institutionType === 'University' ? <Building2 className="w-4 h-4 mr-2 text-muted-foreground" /> : <School className="w-4 h-4 mr-2 text-muted-foreground" />}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="University">University</SelectItem>
                            <SelectItem value="School">School</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="institutionName">Institution Name</Label>
                        <Input
                          id="institutionName"
                          placeholder="Enter institution name"
                          value={profileData.institutionName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, institutionName: e.target.value }))}
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#dce7dd] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#9cc4a3] dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarClock className="h-4 w-4 text-[#2d6a4f] dark:text-emerald-300" />
                      Course Dates
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="courseStartDate">Start Date</Label>
                        <Input
                          id="courseStartDate"
                          type="date"
                          value={profileData.courseStartDate}
                          onChange={(e) => setProfileData(prev => ({ ...prev, courseStartDate: e.target.value }))}
                          className="bg-input border-border"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="courseEndDate">End Date</Label>
                        <Input
                          id="courseEndDate"
                          type="date"
                          value={profileData.courseEndDate}
                          onChange={(e) => setProfileData(prev => ({ ...prev, courseEndDate: e.target.value }))}
                          className="bg-input border-border"
                        />
                      </div>
                    </div>

                    {remainingDuration && (
                      <div className={`rounded-lg border px-3 py-2 text-sm ${remainingDuration.valid ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                        {remainingDuration.message}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#e5e1d6] bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#d8ceb6] dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <FileText className="h-4 w-4 text-[#274c77] dark:text-sky-300" />
                      Timetable Upload
                    </div>

                    <input
                      ref={timetableInputRef}
                      id="timetableUpload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleUploadTimetable}
                      disabled={isUploadingTimetable}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => timetableInputRef.current?.click()}
                        disabled={isUploadingTimetable}
                        className="gap-2 border-[#d7d2c5] bg-white text-[#25364d] hover:border-[#c8b27c] hover:bg-[#fff8e1]"
                      >
                        <Upload className="w-4 h-4" />
                        {profileData.timetableUrl ? 'Change Timetable' : 'Upload Timetable'}
                      </Button>
                      {isUploadingTimetable && <Spinner className="w-4 h-4" />}

                      {profileData.timetableUrl && (
                        <Button asChild variant="secondary" className="gap-2 border border-[#cdd7e5] bg-[#edf4fb] text-[#1f3b5f] hover:bg-[#ddeaf8]">
                          <a href={profileData.timetableUrl} target="_blank" rel="noreferrer">
                            <FileText className="w-4 h-4" />
                            Show Timetable
                          </a>
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Accepted: PDF or image files up to 2MB. Uploaded timetable remains saved until you replace it.</p>
                  </div>
                  </>
                  )}

                </>
              ) : (
                <div className="rounded-2xl border border-[#e5e1d6] bg-[#fffef9] p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/60">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">My Details</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-[#d7d2c5] bg-white text-[#25364d] hover:border-[#c8b27c] hover:bg-[#fff8e1]"
                      onClick={() => {
                        setEditMode('details')
                        setIsEditingProfile(true)
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-[#e8e4d8] bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Course</p>
                      <p className="mt-1 text-foreground">{profileData.courseName || 'Not provided'}</p>
                    </div>
                    <div className="rounded-md border border-[#e8e4d8] bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Semester</p>
                      <p className="mt-1 text-foreground">{profileData.semesterYear ? `Semester ${profileData.semesterYear}` : 'Not provided'}</p>
                    </div>
                    <div className="rounded-md border border-[#e8e4d8] bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Institution</p>
                      <p className="mt-1 text-foreground">{institutionType} - {profileData.institutionName || 'Not provided'}</p>
                    </div>
                    <div className="rounded-md border border-[#e8e4d8] bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Course Dates</p>
                      <p className="mt-1 text-foreground">{profileData.courseStartDate || 'N/A'} to {profileData.courseEndDate || 'N/A'}</p>
                    </div>
                  </div>

                  {remainingDuration?.valid && (
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {remainingDuration.message}
                    </div>
                  )}

                  <div className="rounded-md border border-[#e8e4d8] bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Timetable</p>
                    {profileData.timetableUrl ? (
                      <Button asChild variant="link" className="h-auto px-0 text-primary">
                        <a href={profileData.timetableUrl} target="_blank" rel="noreferrer">Show Timetable</a>
                      </Button>
                    ) : (
                      <p className="mt-1 text-foreground">Not uploaded</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Last edited on {formatDateTime(lastEditedAt)}
                  </p>

                </div>
              )}

              {isEditingProfile && editMode === 'details' && (
                <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="timezone">Timezone (Country Preference)</Label>
                <Select
                  value={profileData.timezone}
                  onValueChange={(v) => setProfileData(prev => ({ ...prev, timezone: v }))}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select country timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-foreground">2. Study Preferences</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Preferred study time, subjects, daily study goal, and difficulty level.
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

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
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
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2 bg-[#274c77] text-white hover:bg-[#1f3a5a]">
                  {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#e8e6de] bg-[#fbfaf5] shadow-sm transition-all duration-300 hover:border-[#d8d4c8] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-card-foreground">
                <Award className="h-5 w-5 text-[#274c77] dark:text-sky-300" />
                3. Achievements / Badges
              </CardTitle>
              <CardDescription>
                Study streak and collectible milestone badges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#e8e4d8] bg-gradient-to-b from-white to-[#f7f4ea] p-4 shadow-sm transition-all duration-300 hover:border-[#e7c66f] dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-800">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Study streak
                  </div>
                  <p className="text-3xl font-bold text-foreground">{achievements.studyStreak}</p>
                  <p className="text-xs text-muted-foreground">days completed</p>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-700">
                    <div className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: `${achievementProgress.streakProgress}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8e4d8] bg-gradient-to-b from-white to-[#edf7f0] p-4 shadow-sm transition-all duration-300 hover:border-[#90c6a0] dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Badge Rewards
                    </div>
                    <span className="text-xs text-muted-foreground">Collected: {unlockedBadgeCount}/{badgeMilestones.length}</span>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#e1ddcf] bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collected</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {badgeMilestones.map((item) => {
                        const unlocked = achievements.studyStreak >= item.days
                        const hoverMessage = unlocked
                          ? 'Already awarded'
                          : `After ${item.days} days you are rewarded by this badge.`

                        return (
                          <div key={`collected-${item.days}`} className="group relative flex flex-col items-center gap-1">
                            <div className="relative h-12 w-12">
                              <div
                                className={`absolute inset-0 rounded-full border shadow-sm transition-all duration-200 group-hover:scale-110 ${unlocked ? `bg-gradient-to-br ${item.medalClass} border-white/60` : `bg-gradient-to-br ${item.medalClass} border-white/40 opacity-45 saturate-50`}`}
                              />
                              <div
                                className={`absolute -bottom-3 left-3 h-4 w-2 rounded-sm rotate-6 ${unlocked ? 'bg-[#d7b27a]' : 'bg-[#c9b7a0] opacity-70'}`}
                              />
                              <div
                                className={`absolute -bottom-3 right-3 h-4 w-2 rounded-sm -rotate-6 ${unlocked ? 'bg-[#c48f6c]' : 'bg-[#b9a896] opacity-70'}`}
                              />
                              {unlocked && (
                                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">{item.days}d</span>

                            <div className="pointer-events-none absolute -top-10 z-10 hidden w-max max-w-[200px] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-md group-hover:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-200">
                              {hoverMessage}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {nextBadge
                        ? `${unlockedBadgeCount} collected. Next unlock at ${nextBadge.days} days.`
                        : 'All milestone badges unlocked.'}
                    </p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-700">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700" style={{ width: `${achievementProgress.badgesProgress}%` }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#e8e6de] bg-[#fbfaf5] shadow-sm transition-all duration-300 hover:border-[#d8d4c8] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground flex items-center gap-2 font-extrabold tracking-tight">
                <HelpCircle className="w-5 h-5 text-[#274c77]" />
                4. Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Tap any question to view a clear, practical answer about this project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-3">
                {faqItems.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className="rounded-xl border border-[#e1ddcf] bg-white px-4 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:border-[#c7b88d] hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <AccordionTrigger className="py-4 text-base font-bold text-[#1f2937] hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
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
