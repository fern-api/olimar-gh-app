# Claude Code Guidelines for olimar-gh-app

This document provides guidelines for maintaining and developing this GitHub App webhook server project.

## Project Overview

This is a GitHub App webhook server built with Express and Octokit that listens for GitHub events and interacts with the GitHub API.

**Tech Stack:**
- TypeScript (strict mode enabled)
- Node.js with ES modules (`"type": "module"` in package.json)
- Express for webhook server
- Octokit for GitHub API interactions
- Winston for structured logging
- PostgreSQL with pg library for workflow run tracking (optional)
- pnpm for package management (v9.0.0)

## Development Workflow

This is a **pnpm workspace monorepo** with two packages:
1. **Main app** (root) - The webhook server
2. **@olimar/workflow-db** (packages/workflow-db) - Database package

### Build and Run Commands

```bash
# Install dependencies (installs for all workspace packages)
pnpm install

# Build everything (package + main app)
pnpm run build

# Build only the main app
pnpm run build:app

# Build only the database package
pnpm --filter @olimar/workflow-db run build

# Run in development mode (uses tsx for hot reloading)
pnpm run dev

# Run production build
pnpm start

# Watch mode for development
pnpm run watch
```

### Before Making Changes

1. Always run `pnpm install` if `node_modules` is missing
2. Run `pnpm run build` to check for TypeScript errors before making changes
3. After making changes, run `pnpm run build` to verify no new errors were introduced

## Code Style and Standards

### Logging

This project uses **winston** for structured logging with timestamps. Never use `console.log` or `console.error` directly.

**Import the logger:**
```typescript
import logger from './logger.js';
```

**Available log levels (in order of severity):**
- `logger.error()` - Error messages
- `logger.warn()` - Warning messages
- `logger.info()` - Informational messages (default level)
- `logger.debug()` - Debug messages (verbose, use for detailed payload inspection)

**Examples:**
```typescript
// Info level (default)
logger.info(`Server is listening on port ${port}`);

// Debug level (only shown when LOG_LEVEL=debug)
logger.debug('Push event payload:', JSON.stringify(payload, null, 2));

// Error level
logger.error(`Error dispatching workflow: ${error}`);

// Warn level
logger.warn(`Workflow ${name} completed with conclusion: ${conclusion}`);
```

**Controlling log output:**
Set the `LOG_LEVEL` environment variable in `.env`:
- `LOG_LEVEL=error` - Only errors
- `LOG_LEVEL=warn` - Warnings and errors
- `LOG_LEVEL=info` - Info, warnings, and errors (default)
- `LOG_LEVEL=debug` - All logs including debug messages

All logs automatically include timestamps in the format: `[YYYY-MM-DD HH:mm:ss.SSS]`

### TypeScript Error Handling

This project uses strict TypeScript settings. When catching errors, always properly type them:

**Correct:**
```typescript
try {
  // code
} catch (error) {
  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as { response?: { status: number; data: { message: string } } };
    if (err.response) {
      logger.error(`Error! Status: ${err.response.status}. Message: ${err.response.data.message}`);
    }
  }
  logger.error(error);
}
```

**Incorrect (will fail TypeScript compilation):**
```typescript
try {
  // code
} catch (error) {
  if (error.response) {  // ❌ TS18046: 'error' is of type 'unknown'
    console.error(`Error! Status: ${error.response.status}`);
  }
}
```

### Webhook Event Handlers

Webhook handlers are registered in `src/webhooks/index.ts` using the `registerWebhookHandlers()` function.

**Pattern for webhook handlers:**
```typescript
// In src/webhooks/index.ts
import { dispatchAndMonitorWorkflow } from './workflow-runner.js';

app.webhooks.on('event_name', async ({ octokit, payload }) => {
  const repo = payload.repository.name;
  const owner = payload.repository.owner?.login;

  if (!owner) {
    logger.error('No repository owner found in payload');
    return;
  }

  // Your handler logic here

  try {
    // Use octokit to interact with GitHub API
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/...', {
      owner,
      repo,
      headers: {
        'x-github-api-version': '2022-11-28',
      },
    });

    // Dispatch workflows using the workflow-runner
    await dispatchAndMonitorWorkflow({
      octokit,
      owner,
      repo,
      workflow: { id: 123, name: 'My Workflow', path: '.github/workflows/my.yml' },
      ref: 'refs/heads/main',
      commitSha: payload.after,
    });
  } catch (error) {
    // Use proper error handling pattern (see above)
  }
});
```

### Octokit API Requests

Always include the API version header:
```typescript
await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
  owner,
  repo,
  headers: {
    'x-github-api-version': '2022-11-28',
  },
});
```

### Database Operations

This project includes a separate npm package `@olimar/workflow-db` (located in `packages/workflow-db/`) for tracking workflow runs. The main app uses it via `src/db/index.ts` which creates a singleton instance. Database usage is **optional** and requires database environment variables to be configured.

**In the main app, import the database instance:**
```typescript
import db from './db/index.js';
```

**Using the package directly (advanced):**
```typescript
import { WorkflowDatabase } from '@olimar/workflow-db';
import logger from './logger.js';

const db = new WorkflowDatabase({}, logger);
```

### Workflow Runner Functions

The `src/webhooks/workflow-runner.ts` module provides functions for dispatching and monitoring GitHub Actions workflows:

**Dispatch a workflow:**
```typescript
import { dispatchWorkflow } from './webhooks/workflow-runner.js';

const dbRecordId = await dispatchWorkflow({
  octokit,
  owner: 'myorg',
  repo: 'myrepo',
  workflow: {
    id: 12345,
    name: 'CI Build',
    path: '.github/workflows/ci.yml'
  },
  ref: 'refs/heads/main',
  inputs: { version: '1.0.0' },
  commitSha: 'abc123...'
});
```

**Monitor a workflow run:**
```typescript
import { monitorWorkflowRun } from './webhooks/workflow-runner.js';

await monitorWorkflowRun({
  octokit,
  owner: 'myorg',
  repo: 'myrepo',
  workflowName: 'CI Build',
  workflowId: 12345,
  dbRecordId: 42  // optional
});
```

**Dispatch and monitor in one call:**
```typescript
import { dispatchAndMonitorWorkflow } from './webhooks/workflow-runner.js';

await dispatchAndMonitorWorkflow({
  octokit,
  owner: 'myorg',
  repo: 'myrepo',
  workflow: { id: 12345, name: 'CI Build', path: '.github/workflows/ci.yml' },
  ref: 'refs/heads/main',
  inputs: { version: '1.0.0' },
  commitSha: 'abc123...'
});
```

**Available functions:**

1. **Insert a workflow run:**
```typescript
const id = await db.insertWorkflowRun({
  github_org: 'myorg',
  github_repo: 'myrepo',
  workflow_name: 'SDK Build',
  workflow_id: 12345,
  run_id: 67890, // optional, can be null initially
  commit_sha: 'abc123...',
  commit_ref: 'refs/heads/main',
  status: 'queued', // 'queued' | 'in_progress' | 'completed'
  conclusion: null, // null until completed
  triggered_at: new Date(),
});
```

2. **Update workflow run by run_id:**
```typescript
await db.updateWorkflowRunByRunId(67890, {
  status: 'completed',
  conclusion: 'success', // 'success' | 'failure' | 'cancelled' | etc.
  completed_at: new Date(),
});
```

3. **Get workflow run:**
```typescript
const run = await db.getWorkflowRunByRunId(67890);
```

4. **Get recent runs for a repo:**
```typescript
const runs = await db.getWorkflowRunsByRepo('myorg', 'myrepo', 50);
```

5. **Execute custom SQL:**
```typescript
const result = await db.executeQuery(
  'SELECT * FROM workflow_runs WHERE status = $1',
  ['in_progress']
);
```

**Error Handling:**
All database functions will throw errors if the query fails. Always wrap in try-catch:
```typescript
try {
  await db.insertWorkflowRun({ ... });
} catch (error) {
  logger.error('Failed to insert workflow run:', error);
  // Continue processing - don't let DB errors stop webhook handling
}
```

**Database Schema:**
The schema is defined in `packages/workflow-db/scripts/schema.sql`. To set up the database:
```bash
psql -U your_user -d your_database -f packages/workflow-db/scripts/schema.sql
```

**Package Documentation:**
See `packages/workflow-db/README.md` for detailed package API documentation.

## Project Structure

```
olimar-gh-app/
├── src/
│   ├── index.ts          # Main entry point (starts the server)
│   ├── server.ts         # Server setup and initialization
│   ├── logger.ts         # Winston logger configuration
│   ├── db/
│   │   └── index.ts      # Database instance (wraps @olimar/workflow-db)
│   └── webhooks/
│       ├── index.ts      # Webhook event handlers registration
│       └── workflow-runner.ts # Workflow dispatch and monitoring functions
├── packages/
│   └── workflow-db/      # Separate npm package for database operations
│       ├── src/
│       │   └── index.ts  # WorkflowDatabase class implementation
│       ├── scripts/
│       │   └── schema.sql # Database schema for workflow_runs table
│       ├── dist/         # Compiled package output
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
├── dist/                 # Compiled main app output (generated by tsc)
│   ├── db/
│   ├── webhooks/
│   ├── index.js
│   ├── server.js
│   └── logger.js
├── package.json
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── tsconfig.json
├── .env                  # Environment variables (not committed)
└── CLAUDE.md            # This file
```

## Environment Variables

Required environment variables (stored in `.env`):

**GitHub App Configuration:**
- `APP_ID` - GitHub App ID (numeric value)
- `WEBHOOK_SECRET` - Webhook secret for verifying GitHub signatures
- `PRIVATE_KEY` (recommended) - GitHub App private key directly as a string (PEM format)
- `PRIVATE_KEY_PATH` (fallback) - Path to the private key file (e.g., `./private-key.pem`)
  - Note: Only one of `PRIVATE_KEY` or `PRIVATE_KEY_PATH` is required. `PRIVATE_KEY` takes precedence.
- `PORT` - Server port (optional, defaults to 3000)
- `LOG_LEVEL` - Logging level (optional, defaults to 'info'). Options: error, warn, info, debug

**Database Configuration (optional - for workflow run tracking):**
- `DB_HOST` - PostgreSQL host (optional, defaults to 'localhost')
- `DB_PORT` - PostgreSQL port (optional, defaults to 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_POOL_MAX` - Maximum pool size (optional, defaults to 20)
- `DB_IDLE_TIMEOUT` - Idle timeout in ms (optional, defaults to 30000)
- `DB_CONNECTION_TIMEOUT` - Connection timeout in ms (optional, defaults to 2000)

**Legacy (optional):**
- `GITHUB_OWNER` - GitHub username/org (optional)
- `GITHUB_REPO` - Repository name (optional)

## Common Tasks

### Adding a New Webhook Event Handler

1. Open `src/webhooks/index.ts`
2. Import workflow-runner functions if needed:
   ```typescript
   import { dispatchAndMonitorWorkflow } from './workflow-runner.js';
   ```
3. Add a new event handler inside `registerWebhookHandlers()`:
   ```typescript
   app.webhooks.on('event_name', async ({ octokit, payload }) => {
     // handler implementation
     // Use dispatchAndMonitorWorkflow() to run workflows
   });
   ```
4. Run `pnpm run build` to verify TypeScript compilation
5. Test the webhook handler

### Modifying Existing Handlers

1. Locate the handler in `src/webhooks/index.ts`
2. Make your changes
3. Use workflow-runner functions for dispatching workflows
4. Ensure proper error handling with TypeScript type checking
5. Run `pnpm run build` to verify
6. Test the changes

### Adding Workflow Dispatch Logic

To add new workflow dispatch/monitor logic:

1. Add functions to `src/webhooks/workflow-runner.ts` if you need custom behavior
2. Or use the existing functions:
   - `dispatchWorkflow()` - Dispatch only
   - `monitorWorkflowRun()` - Monitor only
   - `dispatchAndMonitorWorkflow()` - Both (recommended)
3. Import and use in your webhook handlers in `src/webhooks/index.ts`

### Using the Database

Database tracking is automatically handled by the `workflow-runner` functions. When you use `dispatchWorkflow()` or `dispatchAndMonitorWorkflow()`, it will:

1. Insert a workflow run record before dispatching (if DB is available)
2. Update the record with the GitHub run_id when the workflow starts
3. Update the record with the final status/conclusion when complete

**The workflow-runner handles all database operations automatically**, so you don't need to manually track workflows in most cases.

**Manual database operations (advanced):**

If you need to manually track something in the database:

```typescript
import db from './db/index.js';

try {
  const recordId = await db.insertWorkflowRun({
    github_org: owner,
    github_repo: repo,
    workflow_name: workflow.name,
    workflow_id: workflow.id,
    commit_sha: payload.after,
    commit_ref: payload.ref,
    status: 'queued',
    triggered_at: new Date(),
  });
  logger.info(`Created DB record ${recordId}`);
} catch (error) {
  logger.error('Failed to save to database:', error);
  // Continue processing - don't let DB errors stop workflow
}
```

### Debugging

- Use `logger.debug()` for debugging output (set `LOG_LEVEL=debug` in `.env`)
- For payload inspection: `logger.debug('Payload:', JSON.stringify(payload, null, 2))`
- Check the compiled output in `dist/` if needed
- Run in dev mode with `pnpm run dev` for faster iteration
- Adjust log levels to control verbosity:
  - Production: `LOG_LEVEL=info` or `LOG_LEVEL=warn`
  - Development: `LOG_LEVEL=debug` for full visibility

## Testing Webhooks Locally

1. Use a tool like `ngrok` to expose your local server
2. Configure the GitHub App webhook URL to point to your ngrok URL
3. Run `pnpm run dev` to start the development server
4. Trigger events in GitHub to test webhook handling

## Git Workflow

- Main branch: `main`
- Always ensure `pnpm run build` passes before committing
- Do not commit `node_modules/` or `dist/` directories
- Do not commit `.env` file (contains secrets)

## Troubleshooting

### TypeScript Compilation Errors

- Always fix TypeScript errors before proceeding
- Common issue: `error is of type 'unknown'` - use proper type checking pattern (see above)
- Run `pnpm run build` frequently to catch errors early

### Missing Dependencies

If you see "node_modules missing" error:
```bash
pnpm install
```

### Package Manager Issues

This project uses pnpm v9.0.0 (specified in `packageManager` field). Ensure you're using pnpm, not npm or yarn.

### Database Connection Issues

If database operations are failing:
1. Check that all required DB environment variables are set in `.env`
2. Verify database is running: `psql -U your_user -d your_database -c "SELECT NOW();"`
3. Check if schema is created: `psql -U your_user -d your_database -c "\dt"`
4. Test connection in code:
   ```typescript
   import db from './db.js';
   await db.testConnection();
   ```
5. Remember: Database is **optional**. The app will continue to work even if DB is not configured.

## Key Files to Reference

**Main App:**
- `src/index.ts` - Main entry point (starts server)
- `src/server.ts` - Server setup and initialization
- `src/logger.ts` - Winston logger configuration
- `src/webhooks/index.ts` - Webhook event handlers
- `src/webhooks/workflow-runner.ts` - Workflow dispatch/monitor functions
- `src/db/index.ts` - Database singleton instance
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `pnpm-workspace.yaml` - Workspace configuration

**Database Package:**
- `packages/workflow-db/src/index.ts` - WorkflowDatabase class
- `packages/workflow-db/scripts/schema.sql` - Database schema
- `packages/workflow-db/README.md` - Package documentation
- `packages/workflow-db/package.json` - Package dependencies

## Maintenance Checklist

When making changes:
- [ ] Run `pnpm install` if dependencies changed
- [ ] Run `pnpm run build` to check for errors
- [ ] Use proper TypeScript error handling patterns
- [ ] Use `logger` instead of `console.log/error`
- [ ] Include API version headers in Octokit requests
- [ ] Test webhook handlers if modified
- [ ] Verify build passes before committing
