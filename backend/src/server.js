/**
 * Process entry point: connect to Firestore, then start the HTTP server.
 * Refuses to serve traffic if the database connection fails on boot
 * (fail fast rather than run in a broken state).
 */

const env = require('./config/env');
const app = require('./app');
const { connectDatabase } = require('./config/database');
const logger = require('./utils/logger');

async function start() {
  try {
    await connectDatabase();
  } catch (error) {
    logger.error('Failed to connect to Firestore. Server will not start.', {
      error: error.message,
    });
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`SafarUp backend listening on http://localhost:${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
