import { Octokit } from 'octokit';

/**
 * Base parameters for all GitHub actions
 */
export interface BaseActionParams {
  octokit: Octokit;
  owner: string;
  repo: string;
}

/**
 * Workflow information
 */
export interface WorkflowInfo {
  id: number;
  name: string;
  path: string;
}

/**
 * Result type for actions that may have database tracking
 */
export interface ActionResult {
  dbRecordId?: number | null;
}
