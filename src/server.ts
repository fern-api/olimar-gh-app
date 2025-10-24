import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";
import logger from "./logger.js";
import { registerWebhookHandlers } from "./webhooks/index.js";
import { testConnection, closeClient } from "./database/client.js";

// Load environment variables
dotenv.config();

/**
 * Load and validate private key from environment
 */
function loadPrivateKey(): string {
  const privateKeyEnv = process.env.PRIVATE_KEY;
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;

  if (privateKeyEnv) {
    return privateKeyEnv;
  } else if (privateKeyPath) {
    return fs.readFileSync(privateKeyPath, "utf8");
  } else {
    throw new Error('Either PRIVATE_KEY or PRIVATE_KEY_PATH must be set in environment variables');
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): { appId: string; webhookSecret: string; privateKey: string } {
  const appId = process.env.APP_ID;
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!appId) {
    throw new Error('APP_ID is required in environment variables');
  }
  if (!webhookSecret) {
    throw new Error('WEBHOOK_SECRET is required in environment variables');
  }

  const privateKey = loadPrivateKey();

  return { appId, webhookSecret, privateKey };
}

/**
 * Create and configure the Octokit App instance
 */
function createApp(appId: string, privateKey: string, webhookSecret: string): App {
  const app = new App({
    appId: appId,
    privateKey: privateKey,
    webhooks: {
      secret: webhookSecret
    },
  });

  // Register webhook handlers
  registerWebhookHandlers(app);

  // Handle webhook errors
  app.webhooks.onError((error) => {
    if (error.name === "AggregateError") {
      logger.error(`Error processing request: ${error.event}`);
    } else {
      logger.error(error);
    }
  });

  return app;
}

/**
 * Start the HTTP server
 */
function startServer(app: App): http.Server {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || 'localhost';
  const path = "/api/webhook";
  const localWebhookUrl = `http://${host}:${port}${path}`;

  const middleware = createNodeMiddleware(app.webhooks, { path });

  const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // Pass all other requests to webhook middleware
    middleware(req, res);
  }).listen(port, () => {
    logger.info(`Server is listening for events at: ${localWebhookUrl}`);
    logger.info(`Health check available at: http://${host}:${port}/health`);
    logger.info('Press Ctrl + C to quit.');
  });

  return server;
}

/**
 * Initialize and start the application
 */
export async function initializeServer(): Promise<http.Server> {
  logger.info('Starting GitHub App webhook server...');

  // Validate environment
  const { appId, webhookSecret, privateKey } = validateEnvironment();

  // Test database connection
  await testConnection();

  // Create app
  const app = createApp(appId, privateKey, webhookSecret);

  // Start server
  const server = startServer(app);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close database connection
    await closeClient();

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}
