// Client-safe gamification definitions shared by UI and API.
export const BADGES = {
  // Study Time Badges
  FIRST_HOUR: {
    id: 'first_hour',
    name: 'First Hour',
    description: 'Complete your first hour of study',
    icon: 'Clock',
    requirement: { type: 'total_minutes', value: 60 },
  },
  DEDICATED_LEARNER: {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Study for 10 hours total',
    icon: 'BookOpen',
    requirement: { type: 'total_minutes', value: 600 },
  },
  STUDY_MARATHON: {
    id: 'study_marathon',
    name: 'Study Marathon',
    description: 'Study for 50 hours total',
    icon: 'Trophy',
    requirement: { type: 'total_minutes', value: 3000 },
  },
  CENTURY: {
    id: 'century',
    name: 'Century',
    description: 'Study for 100 hours total',
    icon: 'Award',
    requirement: { type: 'total_minutes', value: 6000 },
  },

  // Streak Badges
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: 'Flame',
    requirement: { type: 'streak', value: 7 },
  },
  MONTH_MASTER: {
    id: 'month_master',
    name: 'Month Master',
    description: 'Maintain a 30-day study streak',
    icon: 'Star',
    requirement: { type: 'streak', value: 30 },
  },
  UNSTOPPABLE: {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day study streak',
    icon: 'Zap',
    requirement: { type: 'streak', value: 100 },
  },

  // Focus Badges
  LASER_FOCUS: {
    id: 'laser_focus',
    name: 'Laser Focus',
    description: 'Achieve 90%+ focus in a session',
    icon: 'Target',
    requirement: { type: 'focus_score', value: 90 },
  },
  FOCUS_MASTER: {
    id: 'focus_master',
    name: 'Focus Master',
    description: 'Average 85%+ focus over 10 sessions',
    icon: 'Eye',
    requirement: { type: 'avg_focus', value: 85, sessions: 10 },
  },

  // Session Badges
  FIRST_SESSION: {
    id: 'first_session',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: 'Play',
    requirement: { type: 'total_sessions', value: 1 },
  },
  SESSION_10: {
    id: 'session_10',
    name: 'Getting Serious',
    description: 'Complete 10 study sessions',
    icon: 'Calendar',
    requirement: { type: 'total_sessions', value: 10 },
  },
  SESSION_50: {
    id: 'session_50',
    name: 'Habitual Learner',
    description: 'Complete 50 study sessions',
    icon: 'Repeat',
    requirement: { type: 'total_sessions', value: 50 },
  },
  SESSION_100: {
    id: 'session_100',
    name: 'Study Veteran',
    description: 'Complete 100 study sessions',
    icon: 'Medal',
    requirement: { type: 'total_sessions', value: 100 },
  },

  // Point Badges
  POINTS_1000: {
    id: 'points_1000',
    name: 'Point Collector',
    description: 'Earn 1,000 points',
    icon: 'Coins',
    requirement: { type: 'total_points', value: 1000 },
  },
  POINTS_5000: {
    id: 'points_5000',
    name: 'Point Hoarder',
    description: 'Earn 5,000 points',
    icon: 'Gem',
    requirement: { type: 'total_points', value: 5000 },
  },
  POINTS_10000: {
    id: 'points_10000',
    name: 'Point Master',
    description: 'Earn 10,000 points',
    icon: 'Crown',
    requirement: { type: 'total_points', value: 10000 },
  },
} as const

export type BadgeId = keyof typeof BADGES

export const LEVELS = [
  { level: 1, name: 'Novice', minPoints: 0 },
  { level: 2, name: 'Apprentice', minPoints: 500 },
  { level: 3, name: 'Student', minPoints: 1500 },
  { level: 4, name: 'Scholar', minPoints: 3500 },
  { level: 5, name: 'Academic', minPoints: 7000 },
  { level: 6, name: 'Expert', minPoints: 12000 },
  { level: 7, name: 'Master', minPoints: 20000 },
  { level: 8, name: 'Grandmaster', minPoints: 35000 },
  { level: 9, name: 'Legend', minPoints: 55000 },
  { level: 10, name: 'Enlightened', minPoints: 80000 },
]

export function getLevelFromPoints(points: number): { level: number; name: string; progress: number; nextLevel: number | null } {
  let currentLevel = LEVELS[0]
  let nextLevel = LEVELS[1]

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      currentLevel = LEVELS[i]
      nextLevel = LEVELS[i + 1] || null
      break
    }
  }

  const progress = nextLevel
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    progress: Math.min(progress, 100),
    nextLevel: nextLevel?.minPoints || null,
  }
}