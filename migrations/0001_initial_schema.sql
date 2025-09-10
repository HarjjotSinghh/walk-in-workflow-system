-- Migration: 0001_initial_schema.sql
-- Description: Create initial database schema for wiws walk-in workflow system
-- Created: 2025-24-08

-- Users table with role-based access control
CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('reception', 'pa', 'consultant', 'admin')),
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'utc')),
    updated_at TEXT DEFAULT (datetime('now', 'utc'))
);

-- Services catalog table
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    est_minutes INTEGER DEFAULT 15,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'utc')),
    updated_at TEXT DEFAULT (datetime('now', 'utc'))
);

-- Visit records with comprehensive status tracking
CREATE TABLE visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT DEFAULT (datetime('now', 'utc')),
    updated_at TEXT DEFAULT (datetime('now', 'utc')),
    
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (assigned_consultant_id) REFERENCES users(id),
    FOREIGN KEY (pa_id) REFERENCES users(id),
    FOREIGN KEY (reception_id) REFERENCES users(id)
);

-- Audit log table for tracking all changes
CREATE TABLE audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now', 'utc')),
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Token counter table for daily token generation
CREATE TABLE token_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date TEXT NOT NULL,
    counter INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now', 'utc'))
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_token ON visits(token);
CREATE INDEX idx_visits_service_id ON visits(service_id);
CREATE INDEX idx_visits_assigned_consultant ON visits(assigned_consultant_id);
CREATE INDEX idx_audit_entity ON audit(entity, entity_id);
CREATE INDEX idx_audit_created_at ON audit(created_at);
CREATE INDEX idx_services_active ON services(is_active);

-- Insert default services
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

-- Initialize token counter for current date
INSERT INTO token_counter (id, date, counter) VALUES (1, date('now'), 0);

-- Insert a default admin user (email should be updated in production)
INSERT INTO user (id, email, name, role, is_active) VALUES
('admin-001', 'admin@wiws.com', 'System Administrator', 'admin', 1);