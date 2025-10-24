import pg from 'pg';
import logger from '../logger.js';

const { Client } = pg;

/**
 * Database client configuration
 * Uses environment variables for connection settings
 */
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'autopilot',
};

/**
 * PostgreSQL client instance
 * Server-side pooling is handled by the database (e.g., PgBouncer)
 */
let client: pg.Client | null = null;

/**
 * Get or create the database client
 */
export async function getClient(): Promise<pg.Client> {
  if (!client) {
    client = new Client(config);
    await client.connect();
    logger.info('Database client connected');
  }
  return client;
}

/**
 * Test the database connection
 * Call this on application startup to verify database connectivity
 */
export async function testConnection(): Promise<void> {
  try {
    const db = await getClient();
    const result = await db.query('SELECT NOW()');
    logger.info('Database connection successful', { timestamp: result.rows[0].now });
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Gracefully close the database client
 * Call this when shutting down the application
 */
export async function closeClient(): Promise<void> {
  try {
    if (client) {
      await client.end();
      client = null;
      logger.info('Database client closed');
    }
  } catch (error) {
    logger.error('Error closing database client:', error);
    throw error;
  }
}

/**
 * Export the client getter as default for use with sqlc queries
 * Usage with sqlc-generated queries:
 *
 * import { getClient } from './database/client.js';
 * import { createWorkflowRun } from './database/generated-queries/index.js';
 *
 * const db = await getClient();
 * const result = await createWorkflowRun(db, {
 *   workflow_id: 123456,
 *   workflow_url: 'https://github.com/...',
 *   org: 'myorg',
 *   repo: 'myrepo'
 * });
 */
export default getClient;
