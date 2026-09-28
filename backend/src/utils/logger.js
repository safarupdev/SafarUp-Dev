/**
 * Minimal structured logger.
 *
 * PRD §73 (Observability) calls for tracking errors, failed operations and
 * slow requests, and notes a service like Sentry "can be integrated if
 * desired". For V1 we keep a lightweight console-based logger with a
 * consistent shape (level, message, meta, timestamp) so it can be swapped
 * for a real transport (Sentry, Winston, pino) later without touching every
 * call site.
 */

const env = require('../config/env');

function format(level, message, meta) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

const logger = {
  info(message, meta) {
    // eslint-disable-next-line no-console
    console.log(format('info', message, meta));
  },
  warn(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(format('warn', message, meta));
  },
  error(message, meta) {
    // eslint-disable-next-line no-console
    console.error(format('error', message, meta));
  },
  debug(message, meta) {
    if (!env.isProduction) {
      // eslint-disable-next-line no-console
      console.debug(format('debug', message, meta));
    }
  },
};

module.exports = logger;
