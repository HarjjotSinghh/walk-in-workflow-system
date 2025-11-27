-- Migration to fix account table foreign key to reference user table instead of users table
-- This is needed because Better Auth uses the 'user' table (singular), not 'users' (plural)

PRAGMA foreign_keys = OFF;

-- Drop the account table and recreate with correct foreign key
DROP TABLE IF EXISTS account;

CREATE TABLE account (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
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

-- Recreate indexes for account table
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_account_provider ON account(provider_id, account_id);

-- Also fix session table foreign key if needed
DROP TABLE IF EXISTS session;

CREATE TABLE session (
    id TEXT PRIMARY KEY NOT NULL,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    timezone TEXT,
    city TEXT,
    country TEXT,
    region TEXT,
    region_code TEXT,
    colo TEXT,
    latitude TEXT,
    longitude TEXT
);

-- Recreate indexes for session table
CREATE UNIQUE INDEX session_token_unique ON session(token);
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_token ON session(token);

PRAGMA foreign_keys = ON;

