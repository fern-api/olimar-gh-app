# Database Setup

This directory contains the database configuration, migrations, and queries for the olimar-gh-app project.

## Structure

```
src/database/
├── migrations/          # Goose migration files
├── queries/            # SQL queries for sqlc code generation
├── gen-queries/        # Generated TypeScript code from sqlc
└── sqlc.yml           # sqlc configuration
```

## Prerequisites

- [Goose](https://github.com/pressly/goose) - Database migration tool
- PostgreSQL 16+

Install Goose:
```bash
# macOS
brew install goose

# Or download from https://github.com/pressly/goose/releases
```

## Environment Variables

Configure your `.env` file with database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=olimar
```

## Migration Commands

### Run migrations (apply all pending)
```bash
pnpm run db:migrate
```

### Rollback last migration
```bash
pnpm run db:migrate:down
```

### Check migration status
```bash
pnpm run db:migrate:status
```

### Reset all migrations (rollback all)
```bash
pnpm run db:migrate:reset
```

### Create a new migration
```bash
pnpm run db:migrate:create migration_name sql
```

## Docker Setup

### Start PostgreSQL with Docker Compose
```bash
pnpm run docker:up
```

This will start:
- PostgreSQL 16 on port 5432
- The app container (depends on PostgreSQL being healthy)

### Access PostgreSQL CLI
```bash
pnpm run db:psql
```

### Reset database and run migrations
```bash
pnpm run db:reset
```

This will:
1. Stop and remove all containers
2. Delete all volumes (clears database data)
3. Start PostgreSQL container
4. Wait for it to be ready
5. Run all migrations

## Creating Migrations

Migrations are created in `src/database/migrations/` and follow Goose's naming convention:

```
00001_create_workflow_runs.sql
00002_add_user_table.sql
```

Each migration file must have `-- +goose Up` and `-- +goose Down` sections:

```sql
-- +goose Up
CREATE TABLE example (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS example;
```

## Using sqlc

sqlc generates type-safe TypeScript code from SQL queries.

### Write queries
Add `.sql` files to `src/database/queries/` directory.

### Generate TypeScript code
```bash
sqlc generate -f src/database/sqlc.yml
```

Generated code will be in `src/database/gen-queries/`.

## Workflow

1. **Create a migration**: `pnpm run db:migrate:create add_new_table sql`
2. **Edit the migration**: Add your SQL in the generated file
3. **Run the migration**: `pnpm run db:migrate`
4. **Write queries**: Add SQL queries in `queries/` directory
5. **Generate code**: Run `sqlc generate`
6. **Use in app**: Import generated code from `gen-queries/`
