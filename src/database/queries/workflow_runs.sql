-- name: CreateWorkflowRun :one
INSERT INTO workflow_runs (
    workflow_id,
    workflow_url,
    org,
    repo
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetWorkflowRun :one
SELECT * FROM workflow_runs
WHERE id = $1;

-- name: GetWorkflowRunByWorkflowId :one
SELECT * FROM workflow_runs
WHERE workflow_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: ListWorkflowRuns :many
SELECT * FROM workflow_runs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListWorkflowRunsByRepo :many
SELECT * FROM workflow_runs
WHERE org = $1 AND repo = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: ListWorkflowRunsByOrg :many
SELECT * FROM workflow_runs
WHERE org = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateWorkflowRun :one
UPDATE workflow_runs
SET
    workflow_url = COALESCE($2, workflow_url)
WHERE id = $1
RETURNING *;

-- name: UpdateWorkflowRunStatus :one
UPDATE workflow_runs
SET
    status = $2,
    conclusion = COALESCE(sqlc.narg(conclusion), conclusion)
WHERE workflow_id = $1
RETURNING *;

-- name: DeleteWorkflowRun :exec
DELETE FROM workflow_runs
WHERE id = $1;

-- name: DeleteWorkflowRunsByRepo :exec
DELETE FROM workflow_runs
WHERE org = $1 AND repo = $2;

-- name: CountWorkflowRuns :one
SELECT COUNT(*) FROM workflow_runs;

-- name: CountWorkflowRunsByRepo :one
SELECT COUNT(*) FROM workflow_runs
WHERE org = $1 AND repo = $2;

-- name: GetRecentWorkflowRuns :many
SELECT * FROM workflow_runs
WHERE created_at > $1
ORDER BY created_at DESC;

-- name: GetWorkflowRunsByDateRange :many
SELECT * FROM workflow_runs
WHERE created_at BETWEEN sqlc.arg(start_date) AND sqlc.arg(end_date)
ORDER BY created_at DESC;
