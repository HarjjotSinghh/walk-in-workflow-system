-- Migration: 0002_better_auth_tables.sql
-- Description: Add Better Auth tables for authentication system
-- Created: 2024-01-02

-- Better Auth session table
CREATE TABLE session (
    id TEXT PRIMARY KEY NOT NULL,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Better Auth account table for OAuth providers (if needed later)
CREATE TABLE account (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Better Auth verification table for email verification
CREATE TABLE verification (
    id TEXT PRIMARY KEY NOT NULL,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    updated_at INTEGER
);

-- Update users table to be compatible with Better Auth
-- Add password field and email verification
ALTER TABLE users ADD COLUMN password TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN image TEXT;

-- Create indexes for better performance
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_token ON session(token);
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_account_provider ON account(provider_id, account_id);
CREATE INDEX idx_verification_identifier ON verification(identifier);

-- Insert default admin user with password (password123)
-- The password hash is for 'password123' - change this in production
INSERT OR REPLACE INTO user (id, email, name, role, password, is_active, created_at, updated_at, email_verified) VALUES
('admin-001', 'admin@wiws.com', 'System Administrator', 'admin', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now', 'utc'), datetime('now', 'utc'), 1);

-- Insert test users for development
INSERT OR REPLACE INTO user (id, email, name, role, password, is_active, created_at, updated_at, email_verified) VALUES
('reception-001', 'reception@wiws.com', 'Reception Desk', 'reception', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now', 'utc'), datetime('now', 'utc'), 1),
('pa-001', 'pa@wiws.com', 'Personal Assistant', 'pa', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now', 'utc'), datetime('now', 'utc'), 1),
('consultant-001', 'consultant@wiws.com', 'Senior Consultant', 'consultant', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now', 'utc'), datetime('now', 'utc'), 1);