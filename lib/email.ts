/**
 * Email Service using Brevo (Sendinblue) API
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_API_URL = 'https://api.brevo.com/v3'
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@studybuddy.app'
const FROM_NAME = process.env.FROM_NAME || 'Study Buddy'

interface EmailOptions {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.warn('Brevo API key not configured, skipping email send')
    return false
  }

  try {
    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: FROM_NAME,
          email: FROM_EMAIL,
        },
        to: [
          {
            email: options.to,
            name: options.toName || options.to,
          },
        ],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Brevo API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

interface DailySummaryData {
  userName: string
  date: string
  totalStudyMinutes: number
  sessionsCompleted: number
  avgFocusScore: number
  currentStreak: number
  topSubject?: string
  pointsEarned: number
  newBadges: string[]
}

export async function sendDailySummary(email: string, data: DailySummaryData): Promise<boolean> {
  const hours = Math.floor(data.totalStudyMinutes / 60)
  const minutes = data.totalStudyMinutes % 60
  const studyTimeDisplay = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes} minutes`

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Daily Study Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Study Buddy</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Daily Study Summary</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #e5e5e5; font-size: 16px; margin: 0 0 24px 0;">
        Hi ${data.userName},
      </p>
      <p style="color: #a3a3a3; font-size: 14px; margin: 0 0 32px 0;">
        Here's your study summary for ${data.date}:
      </p>
      
      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;">
        <div style="background-color: #262626; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #3b82f6; font-size: 28px; font-weight: bold; margin: 0;">${studyTimeDisplay}</p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 8px 0 0 0;">Total Study Time</p>
        </div>
        <div style="background-color: #262626; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #06b6d4; font-size: 28px; font-weight: bold; margin: 0;">${data.sessionsCompleted}</p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 8px 0 0 0;">Sessions Completed</p>
        </div>
        <div style="background-color: #262626; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #22c55e; font-size: 28px; font-weight: bold; margin: 0;">${Math.round(data.avgFocusScore)}%</p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 8px 0 0 0;">Avg Focus Score</p>
        </div>
        <div style="background-color: #262626; border-radius: 8px; padding: 20px; text-align: center;">
          <p style="color: #f59e0b; font-size: 28px; font-weight: bold; margin: 0;">${data.currentStreak} days</p>
          <p style="color: #a3a3a3; font-size: 12px; margin: 8px 0 0 0;">Current Streak</p>
        </div>
      </div>
      
      <!-- Points -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #134e4a 100%); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <p style="color: #fbbf24; font-size: 14px; margin: 0;">Points Earned Today</p>
        <p style="color: white; font-size: 36px; font-weight: bold; margin: 8px 0 0 0;">+${data.pointsEarned}</p>
      </div>
      
      ${data.newBadges.length > 0 ? `
      <!-- New Badges -->
      <div style="background-color: #262626; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="color: #e5e5e5; font-size: 14px; font-weight: bold; margin: 0 0 12px 0;">New Badges Unlocked!</p>
        ${data.newBadges.map(badge => `
          <span style="display: inline-block; background-color: #3b82f6; color: white; padding: 6px 12px; border-radius: 16px; font-size: 12px; margin: 4px 4px 4px 0;">
            ${badge}
          </span>
        `).join('')}
      </div>
      ` : ''}
      
      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.APP_URL || 'https://studybuddy.app'}/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 14px;">
          View Full Report
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #0f0f0f; padding: 24px; text-align: center;">
      <p style="color: #525252; font-size: 12px; margin: 0;">
        Keep up the great work! Every study session brings you closer to your goals.
      </p>
      <p style="color: #404040; font-size: 11px; margin: 16px 0 0 0;">
        Study Buddy - Your AI-Powered Study Companion
      </p>
    </div>
  </div>
</body>
</html>
  `

  return sendEmail({
    to: email,
    subject: `Your Study Summary for ${data.date} - ${studyTimeDisplay} studied!`,
    htmlContent,
    textContent: `Hi ${data.userName}, here's your study summary for ${data.date}: Total Study Time: ${studyTimeDisplay}, Sessions: ${data.sessionsCompleted}, Focus Score: ${Math.round(data.avgFocusScore)}%, Streak: ${data.currentStreak} days, Points: +${data.pointsEarned}`,
  })
}

interface FocusAlertData {
  userName: string
  alertType: 'low_focus' | 'distraction' | 'break_reminder'
  message: string
  sessionDuration: string
  currentFocusScore: number
}

export async function sendFocusAlert(email: string, data: FocusAlertData): Promise<boolean> {
  const alertTitles = {
    low_focus: 'Low Focus Alert',
    distraction: 'Distraction Detected',
    break_reminder: 'Time for a Break!',
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${alertTitles[data.alertType]}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f0f0f;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; padding: 24px;">
    <h2 style="color: #f59e0b; margin: 0 0 16px 0;">${alertTitles[data.alertType]}</h2>
    <p style="color: #e5e5e5; margin: 0 0 16px 0;">${data.message}</p>
    <p style="color: #a3a3a3; font-size: 14px; margin: 0;">
      Session Duration: ${data.sessionDuration}<br>
      Current Focus: ${data.currentFocusScore}%
    </p>
  </div>
</body>
</html>
  `

  return sendEmail({
    to: email,
    subject: `Study Buddy: ${alertTitles[data.alertType]}`,
    htmlContent,
  })
}
