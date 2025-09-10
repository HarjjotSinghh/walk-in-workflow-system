-- filepath: /Users/harjjotsinghh/Desktop/Main/D Drive/Projects/wiws/apps/api/migrations/0003_fix_foreign_keys.sql
-- Purpose: Fix foreign key constraints and remove duplicate tables
-- Target DB: Cloudflare D1 (SQLite3)

PRAGMA foreign_keys = OFF;

-- Drop the duplicate users table (keep only the user table)
DROP TABLE IF EXISTS users;

-- Drop existing session table to recreate with correct foreign key
DROP TABLE IF EXISTS session;

-- Recreate session table with correct foreign key to user.id
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

-- Update visits table foreign keys to point to user.id instead of users.id
-- First drop the foreign key constraints
PRAGMA foreign_keys = OFF;

-- Recreate visits table with correct foreign keys
DROP TABLE IF EXISTS visits;
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    token TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'approved', 'denied', 'in_session', 'completed', 'cancelled')
    ),
    assigned_consultant_id TEXT,
    pa_id TEXT,
    reception_id TEXT NOT NULL,
    notes TEXT,
    session_notes TEXT,
    wait_time_minutes INTEGER,
    session_start_time TEXT,
    session_end_time TEXT,
    created_at TEXT DEFAULT (datetime('now','utc')),
    updated_at TEXT DEFAULT (datetime('now','utc')),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (assigned_consultant_id) REFERENCES user(id),
    FOREIGN KEY (pa_id) REFERENCES user(id),
    FOREIGN KEY (reception_id) REFERENCES user(id)
);

-- Recreate indexes for visits table
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_token ON visits(token);
CREATE INDEX idx_visits_service_id ON visits(service_id);
CREATE INDEX idx_visits_assigned_consultant ON visits(assigned_consultant_id);

-- Update audit table foreign key to point to user.id
DROP TABLE IF EXISTS audit;
CREATE TABLE audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now','utc')),
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Recreate indexes for audit table
CREATE INDEX idx_audit_entity ON audit(entity, entity_id);
CREATE INDEX idx_audit_created_at ON audit(created_at);

-- Update account table foreign key to point to user.id
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

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;
