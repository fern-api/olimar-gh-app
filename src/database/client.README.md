# Database Client

Simple PostgreSQL client for use with sqlc-generated queries. No client-side connection pooling - designed for use with server-side pooling (e.g., PgBouncer, managed database services).

## Setup

The database client is automatically initialized when the server starts. It will:
1. Connect to PostgreSQL using environment variables
2. Test the connection
3. Make the client available for queries
4. Gracefully close the connection on shutdown

## Usage with sqlc-generated queries

### 1. Generate TypeScript code from SQL queries

```bash
pnpm run db:generate
```

This creates type-safe query functions in `src/database/generated-queries/`

### 2. Import and use in your code

```typescript
import { getClient } from './database/client.js';
import {
  createWorkflowRun,
  getWorkflowRun,
  listWorkflowRunsByRepo
} from './database/generated-queries/index.js';

// Get the database client
const db = await getClient();

// Create a workflow run
const newRun = await createWorkflowRun(db, {
  workflow_id: 123456789n,
  workflow_url: 'https://github.com/org/repo/actions/runs/123456789',
  org: 'myorg',
  repo: 'myrepo',
  status: 'queued'
});

// Get a workflow run by ID
const run = await getWorkflowRun(db, { id: 1 });

// List workflow runs for a repo
const runs = await listWorkflowRunsByRepo(db, {
  org: 'myorg',
  repo: 'myrepo',
  limit: 10,
  offset: 0
});
```

## Configuration

The client uses these environment variables:

- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_NAME` - Database name (default: `autopilot`)

## Connection Management

### Automatic Management
The database connection is managed automatically:
- **Startup**: Connection is established and tested during server initialization
- **Runtime**: Single persistent connection is reused for all queries
- **Shutdown**: Connection is gracefully closed on SIGTERM/SIGINT

### Manual Management (Advanced)

If you need manual control:

```typescript
import { getClient, testConnection, closeClient } from './database/client.js';

// Test connection
await testConnection();

// Get client for queries
const db = await getClient();

// Close connection (usually not needed - handled automatically)
await closeClient();
```

## Why No Client-Side Pooling?

This setup assumes server-side connection pooling is in place:
- **PgBouncer** - Connection pooler running alongside PostgreSQL
- **Managed databases** - Services like AWS RDS, Google Cloud SQL with built-in pooling
- **Cloud environments** - Connection pooling at the infrastructure level

Client-side pooling would be redundant and could cause issues with connection limits.

## Error Handling

All database errors are logged using the winston logger:

```typescript
try {
  const db = await getClient();
  const result = await someQuery(db, params);
} catch (error) {
  // Error is automatically logged by the client
  // Handle business logic error here
  logger.error('Business logic error:', error);
}
```

## See Also

- `src/database/example-usage.ts` - Example usage patterns
- `src/database/queries/` - SQL query files
- `src/database/generated-queries/` - Generated TypeScript code
