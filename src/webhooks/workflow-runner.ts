import logger from '../logger.js';
import db, { isDatabaseAvailable } from '../db/index.js';

export interface WorkflowDispatchParams {
  octokit: any;
  owner: string;
  repo: string;
  workflow: {
    id: number;
    name: string;
    path: string;
  };
  ref: string;
  inputs?: Record<string, string>;
  commitSha: string;
}

export interface WorkflowMonitorParams {
  octokit: any;
  owner: string;
  repo: string;
  workflowName: string;
  workflowId: number;
  dbRecordId?: number | null;
}

/**
 * Dispatch a workflow and optionally track it in the database
 */
export async function dispatchWorkflow(params: WorkflowDispatchParams): Promise<number | null> {
  const { octokit, owner, repo, workflow, ref, inputs = {}, commitSha } = params;

  logger.info(`Dispatching workflow: ${workflow.name} (${workflow.path})`);

  // Insert database record before dispatching (if DB is available)
  let dbRecordId: number | null = null;
  if (isDatabaseAvailable()) {
    try {
      dbRecordId = await db.insertWorkflowRun({
        github_org: owner,
        github_repo: repo,
        workflow_name: workflow.name,
        workflow_id: workflow.id,
        commit_sha: commitSha,
        commit_ref: ref,
        status: 'queued',
        triggered_at: new Date(),
      });
      logger.debug(`Created DB record ${dbRecordId} for workflow ${workflow.name}`);
    } catch (error) {
      logger.error('Failed to save workflow run to database:', error);
      // Continue processing even if DB insert fails
    }
  }

  try {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner,
      repo,
      workflow_id: workflow.id,
      ref: ref,
      inputs,
      headers: {
        'x-github-api-version': '2022-11-28',
      },
    });

    logger.info(`Successfully dispatched workflow: ${workflow.name}`);
    return dbRecordId;
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status: number; data: { message: string } } };
      if (err.response) {
        logger.error(`Error dispatching ${workflow.name}! Status: ${err.response.status}. Message: ${err.response.data.message}`);
      }
    } else {
      logger.error(`Error dispatching ${workflow.name}:`, error);
    }
    throw error;
  }
}

/**
 * Monitor a workflow run until it completes
 */
export async function monitorWorkflowRun(params: WorkflowMonitorParams): Promise<void> {
  const { octokit, owner, repo, workflowName, workflowId, dbRecordId = null } = params;

  const maxAttempts = 60; // Monitor for up to 10 minutes (60 * 10 seconds)
  const pollInterval = 10000; // Poll every 10 seconds

  logger.info(`Starting to monitor workflow: ${workflowName}`);

  // Wait a bit before first check to allow GitHub to create the run
  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Get the latest workflow runs for this workflow
      const { data: runs } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs', {
        owner,
        repo,
        workflow_id: workflowId,
        per_page: 5,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      if (runs.workflow_runs.length === 0) {
        logger.debug(`No runs found yet for workflow: ${workflowName}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        continue;
      }

      // Get the most recent run
      const latestRun = runs.workflow_runs[0];
      const status = latestRun.status;
      const conclusion = latestRun.conclusion;
      const runId = latestRun.id;

      logger.debug(`Workflow ${workflowName} - Status: ${status}, Conclusion: ${conclusion || 'N/A'}`);

      // Update database with run_id if we have a DB record and haven't set it yet
      if (isDatabaseAvailable() && dbRecordId !== null) {
        try {
          const dbRun = await db.getWorkflowRunByRunId(runId);
          // Only update if this run_id isn't already tracked
          if (!dbRun) {
            await db.updateWorkflowRunById(dbRecordId, {
              run_id: runId,
              status: status as 'queued' | 'in_progress' | 'completed',
              started_at: latestRun.run_started_at ? new Date(latestRun.run_started_at) : undefined,
            });
            logger.debug(`Updated DB record ${dbRecordId} with run_id ${runId}`);
          }
        } catch (error) {
          logger.error('Failed to update workflow run in database:', error);
        }
      }

      // Check if workflow has completed
      if (status === 'completed') {
        // Update database with final status
        if (isDatabaseAvailable() && dbRecordId !== null) {
          try {
            await db.updateWorkflowRunById(dbRecordId, {
              status: 'completed',
              conclusion: conclusion as any,
              completed_at: new Date(),
            });
            logger.debug(`Updated DB record ${dbRecordId} with completion status`);
          } catch (error) {
            logger.error('Failed to update workflow completion in database:', error);
          }
        }

        if (conclusion === 'success') {
          logger.info(`✓ Workflow ${workflowName} completed successfully! Run ID: ${latestRun.id}`);
          return;
        } else {
          logger.warn(`✗ Workflow ${workflowName} completed with conclusion: ${conclusion}. Run ID: ${latestRun.id}`);
          return;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(`Error checking workflow ${workflowName}! Status: ${err.response.status}. Message: ${err.response.data.message}`);
        }
      } else {
        logger.error(`Error checking workflow ${workflowName}:`, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  logger.warn(`Monitoring timeout reached for workflow: ${workflowName}`);
}

/**
 * Dispatch a workflow and start monitoring it
 */
export async function dispatchAndMonitorWorkflow(params: WorkflowDispatchParams): Promise<void> {
  const { octokit, owner, repo, workflow } = params;

  try {
    const dbRecordId = await dispatchWorkflow(params);

    // Start monitoring in the background (don't await this)
    monitorWorkflowRun({
      octokit,
      owner,
      repo,
      workflowName: workflow.name,
      workflowId: workflow.id,
      dbRecordId,
    }).catch((error) => {
      logger.error(`Error monitoring workflow ${workflow.name}:`, error);
    });
  } catch (error) {
    // Error already logged in dispatchWorkflow
    throw error;
  }
}
