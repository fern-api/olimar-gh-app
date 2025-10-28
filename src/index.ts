import { initializeServer } from "./server.js";
import logger from "./logger.js";

// Start the server
initializeServer().catch((error) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
});
