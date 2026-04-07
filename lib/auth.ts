import { cookies } from 'next/headers'
import { query, queryOne } from './db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export interface User {
  id: number
  email: string
  full_name: string
  avatar_url: string | null
  timezone: string
  course_name: string | null
  branch: string | null
  semester_year: string | null
  institution_name: string | null
  course_start_date: string | null
  course_end_date: string | null
  timetable_url: string | null
  study_preferences: {
    preferred_study_time: string
    preferred_subject_ids: number[]
    daily_study_goal_minutes: number
    difficulty_level: string
    break_preference: string
  } | null
  notification_preferences: {
    email_daily_summary: boolean
    email_alerts: boolean
    push_notifications: boolean
  }
  created_at: string
}

interface Session {
  id: number
  user_id: number
  token: string
  expires_at: string
}

export type TokenPayload = {
  userId: number
  email: string
  full_name: string
}

const SESSION_DURATION_DAYS = 30
const SALT_ROUNDS = 12

type LegacyUser = Omit<
  User,
  | 'course_name'
  | 'branch'
  | 'semester_year'
  | 'institution_name'
  | 'course_start_date'
  | 'course_end_date'
  | 'timetable_url'
  | 'study_preferences'
>

function isUndefinedColumnError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '42703'
  )
}

function withProfileDefaults(user: LegacyUser): User {
  return {
    ...user,
    course_name: null,
    branch: null,
    semester_year: null,
    institution_name: null,
    course_start_date: null,
    course_end_date: null,
    timetable_url: null,
    study_preferences: null,
  }
}

// Generate a secure random token
function generateToken(): string {
  return randomBytes(32).toString('hex')
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Create a new user
export async function createUser(
  email: string,
  password: string,
  fullName: string
): Promise<User | null> {
  try {
    const passwordHash = await hashPassword(password)
    let user: User | null = null

    try {
      user = await queryOne<User>(
        `INSERT INTO users (email, password_hash, full_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, full_name, avatar_url, timezone, course_name, branch, semester_year, institution_name, course_start_date, course_end_date, timetable_url, study_preferences, notification_preferences, created_at`,
        [email.toLowerCase(), passwordHash, fullName]
      )
    } catch (error) {
      if (!isUndefinedColumnError(error)) throw error

      const legacyUser = await queryOne<LegacyUser>(
        `INSERT INTO users (email, password_hash, full_name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, full_name, avatar_url, timezone, notification_preferences, created_at`,
        [email.toLowerCase(), passwordHash, fullName]
      )
      user = legacyUser ? withProfileDefaults(legacyUser) : null
    }
    
    if (user) {
      // Create streak and points records for new user
      await query(
        'INSERT INTO streaks (user_id) VALUES ($1)',
        [user.id]
      )
      await query(
        'INSERT INTO user_points (user_id) VALUES ($1)',
        [user.id]
      )
    }
    
    return user
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      // Unique constraint violation - email already exists
      return null
    }
    throw error
  }
}

// Authenticate user
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  let result: (User & { password_hash: string }) | null = null

  try {
    result = await queryOne<User & { password_hash: string }>(
      `SELECT id, email, full_name, avatar_url, timezone, course_name, branch, semester_year, institution_name, course_start_date, course_end_date, timetable_url, study_preferences, notification_preferences, created_at, password_hash 
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error

    const legacyResult = await queryOne<
      LegacyUser & {
        password_hash: string
      }
    >(
      `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at, password_hash 
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    )

    result = legacyResult
      ? {
          ...withProfileDefaults(legacyResult),
          password_hash: legacyResult.password_hash,
        }
      : null
  }
  
  if (!result) return null
  
  const isValid = await verifyPassword(password, result.password_hash)
  if (!isValid) return null
  
  // Don't return password hash
  const { password_hash: _, ...user } = result
  return user
}

// Create session
export async function createSession(userId: number): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
  
  await query(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()]
  )
  
  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
  
  return token
}

// Get current user from session
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value
    
    if (!token) return null
    
    const session = await queryOne<Session>(
      `SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    )
    
    if (!session) return null
    
    let user: User | null = null
    try {
      user = await queryOne<User>(
        `SELECT id, email, full_name, avatar_url, timezone, course_name, branch, semester_year, institution_name, course_start_date, course_end_date, timetable_url, study_preferences, notification_preferences, created_at 
         FROM users WHERE id = $1`,
        [session.user_id]
      )
    } catch (error) {
      if (!isUndefinedColumnError(error)) throw error

      const legacyUser = await queryOne<LegacyUser>(
        `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at 
         FROM users WHERE id = $1`,
        [session.user_id]
      )
      user = legacyUser ? withProfileDefaults(legacyUser) : null
    }
    
    return user
  } catch {
    return null
  }
}

// Logout - delete session
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session_token')?.value
  
  if (token) {
    await query('DELETE FROM sessions WHERE token = $1', [token])
  }
  
  cookieStore.delete('session_token')
}

// Validate session (for middleware/API routes)
export async function validateSession(token: string): Promise<User | null> {
  const session = await queryOne<Session>(
    `SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()`,
    [token]
  )
  
  if (!session) return null
  
  let user: User | null = null

  try {
    user = await queryOne<User>(
      `SELECT id, email, full_name, avatar_url, timezone, course_name, branch, semester_year, institution_name, course_start_date, course_end_date, timetable_url, study_preferences, notification_preferences, created_at 
       FROM users WHERE id = $1`,
      [session.user_id]
    )
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error

    const legacyUser = await queryOne<LegacyUser>(
      `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at 
       FROM users WHERE id = $1`,
      [session.user_id]
    )
    user = legacyUser ? withProfileDefaults(legacyUser) : null
  }
  
  return user
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  const user = await validateSession(token)
  if (!user) return null

  return {
    userId: user.id,
    email: user.email,
    full_name: user.full_name,
  }
}

// Update user profile
export async function updateUser(
  userId: number,
  updates: Partial<Pick<User, 'full_name' | 'avatar_url' | 'timezone' | 'course_name' | 'branch' | 'semester_year' | 'institution_name' | 'course_start_date' | 'course_end_date' | 'timetable_url' | 'study_preferences' | 'notification_preferences'>>
): Promise<User | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let paramIndex = 1
  
  if (updates.full_name !== undefined) {
    fields.push(`full_name = $${paramIndex++}`)
    values.push(updates.full_name)
  }
  if (updates.avatar_url !== undefined) {
    fields.push(`avatar_url = $${paramIndex++}`)
    values.push(updates.avatar_url)
  }
  if (updates.timezone !== undefined) {
    fields.push(`timezone = $${paramIndex++}`)
    values.push(updates.timezone)
  }
  if (updates.course_name !== undefined) {
    fields.push(`course_name = $${paramIndex++}`)
    values.push(updates.course_name)
  }
  if (updates.branch !== undefined) {
    fields.push(`branch = $${paramIndex++}`)
    values.push(updates.branch)
  }
  if (updates.semester_year !== undefined) {
    fields.push(`semester_year = $${paramIndex++}`)
    values.push(updates.semester_year)
  }
  if (updates.institution_name !== undefined) {
    fields.push(`institution_name = $${paramIndex++}`)
    values.push(updates.institution_name)
  }
  if (updates.course_start_date !== undefined) {
    fields.push(`course_start_date = $${paramIndex++}`)
    values.push(updates.course_start_date)
  }
  if (updates.course_end_date !== undefined) {
    fields.push(`course_end_date = $${paramIndex++}`)
    values.push(updates.course_end_date)
  }
  if (updates.timetable_url !== undefined) {
    fields.push(`timetable_url = $${paramIndex++}`)
    values.push(updates.timetable_url)
  }
  if (updates.study_preferences !== undefined) {
    fields.push(`study_preferences = $${paramIndex++}`)
    values.push(JSON.stringify(updates.study_preferences))
  }
  if (updates.notification_preferences !== undefined) {
    fields.push(`notification_preferences = $${paramIndex++}`)
    values.push(JSON.stringify(updates.notification_preferences))
  }
  
  if (fields.length === 0) return null
  
  fields.push(`updated_at = NOW()`)
  values.push(userId)
  
  let user: User | null = null

  try {
    user = await queryOne<User>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, email, full_name, avatar_url, timezone, course_name, branch, semester_year, institution_name, course_start_date, course_end_date, timetable_url, study_preferences, notification_preferences, created_at`,
      values
    )
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error

    // Retry without new profile extension fields for legacy databases.
    const legacyUpdates = {
      full_name: updates.full_name,
      avatar_url: updates.avatar_url,
      timezone: updates.timezone,
      notification_preferences: updates.notification_preferences,
    }

    const legacyFields: string[] = []
    const legacyValues: unknown[] = []
    let legacyParamIndex = 1

    if (legacyUpdates.full_name !== undefined) {
      legacyFields.push(`full_name = $${legacyParamIndex++}`)
      legacyValues.push(legacyUpdates.full_name)
    }
    if (legacyUpdates.avatar_url !== undefined) {
      legacyFields.push(`avatar_url = $${legacyParamIndex++}`)
      legacyValues.push(legacyUpdates.avatar_url)
    }
    if (legacyUpdates.timezone !== undefined) {
      legacyFields.push(`timezone = $${legacyParamIndex++}`)
      legacyValues.push(legacyUpdates.timezone)
    }
    if (legacyUpdates.notification_preferences !== undefined) {
      legacyFields.push(`notification_preferences = $${legacyParamIndex++}`)
      legacyValues.push(JSON.stringify(legacyUpdates.notification_preferences))
    }

    if (legacyFields.length === 0) return null

    legacyFields.push('updated_at = NOW()')
    legacyValues.push(userId)

    const legacyUser = await queryOne<LegacyUser>(
      `UPDATE users SET ${legacyFields.join(', ')} WHERE id = $${legacyParamIndex}
       RETURNING id, email, full_name, avatar_url, timezone, notification_preferences, created_at`,
      legacyValues
    )

    user = legacyUser ? withProfileDefaults(legacyUser) : null
  }
  
  return user
}

// Change password
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const result = await queryOne<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  )
  
  if (!result) return false
  
  const isValid = await verifyPassword(currentPassword, result.password_hash)
  if (!isValid) return false
  
  const newHash = await hashPassword(newPassword)
  await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [newHash, userId]
  )
  
  return true
}
