-- Migration: Create migrations tracking table
-- Date: 2025-10-23
-- Description: Creates a table to track which migrations have been applied

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);

COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version/number (e.g., 001, 002)';
COMMENT ON COLUMN schema_migrations.name IS 'Migration name/description';
COMMENT ON COLUMN schema_migrations.applied_at IS 'When the migration was applied';
