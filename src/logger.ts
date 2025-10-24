import winston from 'winston';

// Get log level from environment variable, default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

// Create a custom format that includes timestamps
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: false, level: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const baseMessage = `[${timestamp}] ${level}: ${message}`;
    return stack ? `${baseMessage}\n${stack}` : baseMessage;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Export the logger
export default logger;
