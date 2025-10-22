import { App } from 'octokit';
import logger from './logger.js';

// This function registers all webhook event handlers on the app instance
export function registerWebhookHandlers(app: App) {
  // Log all incoming webhook events minimally
  app.webhooks.onAny(({ id, name, payload }) => {
    let repo = 'N/A';
    let owner = 'N/A';

    if ('repository' in payload && payload.repository) {
      repo = payload.repository.name;
      if ('owner' in payload.repository && payload.repository.owner) {
        owner = payload.repository.owner.login;
      }
    }

    logger.info(`Event: ${name} | Repo: ${owner}/${repo} | ID: ${id}`);
  });

  // This adds an event handler for push events.
  // Logs the payload and lists all workflows in the repository.
  app.webhooks.on('push', async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;
    const ref = payload.ref;

    if (!owner) {
      logger.error('No repository owner found in payload');
      return;
    }

    // Log the entire payload
    logger.debug('Push event payload:', JSON.stringify(payload, null, 2));

    try {
      // Step 1: List all workflows in the repository
      const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner,
        repo,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      logger.info(`Found ${workflows.total_count} workflow(s) in ${owner}/${repo}`);

      // Step 2: Filter workflows that include 'sdk' in the name or filename
      const sdkWorkflows = workflows.workflows.filter((workflow) => {
        const nameMatch = workflow.name.toLowerCase().includes('sdk');
        const pathMatch = workflow.path.toLowerCase().includes('sdk');
        return (nameMatch || pathMatch) && workflow.state === 'active';
      });

      logger.info(`Found ${sdkWorkflows.length} SDK workflow(s) to dispatch`);

      if (sdkWorkflows.length === 0) {
        logger.info('No SDK workflows found to dispatch');
        return;
      }

      // Step 3: Dispatch each SDK workflow with inputs.version = 1.0.0
      const dispatchPromises = sdkWorkflows.map(async (workflow) => {
        logger.info(`Dispatching workflow: ${workflow.name} (${workflow.path})`);

        try {
          await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
            owner,
            repo,
            workflow_id: workflow.id,
            ref: ref,
            inputs: {
              version: '1.0.0',
            },
            headers: {
              'x-github-api-version': '2022-11-28',
            },
          });

          logger.info(`Successfully dispatched workflow: ${workflow.name}`);

          // Step 4: Monitor the workflow status
          // Start monitoring in the background (don't await this)
          monitorWorkflowRun(octokit, owner, repo, workflow.name, workflow.id).catch((error) => {
            logger.error(`Error monitoring workflow ${workflow.name}:`, error);
          });

        } catch (error) {
          if (error && typeof error === 'object' && 'response' in error) {
            const err = error as { response?: { status: number; data: { message: string } } };
            if (err.response) {
              logger.error(`Error dispatching ${workflow.name}! Status: ${err.response.status}. Message: ${err.response.data.message}`);
            }
          } else {
            logger.error(`Error dispatching ${workflow.name}:`, error);
          }
        }
      });

      await Promise.all(dispatchPromises);

    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(`Error! Status: ${err.response.status}. Message: ${err.response.data.message}`);
        }
      }
      logger.error(error);
    }
  });

  logger.info('Webhook handlers registered');
}

// Monitor a workflow run until it completes
async function monitorWorkflowRun(
  octokit: any,
  owner: string,
  repo: string,
  workflowName: string,
  workflowId: number
): Promise<void> {
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
