import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
    query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const createWorkflowRunQuery = `-- name: CreateWorkflowRun :one
INSERT INTO workflow_runs (
    workflow_id,
    workflow_url,
    org,
    repo
) VALUES (
    $1, $2, $3, $4
)
RETURNING id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion`;

export interface CreateWorkflowRunArgs {
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
}

export interface CreateWorkflowRunRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function createWorkflowRun(client: Client, args: CreateWorkflowRunArgs): Promise<CreateWorkflowRunRow | null> {
    const result = await client.query({
        text: createWorkflowRunQuery,
        values: [args.workflowId, args.workflowUrl, args.org, args.repo],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        workflowId: row[1],
        workflowUrl: row[2],
        org: row[3],
        repo: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        status: row[7],
        conclusion: row[8]
    };
}

export const getWorkflowRunQuery = `-- name: GetWorkflowRun :one
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE id = $1`;

export interface GetWorkflowRunArgs {
    id: number;
}

export interface GetWorkflowRunRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function getWorkflowRun(client: Client, args: GetWorkflowRunArgs): Promise<GetWorkflowRunRow | null> {
    const result = await client.query({
        text: getWorkflowRunQuery,
        values: [args.id],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        workflowId: row[1],
        workflowUrl: row[2],
        org: row[3],
        repo: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        status: row[7],
        conclusion: row[8]
    };
}

export const getWorkflowRunByWorkflowIdQuery = `-- name: GetWorkflowRunByWorkflowId :one
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE workflow_id = $1
ORDER BY created_at DESC
LIMIT 1`;

export interface GetWorkflowRunByWorkflowIdArgs {
    workflowId: string;
}

export interface GetWorkflowRunByWorkflowIdRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function getWorkflowRunByWorkflowId(client: Client, args: GetWorkflowRunByWorkflowIdArgs): Promise<GetWorkflowRunByWorkflowIdRow | null> {
    const result = await client.query({
        text: getWorkflowRunByWorkflowIdQuery,
        values: [args.workflowId],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        workflowId: row[1],
        workflowUrl: row[2],
        org: row[3],
        repo: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        status: row[7],
        conclusion: row[8]
    };
}

export const listWorkflowRunsQuery = `-- name: ListWorkflowRuns :many
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
ORDER BY created_at DESC
LIMIT $1 OFFSET $2`;

export interface ListWorkflowRunsArgs {
    limit: string;
    offset: string;
}

export interface ListWorkflowRunsRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function listWorkflowRuns(client: Client, args: ListWorkflowRunsArgs): Promise<ListWorkflowRunsRow[]> {
    const result = await client.query({
        text: listWorkflowRunsQuery,
        values: [args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            workflowId: row[1],
            workflowUrl: row[2],
            org: row[3],
            repo: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            status: row[7],
            conclusion: row[8]
        };
    });
}

export const listWorkflowRunsByRepoQuery = `-- name: ListWorkflowRunsByRepo :many
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE org = $1 AND repo = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4`;

export interface ListWorkflowRunsByRepoArgs {
    org: string;
    repo: string;
    limit: string;
    offset: string;
}

export interface ListWorkflowRunsByRepoRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function listWorkflowRunsByRepo(client: Client, args: ListWorkflowRunsByRepoArgs): Promise<ListWorkflowRunsByRepoRow[]> {
    const result = await client.query({
        text: listWorkflowRunsByRepoQuery,
        values: [args.org, args.repo, args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            workflowId: row[1],
            workflowUrl: row[2],
            org: row[3],
            repo: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            status: row[7],
            conclusion: row[8]
        };
    });
}

export const listWorkflowRunsByOrgQuery = `-- name: ListWorkflowRunsByOrg :many
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE org = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3`;

export interface ListWorkflowRunsByOrgArgs {
    org: string;
    limit: string;
    offset: string;
}

export interface ListWorkflowRunsByOrgRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function listWorkflowRunsByOrg(client: Client, args: ListWorkflowRunsByOrgArgs): Promise<ListWorkflowRunsByOrgRow[]> {
    const result = await client.query({
        text: listWorkflowRunsByOrgQuery,
        values: [args.org, args.limit, args.offset],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            workflowId: row[1],
            workflowUrl: row[2],
            org: row[3],
            repo: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            status: row[7],
            conclusion: row[8]
        };
    });
}

export const updateWorkflowRunQuery = `-- name: UpdateWorkflowRun :one
UPDATE workflow_runs
SET
    workflow_url = COALESCE($2, workflow_url)
WHERE id = $1
RETURNING id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion`;

export interface UpdateWorkflowRunArgs {
    id: number;
    workflowUrl: string;
}

export interface UpdateWorkflowRunRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function updateWorkflowRun(client: Client, args: UpdateWorkflowRunArgs): Promise<UpdateWorkflowRunRow | null> {
    const result = await client.query({
        text: updateWorkflowRunQuery,
        values: [args.id, args.workflowUrl],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        workflowId: row[1],
        workflowUrl: row[2],
        org: row[3],
        repo: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        status: row[7],
        conclusion: row[8]
    };
}

export const updateWorkflowRunStatusQuery = `-- name: UpdateWorkflowRunStatus :one
UPDATE workflow_runs
SET
    status = $2,
    conclusion = COALESCE($3, conclusion)
WHERE workflow_id = $1
RETURNING id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion`;

export interface UpdateWorkflowRunStatusArgs {
    workflowId: string;
    status: string;
    conclusion: string | null;
}

export interface UpdateWorkflowRunStatusRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function updateWorkflowRunStatus(client: Client, args: UpdateWorkflowRunStatusArgs): Promise<UpdateWorkflowRunStatusRow | null> {
    const result = await client.query({
        text: updateWorkflowRunStatusQuery,
        values: [args.workflowId, args.status, args.conclusion],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row[0],
        workflowId: row[1],
        workflowUrl: row[2],
        org: row[3],
        repo: row[4],
        createdAt: row[5],
        updatedAt: row[6],
        status: row[7],
        conclusion: row[8]
    };
}

export const deleteWorkflowRunQuery = `-- name: DeleteWorkflowRun :exec
DELETE FROM workflow_runs
WHERE id = $1`;

export interface DeleteWorkflowRunArgs {
    id: number;
}

export async function deleteWorkflowRun(client: Client, args: DeleteWorkflowRunArgs): Promise<void> {
    await client.query({
        text: deleteWorkflowRunQuery,
        values: [args.id],
        rowMode: "array"
    });
}

export const deleteWorkflowRunsByRepoQuery = `-- name: DeleteWorkflowRunsByRepo :exec
DELETE FROM workflow_runs
WHERE org = $1 AND repo = $2`;

export interface DeleteWorkflowRunsByRepoArgs {
    org: string;
    repo: string;
}

export async function deleteWorkflowRunsByRepo(client: Client, args: DeleteWorkflowRunsByRepoArgs): Promise<void> {
    await client.query({
        text: deleteWorkflowRunsByRepoQuery,
        values: [args.org, args.repo],
        rowMode: "array"
    });
}

export const countWorkflowRunsQuery = `-- name: CountWorkflowRuns :one
SELECT COUNT(*) FROM workflow_runs`;

export interface CountWorkflowRunsRow {
    count: string;
}

export async function countWorkflowRuns(client: Client): Promise<CountWorkflowRunsRow | null> {
    const result = await client.query({
        text: countWorkflowRunsQuery,
        values: [],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        count: row[0]
    };
}

export const countWorkflowRunsByRepoQuery = `-- name: CountWorkflowRunsByRepo :one
SELECT COUNT(*) FROM workflow_runs
WHERE org = $1 AND repo = $2`;

export interface CountWorkflowRunsByRepoArgs {
    org: string;
    repo: string;
}

export interface CountWorkflowRunsByRepoRow {
    count: string;
}

export async function countWorkflowRunsByRepo(client: Client, args: CountWorkflowRunsByRepoArgs): Promise<CountWorkflowRunsByRepoRow | null> {
    const result = await client.query({
        text: countWorkflowRunsByRepoQuery,
        values: [args.org, args.repo],
        rowMode: "array"
    });
    if (result.rows.length !== 1) {
        return null;
    }
    const row = result.rows[0];
    return {
        count: row[0]
    };
}

export const getRecentWorkflowRunsQuery = `-- name: GetRecentWorkflowRuns :many
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE created_at > $1
ORDER BY created_at DESC`;

export interface GetRecentWorkflowRunsArgs {
    createdAt: Date;
}

export interface GetRecentWorkflowRunsRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function getRecentWorkflowRuns(client: Client, args: GetRecentWorkflowRunsArgs): Promise<GetRecentWorkflowRunsRow[]> {
    const result = await client.query({
        text: getRecentWorkflowRunsQuery,
        values: [args.createdAt],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            workflowId: row[1],
            workflowUrl: row[2],
            org: row[3],
            repo: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            status: row[7],
            conclusion: row[8]
        };
    });
}

export const getWorkflowRunsByDateRangeQuery = `-- name: GetWorkflowRunsByDateRange :many
SELECT id, workflow_id, workflow_url, org, repo, created_at, updated_at, status, conclusion FROM workflow_runs
WHERE created_at BETWEEN $1 AND $2
ORDER BY created_at DESC`;

export interface GetWorkflowRunsByDateRangeArgs {
    startDate: Date;
    endDate: Date;
}

export interface GetWorkflowRunsByDateRangeRow {
    id: number;
    workflowId: string;
    workflowUrl: string;
    org: string;
    repo: string;
    createdAt: Date;
    updatedAt: Date;
    status: string;
    conclusion: string | null;
}

export async function getWorkflowRunsByDateRange(client: Client, args: GetWorkflowRunsByDateRangeArgs): Promise<GetWorkflowRunsByDateRangeRow[]> {
    const result = await client.query({
        text: getWorkflowRunsByDateRangeQuery,
        values: [args.startDate, args.endDate],
        rowMode: "array"
    });
    return result.rows.map(row => {
        return {
            id: row[0],
            workflowId: row[1],
            workflowUrl: row[2],
            org: row[3],
            repo: row[4],
            createdAt: row[5],
            updatedAt: row[6],
            status: row[7],
            conclusion: row[8]
        };
    });
}

