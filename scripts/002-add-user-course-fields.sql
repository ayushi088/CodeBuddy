-- Adds course metadata and timetable URL to existing users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS course_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS course_start_date DATE,
  ADD COLUMN IF NOT EXISTS course_end_date DATE,
  ADD COLUMN IF NOT EXISTS timetable_url TEXT;
