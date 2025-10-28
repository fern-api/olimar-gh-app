import logger from "../logger.js";
import { BaseActionParams, WorkflowInfo, ActionResult } from "./types.js";

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
 * Dispatch a workflow
 */
export async function dispatchWorkflow(params: DispatchWorkflowParams): Promise<ActionResult> {
    const { octokit, owner, repo, workflow, ref, inputs = {} } = params;

    logger.info(`Dispatching workflow: ${workflow.name} (${workflow.path})`);

    try {
        await octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
            owner,
            repo,
            workflow_id: workflow.id,
            ref: ref,
            inputs,
            headers: {
                "x-github-api-version": "2022-11-28"
            }
        });

        logger.info(`Successfully dispatched workflow: ${workflow.name}`);
        return {};
    } catch (error) {
        if (error && typeof error === "object" && "response" in error) {
            const err = error as { response?: { status: number; data: { message: string } } };
            if (err.response) {
                logger.error(
                    `Error dispatching ${workflow.name}! Status: ${err.response.status}. Message: ${err.response.data.message}`
                );
            }
        } else {
            logger.error(`Error dispatching ${workflow.name}:`, error);
        }
        throw error;
    }
}
