import logger from '../logger.js';
import { BaseActionParams } from './types.js';

/**
 * Parameters for monitoring a workflow run
 */
export interface MonitorWorkflowParams extends BaseActionParams {
  workflowName: string;
  workflowId: number;
}

/**
 * Monitor a workflow run until it completes
 */
export async function monitorWorkflow(params: MonitorWorkflowParams): Promise<void> {
  const { octokit, owner, repo, workflowName, workflowId } = params;

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

      logger.debug(`Workflow ${workflowName} - Status: ${status}, Conclusion: ${conclusion || 'N/A'}`);

      // Check if workflow has completed
      if (status === 'completed') {
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
