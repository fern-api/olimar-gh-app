import pg from 'pg';

const { Pool } = pg;

// Logger interface - allows consumers to pass in their own logger
export interface Logger {
  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
}

// Default console logger if none provided
const defaultLogger: Logger = {
  error: (message: string, ...meta: any[]) => console.error(message, ...meta),
  warn: (message: string, ...meta: any[]) => console.warn(message, ...meta),
  info: (message: string, ...meta: any[]) => console.log(message, ...meta),
  debug: (message: string, ...meta: any[]) => console.debug(message, ...meta),
};

// Database configuration interface
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// Workflow run status type
export type WorkflowRunStatus = 'queued' | 'in_progress' | 'completed';
export type WorkflowRunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;

// Workflow run record interface
export interface WorkflowRun {
  id?: number;
  github_org: string;
  github_repo: string;
  workflow_name: string;
  workflow_id: number;
  run_id?: number;
  commit_sha: string;
  commit_ref: string;
  status: WorkflowRunStatus;
  conclusion?: WorkflowRunConclusion;
  triggered_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * WorkflowDatabase class - PostgreSQL database for tracking GitHub Actions workflow runs
 */
export class WorkflowDatabase {
  private pool: pg.Pool;
  private logger: Logger;

  constructor(config: DatabaseConfig = {}, logger: Logger = defaultLogger) {
    this.logger = logger;

    // Create connection pool with defaults from environment variables
    this.pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || parseInt(process.env.DB_PORT || '5432'),
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      max: config.max || parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: config.idleTimeoutMillis || parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: config.connectionTimeoutMillis || parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    });

    // Log pool errors
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.logger.info('Database connection successful');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed:', error);
      return false;
    }
  }

  /**
   * Insert a new workflow run record
   */
  async insertWorkflowRun(run: Omit<WorkflowRun, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const query = `
      INSERT INTO workflow_runs (
        github_org,
        github_repo,
        workflow_name,
        workflow_id,
        run_id,
        commit_sha,
        commit_ref,
        status,
        conclusion,
        triggered_at,
        started_at,
        completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const values = [
      run.github_org,
      run.github_repo,
      run.workflow_name,
      run.workflow_id,
      run.run_id || null,
      run.commit_sha,
      run.commit_ref,
      run.status,
      run.conclusion || null,
      run.triggered_at,
      run.started_at || null,
      run.completed_at || null,
    ];

    try {
      const result = await this.pool.query(query, values);
      const id = result.rows[0].id;
      this.logger.debug(`Inserted workflow run record with ID: ${id}`);
      return id;
    } catch (error) {
      this.logger.error('Error inserting workflow run:', error);
      throw error;
    }
  }

  /**
   * Update an existing workflow run record by run_id
   */
  async updateWorkflowRunByRunId(
    runId: number,
    updates: {
      status?: WorkflowRunStatus;
      conclusion?: WorkflowRunConclusion;
      started_at?: Date;
      completed_at?: Date;
    }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.conclusion !== undefined) {
      fields.push(`conclusion = $${paramIndex++}`);
      values.push(updates.conclusion);
    }
    if (updates.started_at !== undefined) {
      fields.push(`started_at = $${paramIndex++}`);
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completed_at);
    }

    if (fields.length === 0) {
      this.logger.warn('No fields to update for workflow run');
      return false;
    }

    fields.push(`updated_at = NOW()`);
    values.push(runId);

    const query = `
      UPDATE workflow_runs
      SET ${fields.join(', ')}
      WHERE run_id = $${paramIndex}
    `;

    try {
      const result = await this.pool.query(query, values);
      const updated = result.rowCount !== null && result.rowCount > 0;
      this.logger.debug(`Updated workflow run ${runId}: ${updated ? 'success' : 'not found'}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating workflow run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing workflow run record by database ID
   */
  async updateWorkflowRunById(
    id: number,
    updates: {
      run_id?: number;
      status?: WorkflowRunStatus;
      conclusion?: WorkflowRunConclusion;
      started_at?: Date;
      completed_at?: Date;
    }
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.run_id !== undefined) {
      fields.push(`run_id = $${paramIndex++}`);
      values.push(updates.run_id);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.conclusion !== undefined) {
      fields.push(`conclusion = $${paramIndex++}`);
      values.push(updates.conclusion);
    }
    if (updates.started_at !== undefined) {
      fields.push(`started_at = $${paramIndex++}`);
      values.push(updates.started_at);
    }
    if (updates.completed_at !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(updates.completed_at);
    }

    if (fields.length === 0) {
      this.logger.warn('No fields to update for workflow run');
      return false;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workflow_runs
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    try {
      const result = await this.pool.query(query, values);
      const updated = result.rowCount !== null && result.rowCount > 0;
      this.logger.debug(`Updated workflow run ID ${id}: ${updated ? 'success' : 'not found'}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating workflow run ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow run by run_id
   */
  async getWorkflowRunByRunId(runId: number): Promise<WorkflowRun | null> {
    const query = `
      SELECT * FROM workflow_runs
      WHERE run_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [runId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0] as WorkflowRun;
    } catch (error) {
      this.logger.error(`Error fetching workflow run ${runId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent workflow runs for a repository
   */
  async getWorkflowRunsByRepo(
    org: string,
    repo: string,
    limit: number = 50
  ): Promise<WorkflowRun[]> {
    const query = `
      SELECT * FROM workflow_runs
      WHERE github_org = $1 AND github_repo = $2
      ORDER BY triggered_at DESC
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(query, [org, repo, limit]);
      return result.rows as WorkflowRun[];
    } catch (error) {
      this.logger.error(`Error fetching workflow runs for ${org}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom SQL query
   */
  async executeQuery<T extends pg.QueryResultRow = any>(
    query: string,
    values?: any[]
  ): Promise<pg.QueryResult<T>> {
    try {
      const result = await this.pool.query<T>(query, values);
      this.logger.debug(`Query executed: ${result.rowCount} rows affected`);
      return result;
    } catch (error) {
      this.logger.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Close the database pool (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database pool closed');
  }
}

// Export a factory function for convenience
export function createWorkflowDatabase(config?: DatabaseConfig, logger?: Logger): WorkflowDatabase {
  return new WorkflowDatabase(config, logger);
}

export default WorkflowDatabase;
