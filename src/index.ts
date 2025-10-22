import dotenv from "dotenv";
import { App } from "octokit";
import { createNodeMiddleware } from "@octokit/webhooks";
import fs from "fs";
import http from "http";
import { registerWebhookHandlers } from "./webhooks.js";
import logger from "./logger.js";

// This reads your `.env` file and adds the variables from that file to the `process.env` object in Node.js.
dotenv.config();

// This assigns the values of your environment variables to local variables.
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyEnv = process.env.PRIVATE_KEY;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

// Validate required environment variables
if (!appId) {
  throw new Error('APP_ID is required in environment variables');
}
if (!webhookSecret) {
  throw new Error('WEBHOOK_SECRET is required in environment variables');
}

// Get private key from PRIVATE_KEY env var, or fallback to reading from PRIVATE_KEY_PATH
let privateKey: string;
if (privateKeyEnv) {
  // Use PRIVATE_KEY environment variable directly
  privateKey = privateKeyEnv;
} else if (privateKeyPath) {
  // Fallback to reading from file
  privateKey = fs.readFileSync(privateKeyPath, "utf8");
} else {
  throw new Error('Either PRIVATE_KEY or PRIVATE_KEY_PATH must be set in environment variables');
}

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

// Register all webhook event handlers
registerWebhookHandlers(app);

// This logs any errors that occur.
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    logger.error(`Error processing request: ${error.event}`);
  } else {
    logger.error(error);
  }
});

// This determines where your server will listen.
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

// This sets up a middleware function to handle incoming webhook events.
//
// Octokit's `createNodeMiddleware` function takes care of generating this middleware function for you. The resulting middleware function will:
//
//    - Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
//    - Parse the webhook event payload and identify the type of event.
//    - Trigger the corresponding webhook event handler.
const middleware = createNodeMiddleware(app.webhooks, { path });

// This creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the `middleware` function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
  logger.info(`Server is listening for events at: ${localWebhookUrl}`);
  logger.info('Press Ctrl + C to quit.');
});
