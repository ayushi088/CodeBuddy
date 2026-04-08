/**
 * Gamification System - Points, Badges, Streaks, Levels
 */

import { query } from './db'
export { BADGES, LEVELS, getLevelFromPoints } from './gamification-shared'
export type { BadgeId } from './gamification-shared'

export interface UserStats {
  totalStudyMinutes: number
  totalSessions: number
  avgFocusScore: number
  currentStreak: number
  longestStreak: number
  totalPoints: number
}

export async function checkAndAwardBadges(userId: string, stats: UserStats): Promise<string[]> {
  const newBadges: string[] = []

  // Get existing badges
  const existingResult = await query(
    'SELECT badge_id FROM user_badges WHERE user_id = $1',
    [userId]
  )
  const existingBadges = new Set(existingResult.rows.map(r => r.badge_id))

  // Check each badge
  for (const [badgeId, badge] of Object.entries(BADGES)) {
    if (existingBadges.has(badgeId.toLowerCase())) continue

    let earned = false
    const req = badge.requirement

    switch (req.type) {
      case 'total_minutes':
        earned = stats.totalStudyMinutes >= req.value
        break
      case 'total_sessions':
        earned = stats.totalSessions >= req.value
        break
      case 'streak':
        earned = stats.currentStreak >= req.value || stats.longestStreak >= req.value
        break
      case 'focus_score':
        // This would need session-level data
        break
      case 'total_points':
        earned = stats.totalPoints >= req.value
        break
    }

    if (earned) {
      await awardBadge(userId, badgeId.toLowerCase())
      newBadges.push(badge.name)
    }
  }

  return newBadges
}

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  try {
    await query(
      `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)
       ON CONFLICT (user_id, badge_id) DO NOTHING`,
      [userId, badgeId]
    )
    return true
  } catch (error) {
    console.error('Award badge error:', error)
    return false
  }
}

export async function getUserBadges(userId: string): Promise<Array<{ badgeId: string; earnedAt: Date }>> {
  const result = await query(
    'SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC',
    [userId]
  )
  return result.rows.map(r => ({ badgeId: r.badge_id, earnedAt: r.earned_at }))
}

// Point calculation
export function calculateSessionPoints(
  durationMinutes: number,
  focusScore: number,
  streakBonus: number = 1
): number {
  const basePoints = durationMinutes * 2 // 2 points per minute
  const focusBonus = Math.floor(focusScore * 0.5) // 0.5 points per focus %
  const streakMultiplier = 1 + (streakBonus - 1) * 0.1 // 10% bonus per day of streak

  return Math.floor((basePoints + focusBonus) * streakMultiplier)
}
