-- AI Study Buddy Database Schema
-- Run this script against your Render PostgreSQL database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',
  course_name VARCHAR(255),
  branch VARCHAR(255),
  semester_year VARCHAR(100),
  institution_name VARCHAR(255),
  course_start_date DATE,
  course_end_date DATE,
  timetable_url TEXT,
  study_preferences JSONB,
  notification_preferences JSONB DEFAULT '{"email_daily_summary": true, "email_alerts": true, "push_notifications": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table for auth
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  target_hours_per_week DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  planned_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  average_focus_score DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active', -- active, completed, paused, abandoned
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus metrics table (captured every few seconds during study)
CREATE TABLE IF NOT EXISTS focus_metrics (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES study_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  focus_score DECIMAL(5,2) NOT NULL,
  face_detected BOOLEAN DEFAULT true,
  eyes_open BOOLEAN DEFAULT true,
  looking_at_screen BOOLEAN DEFAULT true,
  emotion VARCHAR(50),
  distraction_detected BOOLEAN DEFAULT false,
  distraction_type VARCHAR(100)
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- low_focus, face_not_detected, eyes_closed, break_reminder
  message TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Scheduled study blocks (timetable)
CREATE TABLE IF NOT EXISTS scheduled_blocks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks/To-dos
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Gamification - Streaks
CREATE TABLE IF NOT EXISTS streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  total_study_days INTEGER DEFAULT 0
);

-- Gamification - Points & Badges
CREATE TABLE IF NOT EXISTS user_points (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  requirement_type VARCHAR(50), -- streak, hours, sessions, focus_score
  requirement_value INTEGER
);

CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Daily summaries (for email reports)
CREATE TABLE IF NOT EXISTS daily_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_study_minutes INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  average_focus_score DECIMAL(5,2) DEFAULT 0,
  subjects_studied JSONB DEFAULT '[]',
  alerts_count INTEGER DEFAULT 0,
  streak_day INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  scheduled_block_id INTEGER REFERENCES scheduled_blocks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'absent', -- present, absent, partial
  actual_minutes INTEGER DEFAULT 0,
  scheduled_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, scheduled_block_id, date)
);

-- Insert default badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('First Steps', 'Complete your first study session', 'trophy', 'sessions', 1),
  ('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak', 7),
  ('Month Master', 'Maintain a 30-day streak', 'crown', 'streak', 30),
  ('Focus Champion', 'Achieve 90%+ focus score in a session', 'target', 'focus_score', 90),
  ('Study Marathon', 'Study for 100 hours total', 'clock', 'hours', 100),
  ('Dedicated Learner', 'Complete 50 study sessions', 'book', 'sessions', 50),
  ('Unstoppable', 'Maintain a 100-day streak', 'star', 'streak', 100)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON study_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_focus_metrics_session_id ON focus_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_focus_metrics_timestamp ON focus_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, date);
