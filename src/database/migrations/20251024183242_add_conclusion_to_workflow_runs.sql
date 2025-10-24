-- +goose Up
-- Add conclusion enum and field to workflow_runs table
-- GitHub workflow conclusions: success, failure, cancelled, skipped, timed_out, action_required, neutral, stale

-- Create enum type for workflow run conclusion
CREATE TYPE workflow_run_conclusion AS ENUM (
    'success',
    'failure',
    'cancelled',
    'skipped',
    'timed_out',
    'action_required',
    'neutral',
    'stale'
);

-- Add conclusion column to workflow_runs table (nullable because in-progress workflows don't have a conclusion yet)
ALTER TABLE workflow_runs
ADD COLUMN conclusion workflow_run_conclusion;

-- Create index on conclusion for filtering queries
CREATE INDEX idx_workflow_runs_conclusion ON workflow_runs(conclusion);

-- +goose Down
-- Remove conclusion column and enum type

-- Drop the index first
DROP INDEX IF EXISTS idx_workflow_runs_conclusion;

-- Drop the conclusion column
ALTER TABLE workflow_runs DROP COLUMN IF EXISTS conclusion;

-- Drop the enum type
DROP TYPE IF EXISTS workflow_run_conclusion;
