import { App } from 'octokit';

// This function registers all webhook event handlers on the app instance
export function registerWebhookHandlers(app: App) {
  // This adds an event handler for pull request closed events.
  // When a PR is merged, it triggers a workflow dispatch based on the target branch.
  // app.webhooks.on('pull_request.closed', async ({ octokit, payload }) => {
  //   // Check if PR was merged
  //   if (!payload.pull_request.merged) {
  //     console.log(`PR #${payload.pull_request.number} was closed but not merged`);
  //     return;
  //   }

  //   const branch = payload.pull_request.base.ref;
  //   const repo = payload.repository.name;
  //   const owner = payload.repository.owner.login;

  //   console.log(`Received a pull request merge event for #${payload.pull_request.number} to ${branch} in ${owner}/${repo}`);

  //   try {
  //     // Trigger workflow dispatch based on the target branch
  //     const workflowId = getWorkflowForBranch(branch);

  //     if (workflowId) {
  //       await octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
  //         owner,
  //         repo,
  //         workflow_id: workflowId,
  //         ref: branch,
  //         inputs: {
  //           pr_number: payload.pull_request.number.toString(),
  //           merged_by: payload.pull_request.merged_by?.login || 'unknown',
  //           pr_title: payload.pull_request.title,
  //         },
  //         headers: {
  //           "x-github-api-version": "2022-11-28",
  //         },
  //       });

  //       console.log(`Triggered workflow ${workflowId} for branch ${branch}`);
  //     } else {
  //       console.log(`No workflow configured for branch ${branch}`);
  //     }
  //   } catch (error) {
  //     if (error.response) {
  //       console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`);
  //     }
  //     console.error(error);
  //   }
  // });

  // This adds an event handler for push events.
  // Logs the payload and lists all workflows in the repository.
  app.webhooks.on('push', async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;

    if (!owner) {
      console.error('No repository owner found in payload');
      return;
    }

    // Log the entire payload
    console.log('Push event payload:', JSON.stringify(payload, null, 2));

    try {
      // List all workflows in the repository
      const { data: workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
        owner,
        repo,
        headers: {
          'x-github-api-version': '2022-11-28',
        },
      });

      console.log(`Found ${workflows.total_count} workflow(s) in ${owner}/${repo}:`);
      workflows.workflows.forEach((workflow) => {
        console.log(`  - ${workflow.name} (${workflow.path}) - State: ${workflow.state}`);
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          console.error(`Error! Status: ${err.response.status}. Message: ${err.response.data.message}`);
        }
      }
      console.error(error);
    }
  });

  console.log('Webhook handlers registered');
}

// Configure which workflows to trigger for which branches
function getWorkflowForBranch(branch: string): string | null {
  const workflowMap: Record<string, string> = {
    'main': 'deploy-production.yml',
    'master': 'deploy-production.yml',
    'staging': 'deploy-staging.yml',
    'develop': 'run-tests.yml',
    'dev': 'run-tests.yml',
  };

  return workflowMap[branch] || null;
}
