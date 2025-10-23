#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Runs SQL migration files in order from the migrations directory.
 * Tracks applied migrations in the schema_migrations table.
 *
 * Usage:
 *   pnpm run migrate           # Run all pending migrations
 *   pnpm run migrate:status    # Show migration status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration configuration
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Database configuration from environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

interface Migration {
  version: string;
  name: string;
  filename: string;
  sql: string;
}

/**
 * Create database pool
 */
function createPool(): pg.Pool {
  if (!dbConfig.database || !dbConfig.user || !dbConfig.password) {
    console.error('Error: Missing required database configuration');
    console.error('Required environment variables: DB_NAME, DB_USER, DB_PASSWORD');
    process.exit(1);
  }

  return new Pool(dbConfig);
}

/**
 * Ensure schema_migrations table exists
 */
async function ensureMigrationsTable(pool: pg.Pool): Promise<void> {
  const migrationTablePath = path.join(MIGRATIONS_DIR, '000_create_migrations_table.sql');

  if (!fs.existsSync(migrationTablePath)) {
    console.error('Error: Migration tracking table script not found');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationTablePath, 'utf-8');
  await pool.query(sql);
}

/**
 * Get list of applied migrations from database
 */
async function getAppliedMigrations(pool: pg.Pool): Promise<Set<string>> {
  const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  return new Set(result.rows.map((row: any) => row.version));
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles(): Migration[] {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .filter(file => file !== '000_create_migrations_table.sql') // Skip the migrations table itself
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }

    const [, version, name] = match;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');

    return {
      version,
      name: name.replace(/_/g, ' '),
      filename,
      sql,
    };
  });
}

/**
 * Apply a single migration
 */
async function applyMigration(pool: pg.Pool, migration: Migration): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Run the migration SQL
    await client.query(migration.sql);

    // Record the migration
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );

    await client.query('COMMIT');
    console.log(`✓ Applied migration ${migration.version}: ${migration.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  const pool = createPool();

  try {
    console.log('Starting database migrations...\n');

    // Ensure migrations table exists
    await ensureMigrationsTable(pool);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);

    // Get all migration files
    const allMigrations = getMigrationFiles();

    // Filter to pending migrations
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.has(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations. Database is up to date.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s):\n`);

    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(pool, migration);
    }

    console.log('\nAll migrations completed successfully!');
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  const pool = createPool();

  try {
    console.log('Migration Status\n');

    // Ensure migrations table exists
    await ensureMigrationsTable(pool);

    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);

    // Get all migration files
    const allMigrations = getMigrationFiles();

    console.log('Applied Migrations:');
    if (appliedMigrations.size === 0) {
      console.log('  (none)');
    } else {
      for (const migration of allMigrations) {
        if (appliedMigrations.has(migration.version)) {
          console.log(`  ✓ ${migration.version}: ${migration.name}`);
        }
      }
    }

    console.log('\nPending Migrations:');
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.has(migration.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('  (none)');
    } else {
      for (const migration of pendingMigrations) {
        console.log(`  ○ ${migration.version}: ${migration.name}`);
      }
    }

    console.log(`\nTotal: ${appliedMigrations.size} applied, ${pendingMigrations.length} pending`);
  } catch (error) {
    console.error('Error checking migration status:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main execution
const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else if (!command || command === 'run') {
  runMigrations();
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Usage: migrate [run|status]');
  process.exit(1);
}
