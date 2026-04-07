-- Adds profile education and study preference columns to existing users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS branch VARCHAR(255),
  ADD COLUMN IF NOT EXISTS semester_year VARCHAR(100),
  ADD COLUMN IF NOT EXISTS institution_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS study_preferences JSONB;
