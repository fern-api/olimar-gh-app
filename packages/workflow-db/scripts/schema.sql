-- Create workflow_runs table to track GitHub Actions workflow executions
CREATE TABLE IF NOT EXISTS workflow_runs (
  id SERIAL PRIMARY KEY,

  -- GitHub repository information
  github_org VARCHAR(255) NOT NULL,
  github_repo VARCHAR(255) NOT NULL,

  -- Workflow information
  workflow_name VARCHAR(255) NOT NULL,
  workflow_id BIGINT NOT NULL,
  run_id BIGINT,

  -- Commit information
  commit_sha VARCHAR(40) NOT NULL,
  commit_ref VARCHAR(255) NOT NULL,

  -- Workflow status and outcome
  status VARCHAR(50) NOT NULL,
  conclusion VARCHAR(50),

  -- Workflow inputs
  version_input VARCHAR(50),

  -- Timestamps
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT workflow_runs_status_check CHECK (status IN ('queued', 'in_progress', 'completed')),
  CONSTRAINT workflow_runs_conclusion_check CHECK (
    conclusion IS NULL OR
    conclusion IN ('success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required')
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_repo ON workflow_runs(github_org, github_repo);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_run_id ON workflow_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_triggered_at ON workflow_runs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_commit_sha ON workflow_runs(commit_sha);

-- Create a composite index for common queries by org/repo and time
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_repo_time ON workflow_runs(github_org, github_repo, triggered_at DESC);

COMMENT ON TABLE workflow_runs IS 'Tracks GitHub Actions workflow run executions';
COMMENT ON COLUMN workflow_runs.id IS 'Primary key';
COMMENT ON COLUMN workflow_runs.github_org IS 'GitHub organization or user name';
COMMENT ON COLUMN workflow_runs.github_repo IS 'GitHub repository name';
COMMENT ON COLUMN workflow_runs.workflow_name IS 'Name of the workflow';
COMMENT ON COLUMN workflow_runs.workflow_id IS 'GitHub workflow ID';
COMMENT ON COLUMN workflow_runs.run_id IS 'GitHub workflow run ID (may be null initially)';
COMMENT ON COLUMN workflow_runs.commit_sha IS 'Git commit SHA that triggered the workflow';
COMMENT ON COLUMN workflow_runs.commit_ref IS 'Git ref (branch/tag) that triggered the workflow';
COMMENT ON COLUMN workflow_runs.status IS 'Current status: queued, in_progress, or completed';
COMMENT ON COLUMN workflow_runs.conclusion IS 'Final conclusion when completed: success, failure, etc.';
COMMENT ON COLUMN workflow_runs.version_input IS 'Version input parameter passed to workflow_dispatch (if applicable)';
COMMENT ON COLUMN workflow_runs.triggered_at IS 'When the workflow was triggered';
COMMENT ON COLUMN workflow_runs.started_at IS 'When the workflow run actually started executing';
COMMENT ON COLUMN workflow_runs.completed_at IS 'When the workflow run finished';
COMMENT ON COLUMN workflow_runs.created_at IS 'When this record was created in our database';
COMMENT ON COLUMN workflow_runs.updated_at IS 'When this record was last updated';
