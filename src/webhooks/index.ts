import { App } from 'octokit';
import logger from '../logger.js';
import { dispatchAndMonitorWorkflow } from '../actions/index.js';

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

      // Get commit SHA from payload
      const commitSha = payload.after || payload.head_commit?.id || 'unknown';

      // Step 3: Dispatch each SDK workflow with inputs.version = 1.0.0
      const dispatchPromises = sdkWorkflows.map(async (workflow) => {
        try {
          await dispatchAndMonitorWorkflow({
            octokit,
            owner,
            repo,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              path: workflow.path,
            },
            ref: ref,
            inputs: {
              version: '1.0.0',
            },
            commitSha,
          });
        } catch (error) {
          // Error already logged in dispatchAndMonitorWorkflow
          logger.error(`Failed to dispatch workflow ${workflow.name}`);
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
