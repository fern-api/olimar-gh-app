-- Migration: Add version_input column to workflow_runs table
-- Date: 2025-10-23
-- Description: Adds version_input field to track the version parameter passed to workflow_dispatch

-- Add the version_input column
ALTER TABLE workflow_runs
ADD COLUMN IF NOT EXISTS version_input VARCHAR(50);

-- Add column comment
COMMENT ON COLUMN workflow_runs.version_input IS 'Version input parameter passed to workflow_dispatch (if applicable)';
