/**
 * Base parameters for all GitHub actions
 */
export interface BaseActionParams {
  octokit: any; // Typed as any to match webhook handler signature from octokit package
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
