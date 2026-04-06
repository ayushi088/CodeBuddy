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

const SESSION_DURATION_DAYS = 30
const SALT_ROUNDS = 12

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
    const user = await queryOne<User>(
      `INSERT INTO users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name, avatar_url, timezone, notification_preferences, created_at`,
      [email.toLowerCase(), passwordHash, fullName]
    )
    
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
  const result = await queryOne<User & { password_hash: string }>(
    `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at, password_hash 
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  )
  
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
    
    const user = await queryOne<User>(
      `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at 
       FROM users WHERE id = $1`,
      [session.user_id]
    )
    
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
  
  const user = await queryOne<User>(
    `SELECT id, email, full_name, avatar_url, timezone, notification_preferences, created_at 
     FROM users WHERE id = $1`,
    [session.user_id]
  )
  
  return user
}

// Update user profile
export async function updateUser(
  userId: number,
  updates: Partial<Pick<User, 'full_name' | 'avatar_url' | 'timezone' | 'notification_preferences'>>
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
  if (updates.notification_preferences !== undefined) {
    fields.push(`notification_preferences = $${paramIndex++}`)
    values.push(JSON.stringify(updates.notification_preferences))
  }
  
  if (fields.length === 0) return null
  
  fields.push(`updated_at = NOW()`)
  values.push(userId)
  
  const user = await queryOne<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} 
     RETURNING id, email, full_name, avatar_url, timezone, notification_preferences, created_at`,
    values
  )
  
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
