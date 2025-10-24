-- +goose Up
-- Add status enum and status field to workflow_runs table
-- GitHub workflow run statuses: queued, in_progress, completed, waiting, requested, pending

-- Create enum type for workflow run status
CREATE TYPE workflow_run_status AS ENUM (
    'queued',
    'in_progress',
    'completed',
    'waiting',
    'requested',
    'pending'
);

-- Add status column to workflow_runs table
ALTER TABLE workflow_runs
ADD COLUMN status workflow_run_status NOT NULL DEFAULT 'queued';

-- Create index on status for filtering queries
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);

-- +goose Down
-- Remove status column and enum type

-- Drop the index first
DROP INDEX IF EXISTS idx_workflow_runs_status;

-- Drop the status column
ALTER TABLE workflow_runs DROP COLUMN IF EXISTS status;

-- Drop the enum type
DROP TYPE IF EXISTS workflow_run_status;
