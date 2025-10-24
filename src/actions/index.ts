/**
 * GitHub Actions - Standardized interface for write operations on repositories
 *
 * All actions follow a consistent pattern:
 * - Accept typed Octokit object, owner, repo, and action-specific parameters
 * - Return ActionResult or void
 */

export * from './types.js';
export * from './dispatch-workflow.js';
export * from './fetch-generators.js';
