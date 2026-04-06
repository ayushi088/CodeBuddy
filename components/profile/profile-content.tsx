'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  User,
  Bell,
  Shield,
  Palette,
  Mail,
  Clock,
  Save,
  Camera,
} from 'lucide-react'

export function ProfileContent() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  
  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    timezone: user?.timezone || 'UTC',
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
      // TODO: Call API to update profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refreshUser()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    try {
      // TODO: Call API to update notifications
      await new Promise(resolve => setTimeout(resolve, 1000))
      await refreshUser()
    } finally {
      setIsSaving(false)
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
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

        <TabsContent value="profile">
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

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2">
                  {isSaving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
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
