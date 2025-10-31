-- Database initialization script for Satisfactory Orchestrator
-- This script will be run when the PostgreSQL container starts for the first time

\echo 'Creating database schema and initial data...'

-- Create additional schemas if needed
CREATE SCHEMA IF NOT EXISTS satisfactory;

-- Set default schema
SET search_path TO satisfactory, public;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game server related tables are created by Hibernate/JPA
-- Node table, GameServer table, PortAllocation table will be auto-created

-- Create audit log table for server operations (no user FK since users are in auth-service)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255), -- Reference to auth-service user ID (not FK)
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

\echo 'Database initialization completed successfully!'
