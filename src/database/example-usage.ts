/**
 * Example usage of database client with sqlc-generated queries
 *
 * This file demonstrates how to use the database client with sqlc queries.
 * Delete this file once you've understood the pattern.
 */

import { getClient } from "./client.js";
// Import sqlc-generated query functions (after running pnpm run db:generate)
// import { createWorkflowRun, getWorkflowRun, listWorkflowRunsByRepo } from './generated-queries/index.js';

export async function exampleCreateWorkflowRun() {
    const db = await getClient();

    /* Example after running db:generate:
  const result = await createWorkflowRun(db, {
    workflow_id: 123456789n,
    workflow_url: 'https://github.com/myorg/myrepo/actions/runs/123456789',
    org: 'myorg',
    repo: 'myrepo'
  });

  console.log('Created workflow run:', result);
  return result;
  */
}

export async function exampleGetWorkflowRun(id: number) {
    const db = await getClient();

    /* Example after running db:generate:
  const result = await getWorkflowRun(db, { id });

  if (result) {
    console.log('Found workflow run:', result);
  } else {
    console.log('Workflow run not found');
  }

  return result;
  */
}

export async function exampleListWorkflowRuns(org: string, repo: string) {
    const db = await getClient();

    /* Example after running db:generate:
  const results = await listWorkflowRunsByRepo(db, {
    org,
    repo,
    limit: 10,
    offset: 0
  });

  console.log(`Found ${results.length} workflow runs for ${org}/${repo}`);
  return results;
  */
}
