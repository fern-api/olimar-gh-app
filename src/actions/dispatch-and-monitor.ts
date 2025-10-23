import logger from '../logger.js';
import { dispatchWorkflow, DispatchWorkflowParams } from './dispatch-workflow.js';
import { monitorWorkflow } from './monitor-workflow.js';

/**
 * Dispatch a workflow and start monitoring it
 */
export async function dispatchAndMonitorWorkflow(params: DispatchWorkflowParams): Promise<void> {
  const { octokit, owner, repo, workflow } = params;

  try {
    const { dbRecordId } = await dispatchWorkflow(params);

    // Start monitoring in the background (don't await this)
    monitorWorkflow({
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
