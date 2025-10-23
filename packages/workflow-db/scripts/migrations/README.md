# Database Migrations

This directory contains SQL migration files for the workflow runs database schema.

## Overview

Migrations are applied sequentially to manage database schema changes over time. Each migration is a numbered SQL file that can be safely run multiple times (idempotent).

## Migration Files

Migrations are numbered sequentially:
- `000_create_migrations_table.sql` - Creates the tracking table (applied automatically)
- `001_add_version_input.sql` - Adds version_input column
- `00X_description.sql` - Future migrations...

## Running Migrations

From the root of the project:

```bash
# Run all pending migrations
pnpm run db:migrate

# Check migration status
pnpm run db:migrate:status
```

From the workflow-db package:

```bash
cd packages/workflow-db

# Run migrations
pnpm run migrate

# Check status
pnpm run migrate:status
```

## How It Works

1. **Migration Tracking**: The `schema_migrations` table tracks which migrations have been applied
2. **Sequential Application**: Migrations are applied in order based on their version number
3. **Transactional**: Each migration runs in a transaction (rolls back on error)
4. **Idempotent**: Migrations use `IF NOT EXISTS` to safely run multiple times

## Creating New Migrations

When you need to modify the database schema:

1. **Create a new migration file** in this directory:
   ```bash
   touch packages/workflow-db/scripts/migrations/00X_your_description.sql
   ```

2. **Use the next sequential number** (e.g., if last is 001, use 002)

3. **Write idempotent SQL**:
   ```sql
   -- Migration: Brief title
   -- Date: YYYY-MM-DD
   -- Description: Detailed description of the changes

   -- Use IF NOT EXISTS for safety
   ALTER TABLE workflow_runs
   ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

   -- Add comments
   COMMENT ON COLUMN workflow_runs.new_column IS 'Description of the column';
   ```

4. **Update the main schema** in `packages/workflow-db/scripts/schema.sql` to reflect the changes

5. **Test the migration**:
   ```bash
   pnpm run db:migrate
   ```

6. **Commit both files** (migration + schema.sql)

## Migration Best Practices

- **Always use IF NOT EXISTS** for ALTER TABLE ADD COLUMN
- **Write descriptive comments** at the top of each migration
- **Test migrations** on a development database first
- **Keep migrations small** - one logical change per migration
- **Never modify existing migrations** - create a new one instead
- **Include rollback instructions** in comments if the migration isn't easily reversible

## Example Migration

```sql
-- Migration: Add workflow timeout tracking
-- Date: 2025-10-23
-- Description: Adds a column to track workflow execution timeout in seconds

ALTER TABLE workflow_runs
ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 300;

COMMENT ON COLUMN workflow_runs.timeout_seconds IS 'Maximum execution time in seconds before timeout';

-- To rollback (manual):
-- ALTER TABLE workflow_runs DROP COLUMN IF EXISTS timeout_seconds;
```

## Troubleshooting

### Migration Failed

If a migration fails, it will automatically rollback. Check the error message and:
1. Fix the SQL in the migration file
2. Ensure your database credentials are correct in `.env`
3. Try running the migration again

### Database Out of Sync

If your database schema doesn't match the code:
1. Check migration status: `pnpm run db:migrate:status`
2. Run pending migrations: `pnpm run db:migrate`
3. If needed, restore from backup and re-run all migrations

### Fresh Database Setup

For a completely new database, migrations will automatically:
1. Create the `schema_migrations` tracking table
2. Run all migrations in order
3. Track each migration as it's applied
