import { WorkflowDatabase } from '@olimar/workflow-db';
import logger from '../logger.js';

// Create and export a singleton database instance
const db = new WorkflowDatabase({}, logger);

// Test database connection and track availability
let dbAvailable = false;

export async function initializeDatabase(): Promise<boolean> {
  try {
    dbAvailable = await db.testConnection();
    if (dbAvailable) {
      logger.info('Database integration enabled');
    } else {
      logger.warn('Database not configured - workflow tracking disabled');
    }
    return dbAvailable;
  } catch (error) {
    dbAvailable = false;
    logger.warn('Database connection failed - workflow tracking disabled');
    return false;
  }
}

export function isDatabaseAvailable(): boolean {
  return dbAvailable;
}

export default db;
