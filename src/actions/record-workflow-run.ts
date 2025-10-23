import logger from '../logger.js';
import db, { isDatabaseAvailable } from '../db/index.js';
import { BaseActionParams, ActionResult } from './types.js';

/**
 * Parameters for recording a workflow run from a webhook event
 */
export interface RecordWorkflowRunParams extends BaseActionParams {
  workflowRun: {
    id: number;
    name: string;
    workflow_id: number;
    status: string;
    conclusion: string | null;
    head_sha: string;
    head_branch: string;
    run_started_at?: string | null;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Record a workflow run in the database from a webhook event
 */
export async function recordWorkflowRun(params: RecordWorkflowRunParams): Promise<ActionResult> {
  const { owner, repo, workflowRun } = params;

  if (!isDatabaseAvailable()) {
    logger.warn('Database not available, skipping workflow run recording');
    return {};
  }

  try {
    // Check if this workflow run already exists in the database
    const existingRun = await db.getWorkflowRunByRunId(workflowRun.id);

    if (existingRun) {
      // Update existing record
      logger.debug(`Updating existing workflow run ${workflowRun.id} for ${workflowRun.name}`);

      await db.updateWorkflowRunByRunId(workflowRun.id, {
        status: workflowRun.status as 'queued' | 'in_progress' | 'completed',
        conclusion: workflowRun.conclusion as any,
        started_at: workflowRun.run_started_at ? new Date(workflowRun.run_started_at) : undefined,
        completed_at: workflowRun.status === 'completed' ? new Date(workflowRun.updated_at) : undefined,
      });

      logger.info(`Updated workflow run record for ${workflowRun.name} (run_id: ${workflowRun.id})`);
      return { dbRecordId: existingRun.id };
    } else {
      // Insert new record
      logger.debug(`Creating new workflow run record for ${workflowRun.name}`);

      const dbRecordId = await db.insertWorkflowRun({
        github_org: owner,
        github_repo: repo,
        workflow_name: workflowRun.name,
        workflow_id: workflowRun.workflow_id,
        run_id: workflowRun.id,
        commit_sha: workflowRun.head_sha,
        commit_ref: `refs/heads/${workflowRun.head_branch}`,
        status: workflowRun.status as 'queued' | 'in_progress' | 'completed',
        conclusion: workflowRun.conclusion as any,
        triggered_at: new Date(workflowRun.created_at),
        started_at: workflowRun.run_started_at ? new Date(workflowRun.run_started_at) : undefined,
        completed_at: workflowRun.status === 'completed' ? new Date(workflowRun.updated_at) : undefined,
      });

      logger.info(`Created workflow run record ${dbRecordId} for ${workflowRun.name} (run_id: ${workflowRun.id})`);
      return { dbRecordId };
    }
  } catch (error) {
    logger.error('Failed to record workflow run in database:', error);
    // Don't throw - we don't want DB errors to stop webhook processing
    return {};
  }
}
