import logger from '../logger.js';
import db, { isDatabaseAvailable } from '../db/index.js';
import { BaseActionParams, WorkflowInfo, ActionResult } from './types.js';

/**
 * Parameters for dispatching a workflow
 */
export interface DispatchWorkflowParams extends BaseActionParams {
  workflow: WorkflowInfo;
  ref: string;
  inputs?: Record<string, string>;
  commitSha: string;
}

/**
 * Dispatch a workflow and optionally track it in the database
 */
export async function dispatchWorkflow(params: DispatchWorkflowParams): Promise<ActionResult> {
  const { octokit, owner, repo, workflow, ref, inputs = {}, commitSha } = params;

  logger.info(`Dispatching workflow: ${workflow.name} (${workflow.path})`);

  // Insert database record before dispatching (if DB is available)
  let dbRecordId: number | null = null;
  if (isDatabaseAvailable()) {
    try {
      // Extract version input if provided
      const versionInput = inputs.version || null;

      dbRecordId = await db.insertWorkflowRun({
        github_org: owner,
        github_repo: repo,
        workflow_name: workflow.name,
        workflow_id: workflow.id,
        commit_sha: commitSha,
        commit_ref: ref,
        status: 'queued',
        version_input: versionInput,
        triggered_at: new Date(),
      });
      logger.debug(`Created DB record ${dbRecordId} for workflow ${workflow.name}${versionInput ? ` with version ${versionInput}` : ''}`);
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
    return { dbRecordId };
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
