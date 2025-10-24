import yaml from 'js-yaml';
import logger from '../logger.js';
import { BaseActionParams } from './types.js';

/**
 * Parameters for fetching generators.yml files
 */
export interface FetchGeneratorsParams extends BaseActionParams {
  ref?: string; // Branch name, commit SHA, or tag (defaults to 'main')
}

/**
 * Parsed generator configuration with filepath
 */
export interface GeneratorConfig {
  filepath: string;
  [key: string]: any; // Allow any YAML structure
}

/**
 * Result type for fetch generators action
 */
export interface FetchGeneratorsResult {
  generators: GeneratorConfig[];
}

/**
 * Fetch and parse all generators.yml files from the fern/ directory
 * at a specific commit or HEAD of main
 */
export async function fetchGenerators(params: FetchGeneratorsParams): Promise<FetchGeneratorsResult> {
  const { octokit, owner, repo, ref = 'main' } = params;

  logger.info(`Fetching generators.yml files from ${owner}/${repo} at ref: ${ref}`);

  try {
    // Get the commit for the ref (works with branch names, tags, or commit SHAs)
    const { data: commitData } = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
      owner,
      repo,
      ref,
      headers: {
        'x-github-api-version': '2022-11-28',
      },
    });

    const commitSha = commitData.sha;
    logger.debug(`Resolved ref ${ref} to commit ${commitSha}`);

    // Get the tree recursively to find all files
    const { data: treeData } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
      owner,
      repo,
      tree_sha: commitSha,
      recursive: 'true',
      headers: {
        'x-github-api-version': '2022-11-28',
      },
    });

    // Filter for generators.yml files in fern/ directory
    const generatorFiles = treeData.tree.filter(
      (item: { type?: string; path?: string; sha?: string }) =>
        item.type === 'blob' &&
        item.path &&
        item.path.startsWith('fern/') &&
        item.path.endsWith('generators.yml')
    );

    logger.info(`Found ${generatorFiles.length} generators.yml file(s) in fern/ directory`);

    // Fetch and parse each generator file
    const generators: GeneratorConfig[] = [];

    for (const file of generatorFiles) {
      if (!file.sha || !file.path) {
        continue;
      }

      try {
        // Fetch the blob content
        const { data: blobData } = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', {
          owner,
          repo,
          file_sha: file.sha,
          headers: {
            'x-github-api-version': '2022-11-28',
          },
        });

        // Decode base64 content
        const content = Buffer.from(blobData.content, 'base64').toString('utf-8');

        // Parse YAML
        const parsed = yaml.load(content) as Record<string, any>;

        // Add filepath property
        generators.push({
          filepath: file.path,
          ...parsed,
        });

        logger.debug(`Successfully parsed ${file.path}`);
      } catch (error) {
        logger.error(`Error parsing ${file.path}:`, error);
        // Continue processing other files even if one fails
      }
    }

    logger.info(`Successfully parsed ${generators.length} generators.yml file(s)`);

    return { generators };
  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      const err = error as { response?: { status: number; data: { message: string } } };
      if (err.response) {
        logger.error(
          `Error fetching generators! Status: ${err.response.status}. Message: ${err.response.data.message}`
        );
      }
    } else {
      logger.error('Error fetching generators:', error);
    }
    throw error;
  }
}
