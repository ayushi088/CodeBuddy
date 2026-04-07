-- Migration: Add emotion tracking table
-- This table stores emotion data detected from webcam during study sessions

CREATE TABLE IF NOT EXISTS session_emotions (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    emotion VARCHAR(50) NOT NULL,
    confidence DECIMAL(3,2),
    emotions_json JSONB,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_emotions_session_id ON session_emotions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_emotions_detected_at ON session_emotions(detected_at);

-- Add emotion statistics table
CREATE TABLE IF NOT EXISTS emotion_statistics (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    average_emotion VARCHAR(50),
    emotion_distribution JSONB,
    average_confidence DECIMAL(3,2) DEFAULT 0.5,
    duration INTEGER DEFAULT 0,
    session_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emotion_stats_user_id ON emotion_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_emotion_stats_session_id ON emotion_statistics(session_id);
CREATE INDEX IF NOT EXISTS idx_emotion_stats_user_session_date ON emotion_statistics(user_id, session_date);
