# Database Setup

This directory contains the database configuration, migrations, and queries for the olimar-gh-app project.

## Structure

```
src/database/
├── migrations/          # Goose migration files
├── queries/            # SQL queries for sqlc code generation
├── generated-queries/  # Generated TypeScript code from sqlc
└── sqlc.yml           # sqlc configuration
```

## Prerequisites

- Docker (required for running migrations and generating code)
- PostgreSQL 16+ (provided via Docker Compose)

**Optional - Install Goose locally for development:**
```bash
# macOS
brew install goose

# Or install a specific version (recommended for consistency)
curl -fsSL https://raw.githubusercontent.com/pressly/goose/master/install.sh | GOOSE_VERSION=v3.22.1 sh

# Or download from https://github.com/pressly/goose/releases
```

Note: Goose v3.22.1 and sqlc v1.27.0 are already installed in the Docker containers, so local installation is optional.

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

### Running Migrations Locally

### Run migrations (apply all pending)
```bash
pnpm run db:migrate:up
# Or use the shorthand:
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

### Create a new migration file
```bash
pnpm run db:migrate:create migration_name sql
```

### Running Migrations from Docker Container

If you prefer to run migrations from inside the Docker container:

**Option 1: Using docker-compose exec (Recommended)**
```bash
# Run migrations
docker-compose exec app pnpm run db:migrate:up

# Check status
docker-compose exec app pnpm run db:migrate:status

# Rollback
docker-compose exec app pnpm run db:migrate:down
```

**Option 2: Using docker exec**
```bash
# Run migrations
docker exec olimar-gh-app-dev pnpm run db:migrate:up

# Check status
docker exec olimar-gh-app-dev pnpm run db:migrate:status
```

**Option 3: Shell into the container**
```bash
# Enter the container
docker exec -it olimar-gh-app-dev sh

# Run commands inside
pnpm run db:migrate:up
pnpm run db:migrate:status
exit
```

**Note:** When running in Docker, environment variables are automatically configured via docker-compose.yml (DB_HOST=postgres, etc.)

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

sqlc generates type-safe TypeScript code from SQL queries. This project uses Docker to run sqlc (v1.27.0), ensuring all developers use the same version.

### Write queries
Add `.sql` files to `src/database/queries/` directory.

### Generate TypeScript code
```bash
pnpm run db:generate
```

This runs sqlc v1.27.0 in a Docker container - no local installation needed! Generated code will be in `src/database/generated-queries/`.

**Important:** Always commit the generated TypeScript code to source control!

**Note:** sqlc analyzes your schema from migration files - no database connection required!

## Workflow

1. **Create a migration file**: `pnpm run db:migrate:create add_new_table sql`
2. **Edit the migration**: Add your SQL in the generated file (include `-- +goose StatementBegin/End` for functions)
3. **Run the migration**: `pnpm run db:migrate:up`
4. **Write queries**: Add SQL queries in `queries/` directory
5. **Generate code**: `pnpm run db:generate`
6. **Commit generated code**: Git commit both queries and `generated-queries/`
7. **Use in app**: Import generated code from `generated-queries/`
