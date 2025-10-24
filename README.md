# GitHub App Webhook Server

A minimal Node.js server written in TypeScript that uses Octokit.js to create a GitHub App that responds to webhook events on merge to different branches and triggers dispatch workflows.

## Features

- Listens for pull request merge events
- Listens for push events
- Triggers different GitHub Actions workflows based on target branch
- Built with Express.js and TypeScript
- Uses Octokit.js for GitHub API interactions
- Structured logging with winston (configurable log levels with timestamps)
- PostgreSQL integration for tracking workflow runs (optional)

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v9 or higher)
- PostgreSQL (v12 or higher) - optional, for workflow run tracking
- A GitHub App with the following permissions:
  - Repository permissions:
    - Actions: Read & Write
    - Contents: Read
    - Pull requests: Read
  - Subscribe to events:
    - Pull request
    - Push

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your `.env` file with your GitHub App credentials:
   - `APP_ID`: Your GitHub App ID
   - `WEBHOOK_SECRET`: The webhook secret you set in your GitHub App settings
   - `PRIVATE_KEY` (recommended): Your GitHub App's private key directly as a string (PEM format)
   - `PRIVATE_KEY_PATH` (fallback): Path to your GitHub App's private key file (e.g., `./private-key.pem`)
   - `PORT`: Server port (default: 3000)
   - `LOG_LEVEL`: Logging level (default: info). Options: error, warn, info, debug

   Database configuration (optional - only if you want to track workflow runs):
   - `DB_HOST`: PostgreSQL host (default: localhost)
   - `DB_PORT`: PostgreSQL port (default: 5432)
   - `DB_NAME`: Database name
   - `DB_USER`: Database user
   - `DB_PASSWORD`: Database password
   - `DB_POOL_MAX`: Maximum pool size (default: 20)
   - `DB_IDLE_TIMEOUT`: Idle timeout in ms (default: 30000)
   - `DB_CONNECTION_TIMEOUT`: Connection timeout in ms (default: 2000)

4. Download your GitHub App's private key from GitHub and save it as `private-key.pem` in the project root

## Development

Run in development mode with auto-reload:
```bash
pnpm dev
```

## Production

Build the TypeScript code:
```bash
pnpm build
```

Start the server:
```bash
pnpm start
```

## Endpoints

- `POST /api/webhook` - GitHub webhook endpoint
- `GET /health` - Health check endpoint

## Setting up GitHub App Webhook

1. In your GitHub App settings, set the webhook URL to: `https://your-domain.com/api/webhook`
2. Set the webhook secret (must match `WEBHOOK_SECRET` in `.env`)
3. Select the events you want to subscribe to (Pull request, Push)
4. Ensure the webhook is active

## How It Works

1. GitHub sends webhook events to `/api/webhook`
2. The server verifies the webhook signature
3. Based on the event type (PR merge or push), it determines the target branch
4. It looks up the corresponding workflow file for that branch
5. It triggers a workflow dispatch with relevant context (PR number, commit SHA, etc.)\


## Testing with the [Development] Fern Bot Github App
To set up the app I:
1. created a new webhook secret (should be rotated and saved in 1Pass before production use)
2. Disabled SSL for now (so I can use my local server without need to setup encryption)
3. Created a new private key (will delete before production use and create a real one to be stored in a more secure location)
