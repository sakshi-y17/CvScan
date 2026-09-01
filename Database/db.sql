-- Database initialization script for CvScan
CREATE DATABASE IF NOT EXISTS cvscan_db;
USE cvscan_db;

-- Table structure for resume scans
CREATE TABLE IF NOT EXISTS resume_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    share_slug VARCHAR(8) NOT NULL UNIQUE,
    target_role VARCHAR(255) NOT NULL,
    overall_score INT NOT NULL,
    raw_analysis TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster scorecard lookups via unique sharing slug
CREATE INDEX IF NOT EXISTS idx_resume_scans_share_slug ON resume_scans(share_slug);

-- Table structure for chat history
CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for retrieving chat history by user_id
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);