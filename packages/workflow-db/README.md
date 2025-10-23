# @olimar/workflow-db

PostgreSQL database module for tracking GitHub Actions workflow runs.

## Features

- Track workflow runs with status and conclusion
- Store commit information and timestamps
- Type-safe TypeScript interfaces
- Connection pooling for performance
- Custom logger support
- Raw SQL query execution

## Installation

This is a local package within the monorepo. It's automatically available via pnpm workspaces.

## Database Setup

1. Create a PostgreSQL database
2. Run the schema to create the `workflow_runs` table:

```bash
psql -U your_user -d your_database -f packages/workflow-db/scripts/schema.sql
```

## Usage

### Basic Example

```typescript
import { WorkflowDatabase } from '@olimar/workflow-db';
import logger from './logger.js'; // Your winston logger

// Create database instance
const db = new WorkflowDatabase({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'myuser',
  password: 'mypassword',
}, logger);

// Test connection
const isConnected = await db.testConnection();

// Insert a workflow run
const recordId = await db.insertWorkflowRun({
  github_org: 'myorg',
  github_repo: 'myrepo',
  workflow_name: 'CI Build',
  workflow_id: 12345,
  commit_sha: 'abc123...',
  commit_ref: 'refs/heads/main',
  status: 'queued',
  triggered_at: new Date(),
});

// Update workflow run
await db.updateWorkflowRunByRunId(67890, {
  status: 'completed',
  conclusion: 'success',
  completed_at: new Date(),
});

// Get workflow run
const run = await db.getWorkflowRunByRunId(67890);

// Get recent runs for a repo
const runs = await db.getWorkflowRunsByRepo('myorg', 'myrepo', 50);

// Execute custom query
const result = await db.executeQuery(
  'SELECT * FROM workflow_runs WHERE status = $1',
  ['in_progress']
);

// Close pool on shutdown
await db.close();
```

### Using Environment Variables

The database will automatically read from environment variables if config is not provided:

```typescript
import { WorkflowDatabase } from '@olimar/workflow-db';

// Uses DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD from env
const db = new WorkflowDatabase({}, logger);
```

### Factory Function

```typescript
import { createWorkflowDatabase } from '@olimar/workflow-db';

const db = createWorkflowDatabase({ database: 'mydb' }, logger);
```

## API

### `WorkflowDatabase`

#### Constructor

```typescript
new WorkflowDatabase(config?: DatabaseConfig, logger?: Logger)
```

**Config Options:**
- `host` - Database host (default: 'localhost')
- `port` - Database port (default: 5432)
- `database` - Database name
- `user` - Database user
- `password` - Database password
- `max` - Max pool size (default: 20)
- `idleTimeoutMillis` - Idle timeout (default: 30000)
- `connectionTimeoutMillis` - Connection timeout (default: 2000)

#### Methods

**`testConnection(): Promise<boolean>`**
Test if database connection is working.

**`insertWorkflowRun(run): Promise<number>`**
Insert a new workflow run record. Returns the database ID.

**`updateWorkflowRunByRunId(runId, updates): Promise<boolean>`**
Update a workflow run by GitHub run ID.

**`updateWorkflowRunById(id, updates): Promise<boolean>`**
Update a workflow run by database ID.

**`getWorkflowRunByRunId(runId): Promise<WorkflowRun | null>`**
Get a workflow run by GitHub run ID.

**`getWorkflowRunsByRepo(org, repo, limit?): Promise<WorkflowRun[]>`**
Get recent workflow runs for a repository.

**`executeQuery<T>(query, values?): Promise<QueryResult<T>>`**
Execute a raw SQL query.

**`close(): Promise<void>`**
Close the database connection pool.

## Types

```typescript
type WorkflowRunStatus = 'queued' | 'in_progress' | 'completed';

type WorkflowRunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | null;

interface WorkflowRun {
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
```

## Logger Interface

You can provide your own logger that implements:

```typescript
interface Logger {
  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
}
```

If no logger is provided, it defaults to `console` methods.

## License

MIT
