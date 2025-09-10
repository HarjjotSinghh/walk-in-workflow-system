-- filepath: /Users/harjjotsinghh/Desktop/Main/D Drive/Projects/wiws/apps/api/migrations/0000_organic_bromley.sql
-- Purpose: DROP all existing tables and recreate schema from scratch (based on 0001_initial_schema.sql + 0002_better_auth_tables.sql)
-- Target DB: Cloudflare D1 (SQLite3)
PRAGMA foreign_keys = OFF;
-- BEGIN TRANSACTION;

-- Drop dependent objects first (safe with IF EXISTS)
DROP INDEX IF EXISTS session_token_unique;
DROP INDEX IF EXISTS user_email_unique;
DROP INDEX IF EXISTS users_email_unique;
DROP INDEX IF EXISTS idx_session_user_id;
DROP INDEX IF EXISTS idx_session_token;
DROP INDEX IF EXISTS idx_account_user_id;
DROP INDEX IF EXISTS idx_account_provider;
DROP INDEX IF EXISTS idx_verification_identifier;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_visits_status;
DROP INDEX IF EXISTS idx_visits_created_at;
DROP INDEX IF EXISTS idx_visits_token;
DROP INDEX IF EXISTS idx_visits_service_id;
DROP INDEX IF EXISTS idx_visits_assigned_consultant;
DROP INDEX IF EXISTS idx_audit_entity;
DROP INDEX IF EXISTS idx_audit_created_at;
DROP INDEX IF EXISTS idx_services_active;

DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS visits;
DROP TABLE IF EXISTS audit;
DROP TABLE IF EXISTS token_counter;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS user;
DROP TABLE IF EXISTS users;

-- Recreate core schema (users + app tables)
CREATE TABLE users (
	id TEXT PRIMARY KEY NOT NULL,
	email TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('reception', 'pa', 'consultant', 'admin')),
	password TEXT,
	email_verified INTEGER DEFAULT 0,
	image TEXT,
	is_active INTEGER DEFAULT 1,
	is_anonymous INTEGER DEFAULT 0,
	created_at TEXT DEFAULT (datetime('now','utc')),
	updated_at TEXT DEFAULT (datetime('now','utc'))
);

CREATE TABLE user (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	email_verified INTEGER DEFAULT 0 NOT NULL,
	image TEXT,
	role TEXT DEFAULT 'consultant',
	password TEXT,
	is_active INTEGER DEFAULT 1 NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	is_anonymous INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE UNIQUE INDEX user_email_unique ON user(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE services (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	name TEXT NOT NULL,
	description TEXT,
	est_minutes INTEGER DEFAULT 15 NOT NULL,
	is_active INTEGER DEFAULT 1 NOT NULL,
	created_at TEXT DEFAULT (datetime('now','utc')),
	updated_at TEXT DEFAULT (datetime('now','utc'))
);
CREATE INDEX idx_services_active ON services(is_active);

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
	FOREIGN KEY (assigned_consultant_id) REFERENCES users(id),
	FOREIGN KEY (pa_id) REFERENCES users(id),
	FOREIGN KEY (reception_id) REFERENCES users(id)
);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_token ON visits(token);
CREATE INDEX idx_visits_service_id ON visits(service_id);
CREATE INDEX idx_visits_assigned_consultant ON visits(assigned_consultant_id);

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
	FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_audit_entity ON audit(entity, entity_id);
CREATE INDEX idx_audit_created_at ON audit(created_at);

CREATE TABLE token_counter (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	date TEXT NOT NULL,
	counter INTEGER DEFAULT 0,
	updated_at TEXT DEFAULT (datetime('now','utc'))
);

-- Better Auth tables (session/account/verification)
CREATE TABLE session (
	id TEXT PRIMARY KEY NOT NULL,
	expires_at INTEGER NOT NULL,
	token TEXT NOT NULL UNIQUE,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	ip_address TEXT,
	user_agent TEXT,
	user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	timezone TEXT,
	city TEXT,
	country TEXT,
	region TEXT,
	region_code TEXT,
	colo TEXT,
	latitude TEXT,
	longitude TEXT
);
CREATE UNIQUE INDEX session_token_unique ON session(token);
CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_token ON session(token);

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
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE INDEX idx_account_provider ON account(provider_id, account_id);

CREATE TABLE verification (
	id TEXT PRIMARY KEY NOT NULL,
	identifier TEXT NOT NULL,
	value TEXT NOT NULL,
	expires_at INTEGER NOT NULL,
	created_at INTEGER,
	updated_at INTEGER
);
CREATE INDEX idx_verification_identifier ON verification(identifier);

-- Seed initial data (services, token_counter, default users from migrations)
INSERT INTO services (name, description, est_minutes, is_active) VALUES
('ITR Filing', 'Income Tax Return filing and consultation', 30, 1),
('GST Registration', 'Goods and Services Tax registration and setup', 45, 1),
('GST Return Filing', 'Monthly/Quarterly GST return filing', 20, 1),
('Business Registration', 'Company incorporation and business setup', 60, 1),
('Trademark Services', 'Trademark registration and intellectual property', 40, 1),
('Audit Services', 'Financial audit and compliance services', 90, 1),
('Tax Planning', 'Strategic tax planning and advisory', 45, 1),
('Compliance Services', 'Regulatory compliance and documentation', 30, 1),
('Bookkeeping', 'Accounting and bookkeeping services', 25, 1),
('General Consultation', 'General business and tax consultation', 15, 1);

INSERT OR REPLACE INTO token_counter (id, date, counter) VALUES (1, date('now'), 0);

-- Default admin + test user (password hashes copied from previous migration; change in production)
INSERT OR REPLACE INTO user (id, email, name, role, password, is_active, created_at, updated_at, email_verified) VALUES
('admin-001', 'admin@wiws.com', 'System Administrator', 'admin', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now','utc'), datetime('now','utc'), 1),
('reception-001', 'reception@wiws.com', 'Reception Desk', 'reception', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now','utc'), datetime('now','utc'), 1),
('pa-001', 'pa@wiws.com', 'Personal Assistant', 'pa', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now','utc'), datetime('now','utc'), 1),
('consultant-001', 'consultant@wiws.com', 'Senior Consultant', 'consultant', '$2a$10$rOCVZnytEf3dVTlVCPjqNu8Tr1YbXtlDUUFPZzHyJ2hBHvE42xQJe', 1, datetime('now','utc'), datetime('now','utc'), 1);

-- COMMIT;
PRAGMA foreign_keys = ON;
