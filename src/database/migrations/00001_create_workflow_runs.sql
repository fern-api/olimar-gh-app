-- +goose Up
-- Create workflow_runs table
-- This table stores GitHub Actions workflow run metadata for tracking and monitoring

CREATE TABLE IF NOT EXISTS workflow_runs (
    id SERIAL PRIMARY KEY,
    workflow_id BIGINT NOT NULL,
    workflow_url TEXT NOT NULL,
    org TEXT NOT NULL,
    repo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for common queries
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_org_repo ON workflow_runs(org, repo);
CREATE INDEX idx_workflow_runs_created_at ON workflow_runs(created_at DESC);

-- Create updated_at trigger function
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
-- +goose StatementEnd

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_workflow_runs_updated_at
    BEFORE UPDATE ON workflow_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
-- Drop trigger and function first, then table
DROP TRIGGER IF EXISTS update_workflow_runs_updated_at ON workflow_runs;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS workflow_runs;
