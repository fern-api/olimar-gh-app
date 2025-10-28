import logger from "./logger.js";
import { initializeServer } from "./server.js";

// Start the server
initializeServer().catch((error) => {
  logger.error("Failed to start server:", error);
  process.exit(1);
});
