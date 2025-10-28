import { App } from "octokit";
import { dispatchWorkflow } from "../actions/index.js";
import { getClient } from "../database/client.js";
import {
  createWorkflowRun,
  getWorkflowRunByWorkflowId,
  updateWorkflowRunStatus
} from "../database/generated-queries/workflow_runs_sql.js";
import logger from "../logger.js";

// This function registers all webhook event handlers on the app instance
export function registerWebhookHandlers(app: App) {
  // Log all incoming webhook events minimally
  app.webhooks.onAny(({ id, name, payload }) => {
    let repo = "N/A";
    let owner = "N/A";

    if ("repository" in payload && payload.repository) {
      repo = payload.repository.name;
      if ("owner" in payload.repository && payload.repository.owner) {
        owner = payload.repository.owner.login;
      }
    }

    logger.info(`Event: ${name} | Repo: ${owner}/${repo} | ID: ${id}`);
  });

  // This adds an event handler for push events.
  // Logs the payload and lists all workflows in the repository.
  app.webhooks.on("push", async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;
    const ref = payload.ref;

    if (!owner) {
      logger.error("No repository owner found in payload");
      return;
    }

    // Log the entire payload
    logger.debug("Push event payload:", JSON.stringify(payload, null, 2));

    try {
      // Step 1: List all workflows in the repository
      const { data: workflows } = await octokit.request("GET /repos/{owner}/{repo}/actions/workflows", {
        owner,
        repo,
        headers: {
          "x-github-api-version": "2022-11-28"
        }
      });

      logger.info(`Found ${workflows.total_count} workflow(s) in ${owner}/${repo}`);

      // Step 2: Filter workflows that include 'sdk' in the name or filename
      const sdkWorkflows = workflows.workflows.filter((workflow) => {
        const nameMatch = workflow.name.toLowerCase().includes("sdk");
        const pathMatch = workflow.path.toLowerCase().includes("sdk");
        return (nameMatch || pathMatch) && workflow.state === "active";
      });

      logger.info(`Found ${sdkWorkflows.length} SDK workflow(s) to dispatch`);

      if (sdkWorkflows.length === 0) {
        logger.info("No SDK workflows found to dispatch");
        return;
      }

      // Get commit SHA from payload
      const commitSha = payload.after || payload.head_commit?.id || "unknown";

      // Step 3: Dispatch each SDK workflow with inputs.version = 1.0.0
      const dispatchPromises = sdkWorkflows.map(async (workflow) => {
        try {
          await dispatchWorkflow({
            octokit,
            owner,
            repo,
            workflow: {
              id: workflow.id,
              name: workflow.name,
              path: workflow.path
            },
            ref: ref,
            inputs: {
              version: "1.0.0"
            },
            commitSha
          });
        } catch (error) {
          // Error already logged in dispatchWorkflow
          logger.error(`Failed to dispatch workflow ${workflow.name}`);
        }
      });

      await Promise.all(dispatchPromises);
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(`Error! Status: ${err.response.status}. Message: ${err.response.data.message}`);
        }
      }
      logger.error(error);
    }
  });

  // This adds an event handler for workflow_run events.
  // Logs SDK workflow run completion status.
  app.webhooks.on("workflow_run", async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;
    const action = payload.action;
    const workflowRun = payload.workflow_run;

    if (!owner) {
      logger.error("No repository owner found in workflow_run payload");
      return;
    }

    logger.debug(
      `Workflow run event - Action: ${action}, Workflow: ${workflowRun.name}, Status: ${workflowRun.status}`
    );

    try {
      // Validate required fields
      if (!workflowRun.name || !workflowRun.head_sha || !workflowRun.head_branch) {
        logger.warn("Workflow run missing required fields, skipping");
        return;
      }

      // Filter to only track SDK workflows (same logic as push handler)
      const workflowName = workflowRun.name.toLowerCase();
      const workflowPath = workflowRun.path?.toLowerCase() || "";

      const isSdkWorkflow = workflowName.includes("sdk") || workflowPath.includes("sdk");

      if (!isSdkWorkflow) {
        logger.debug(`Skipping non-SDK workflow: ${workflowRun.name}`);
        return;
      }

      logger.info(`Processing workflow_run event for SDK workflow: ${workflowRun.name} (${action})`);

      // Save/update workflow run in database
      const db = await getClient();
      const workflowRunId = workflowRun.id.toString();
      const workflowUrl = workflowRun.html_url;

      // Check if workflow run already exists
      const existingRun = await getWorkflowRunByWorkflowId(db, { workflowId: workflowRunId });

      if (!existingRun) {
        // Create new workflow run record
        const newRun = await createWorkflowRun(db, {
          workflowId: workflowRunId,
          workflowUrl,
          org: owner,
          repo
        });
        logger.info(`Saved new workflow run to database: ${workflowRun.name} (ID: ${newRun?.id})`);
      }

      // Update status and conclusion based on workflow_run
      const statusMap: Record<string, string> = {
        queued: "queued",
        in_progress: "in_progress",
        completed: "completed",
        waiting: "waiting",
        requested: "requested",
        pending: "pending"
      };

      const dbStatus = statusMap[workflowRun.status] || "queued";

      // Conclusion is only available when workflow is completed
      const conclusion = workflowRun.conclusion || null;

      await updateWorkflowRunStatus(db, {
        workflowId: workflowRunId,
        status: dbStatus,
        conclusion: conclusion
      });
      logger.info(`Updated workflow run status to: ${dbStatus}${conclusion ? `, conclusion: ${conclusion}` : ""}`);

      // Log completion status
      if (action === "completed") {
        if (workflowRun.conclusion === "success") {
          logger.info(`✓ SDK workflow ${workflowRun.name} completed successfully`);
        } else {
          logger.warn(`✗ SDK workflow ${workflowRun.name} completed with conclusion: ${workflowRun.conclusion}`);
        }
      }
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(
            `Error processing workflow_run! Status: ${err.response.status}. Message: ${err.response.data.message}`
          );
        }
      }
      logger.error("Error processing workflow_run event:", error);
    }
  });

  // This adds an event handler for workflow_dispatch events.
  // Logs when a workflow is manually triggered via workflow_dispatch.
  app.webhooks.on("workflow_dispatch", async ({ octokit, payload }) => {
    const repo = payload.repository.name;
    const owner = payload.repository.owner?.login;
    const workflow = payload.workflow;
    const ref = payload.ref;

    if (!owner) {
      logger.error("No repository owner found in workflow_dispatch payload");
      return;
    }

    logger.info(`Workflow dispatch event - Workflow: ${workflow}, Ref: ${ref}, Repo: ${owner}/${repo}`);
    logger.debug("Workflow dispatch payload:", JSON.stringify(payload, null, 2));

    try {
      // You can add custom logic here to track manually dispatched workflows
      // For example, storing the dispatch event in a database or triggering other actions

      const workflowName = workflow?.toLowerCase() || "";
      const isSdkWorkflow = workflowName.includes("sdk");

      if (isSdkWorkflow) {
        logger.info(`SDK workflow "${workflow}" was manually dispatched on ${ref}`);
      }
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const err = error as { response?: { status: number; data: { message: string } } };
        if (err.response) {
          logger.error(
            `Error processing workflow_dispatch! Status: ${err.response.status}. Message: ${err.response.data.message}`
          );
        }
      }
      logger.error("Error processing workflow_dispatch event:", error);
    }
  });

  logger.info("Webhook handlers registered");
}
