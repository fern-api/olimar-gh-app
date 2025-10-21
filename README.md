# GitHub App Webhook Server

A minimal Node.js server written in TypeScript that uses Octokit.js to create a GitHub App that responds to webhook events on merge to different branches and triggers dispatch workflows.

## Features

- Listens for pull request merge events
- Listens for push events
- Triggers different GitHub Actions workflows based on target branch
- Built with Express.js and TypeScript
- Uses Octokit.js for GitHub API interactions

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v9 or higher)
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
   - `PRIVATE_KEY_PATH`: Path to your GitHub App's private key file (e.g., `./private-key.pem`)
   - `PORT`: Server port (default: 3000)

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

## Workflow Configuration

The server maps branches to specific workflow files. Edit the `getWorkflowForBranch` function in `src/webhooks.ts` to customize:

```typescript
const workflowMap: Record<string, string> = {
  'main': 'deploy-production.yml',
  'staging': 'deploy-staging.yml',
  'develop': 'run-tests.yml',
};
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
5. It triggers a workflow dispatch with relevant context (PR number, commit SHA, etc.)
